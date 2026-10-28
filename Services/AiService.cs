using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Xml.Linq;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using web.DTOs;

namespace web.Services
{
    public class AiService : IAiService
    {
        private readonly HttpClient _httpClient;
        private readonly string? _apiKey;
        private readonly ILogger<AiService> _logger;
        
        // Static Cache for 24/24 medical news
        private static List<NewsArticleDto> _cachedNews = new();
        private static DateTime _lastCachedTime = DateTime.MinValue;
        private static readonly object _cacheLock = new();
        private static bool _isFetchingInBackground = false;

        private const string SystemPrompt = 
            "Bạn là Trợ lý Tiếp đón Ảo thông minh (CareConnect Virtual Assistant) của Phòng khám Đa khoa CareConnect. Nhiệm vụ chính của bạn là hỗ trợ bệnh nhân sàng lọc triệu chứng sơ bộ, tư vấn quy trình hoạt động của phòng khám, hướng dẫn họ đăng ký đúng chuyên khoa, đồng thời tích cực tư vấn các chế độ dinh dưỡng, ăn uống lành mạnh, cách tự chăm sóc sức khỏe và các biện pháp phòng ngừa/chăm sóc giảm nhẹ tại nhà an toàn phù hợp với triệu chứng của họ.\n" +
            "HƯỚNG DẪN HÀNH VI BẮT BUỘC:\n" +
            "1. KHÔNG CHẨN ĐOÁN BỆNH: Tuyệt đối không khẳng định hoặc kết luận bệnh nhân mắc bệnh cụ thể nào (ví dụ: Không nói 'Bạn đã bị đau dạ dày'). Hãy hướng dẫn họ khám chuyên khoa tương ứng (ví dụ: 'Các dấu hiệu này thuộc đường tiêu hóa, bạn nên khám chuyên khoa Nội tiêu hóa').\n" +
            "2. KHÔNG KÊ ĐƠN THUỐC: Tuyệt đối không gợi ý bất kỳ loại thuốc điều trị hoặc phác đồ trị liệu cụ thể nào.\n" +
            "3. TƯ VẤN SỨC KHỎE, DINH DƯỠNG & CHĂM SÓC TẠI NHÀ: Bên cạnh việc giới thiệu chuyên khoa, hãy luôn cung cấp thêm lời khuyên về chế độ ăn uống dinh dưỡng (nên ăn gì, nên tránh gì) và các biện pháp tự phòng ngừa, chăm sóc nâng cao sức đề kháng hoặc giảm nhẹ triệu chứng tại nhà an toàn (như uống nước ấm, nghỉ ngơi hợp lý, súc họng nước muối, chườm ấm, v.v.).\n" +
            "4. PHẢN ỨNG KHẨN CẤP (RED FLAGS): Nếu bệnh nhân mô tả các triệu chứng đe dọa tính mạng như: đau ngực dữ dội kéo dài, đột quỵ (yếu nửa người, méo miệng đột ngột), khó thở cấp tính, ngộ độc nặng hoặc hôn mê. Hãy DỪNG tư vấn ngay lập tức và đưa ra cảnh báo: '⚠️ CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn rất nghiêm trọng. Vui lòng gọi cấp cứu 115 hoặc di chuyển ngay đến cơ sở y tế gần nhất, hoặc liên hệ Hotline CareConnect: 1900-XXXX.'\n" +
            "5. TUYÊN BỐ MIỄN TRỪ TRÁCH NHIỆM: Cuối mỗi câu trả lời liên quan đến triệu chứng sức khỏe hoặc chuyên khoa, bắt buộc phải đính kèm câu: '*Lưu ý: Thông tin tư vấn từ trợ lý ảo chỉ mang tính tham khảo định hướng và không thay thế cho chẩn đoán trực tiếp của bác sĩ chuyên khoa.*'\n" +
            "THÔNG TIN THAM CHIẾU PHÒNG KHÁM:\n" +
            "- Chuyên khoa hoạt động: Tim mạch (BS. John Doe phụ trách), Nội tổng quát.\n" +
            "- Giờ làm việc: Thứ 2 đến Thứ 6 (08:00 - 17:00), Thứ 7 (08:00 - 12:00). Chủ nhật nghỉ.\n" +
            "- FAQs:\n" +
            "  * Tôi cần chuẩn bị gì trước khi xét nghiệm máu? -> Bạn cần nhịn ăn ít nhất từ 8 đến 12 tiếng trước khi lấy máu (chỉ được uống nước lọc). Không uống rượu bia, cà phê hoặc hút thuốc lá trước khi khám.\n" +
            "  * Khám sức khỏe tổng quát mất bao lâu? -> Một gói khám sức khỏe tổng quát tại phòng khám thường kéo dài từ 2 đến 3 tiếng tùy thuộc vào các danh mục xét nghiệm và chẩn đoán hình ảnh đi kèm.\n" +
            "  * Phòng khám có chỗ đỗ xe ô tô không? -> Có, phòng khám CareConnect có bãi đỗ xe ô tô và xe máy miễn phí cho khách hàng đến thăm khám.";

        private readonly IRagService _ragService;

        public AiService(HttpClient httpClient, IConfiguration configuration, ILogger<AiService> logger, IRagService ragService)
        {
            _httpClient = httpClient;
            _logger = logger;
            _ragService = ragService;
            
            // Lấy API Key từ cấu hình, dự phòng qua biến môi trường để bảo mật thông tin nhạy cảm
            _apiKey = configuration["Gemini:ApiKey"];
            if (string.IsNullOrEmpty(_apiKey))
            {
                _apiKey = Environment.GetEnvironmentVariable("GEMINI_API_KEY");
            }
        }

        public async Task<AiChatResponse> GenerateResponseAsync(string userMessage, List<string> history)
        {
            // 1. [RAG SEMANTIC RETRIEVAL] Tìm kiếm tài liệu tri thức nội bộ phù hợp từ Vector DB
            var matchedResults = await _ragService.SearchAsync(userMessage, topK: 3, minScore: 0.22);
            var sources = matchedResults.Select(m => new KnowledgeSourceDto
            {
                Id = m.Chunk.Id,
                Title = m.Chunk.Title,
                Category = m.Chunk.Category,
                SourceDocument = m.Chunk.SourceDocument,
                Confidence = m.Score,
                Snippet = m.Snippet
            }).ToList();

            bool hasGroundedContext = sources.Count > 0;

            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogInformation("Gemini API Key is empty. Falling back to local RAG Grounded NLP analysis.");
                return GenerateFallbackResponse(userMessage, matchedResults, sources);
            }

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
                
                // Xây dựng danh sách nội dung (contents) theo chuẩn đa lượt của Gemini
                var contentsList = new List<object>();

                // Khớp lịch sử hội thoại ("User: ..." và "AI: ...") sang vai trò tương ứng của Gemini
                if (history != null && history.Count > 0)
                {
                    foreach (var chat in history)
                    {
                        if (string.IsNullOrWhiteSpace(chat)) continue;

                        if (chat.StartsWith("User: ", StringComparison.OrdinalIgnoreCase))
                        {
                            var text = chat.Substring("User: ".Length).Trim();
                            contentsList.Add(new { role = "user", parts = new[] { new { text } } });
                        }
                        else if (chat.StartsWith("AI: ", StringComparison.OrdinalIgnoreCase))
                        {
                            var text = chat.Substring("AI: ".Length).Trim();
                            contentsList.Add(new { role = "model", parts = new[] { new { text } } });
                        }
                        else
                        {
                            contentsList.Add(new { role = "user", parts = new[] { new { text = chat } } });
                        }
                    }
                }

                // Thêm tin nhắn hiện tại của người dùng
                contentsList.Add(new { role = "user", parts = new[] { new { text = userMessage } } });

                // 2. [RAG CONTEXT GROUNDING] Ghép ngữ cảnh tài liệu nội bộ đã trích xuất vào System Prompt
                var dynamicSystemPrompt = SystemPrompt;
                if (hasGroundedContext)
                {
                    var ragContextText = string.Join("\n\n---\n", matchedResults.Select(m => 
                        $"[TÀI LIỆU {m.Chunk.Id}: {m.Chunk.Title} - {m.Chunk.Category} (Khớp: {m.Score:P0}) | Nguồn: {m.Chunk.SourceDocument}]\n{m.Chunk.Content}"));

                    dynamicSystemPrompt += "\n\n" +
                        "==========================================================\n" +
                        "NGỮ CẢNH TRI THỨC Y TẾ NỘI BỘ CARECONNECT (TRÍCH XUẤT TỰ ĐỘNG BẰNG RAG VECTOR SEARCH):\n" +
                        ragContextText + "\n" +
                        "==========================================================\n" +
                        "CHỈ THỊ KIỂM SOÁT NGHIỆP VỤ BẮT BUỘC (ANTI-HALLUCINATION & CONTEXT GROUNDING):\n" +
                        "1. Khi câu hỏi liên quan đến các tài liệu nội bộ trên (chi phí, gói khám, quy trình nhịn ăn, chi nhánh, bảo hiểm...), BẮT BUỘC chỉ được trả lời dựa trên thông tin đã kiểm duyệt ở trên.\n" +
                        "2. TUYỆT ĐỐI KHÔNG TỰ BỊA ĐẶT chi phí, phác đồ điều trị, danh mục xét nghiệm hoặc địa chỉ chi nhánh ngoài tài liệu cung cấp.\n" +
                        "3. Cuối câu trả lời, hãy chú thích rõ tài liệu nguồn (Ví dụ: '📌 Nguồn tham chiếu: [Tên tài liệu / Tiêu đề]').";
                }

                var payload = new
                {
                    contents = contentsList,
                    systemInstruction = new
                    {
                        parts = new[] { new { text = dynamicSystemPrompt } }
                    },
                    generationConfig = new
                    {
                        maxOutputTokens = 1000,
                        temperature = 0.5
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                _httpClient.Timeout = TimeSpan.FromSeconds(15);
                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var text = doc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();

                    if (!string.IsNullOrEmpty(text))
                    {
                        var cleanText = text.Trim();
                        return new AiChatResponse
                        {
                            Response = cleanText,
                            SuggestedSpecialization = ExtractSpecialization(cleanText),
                            QuickReplies = GetContextQuickReplies(userMessage),
                            IsRAGGrounded = hasGroundedContext,
                            GroundingSources = sources
                        };
                    }
                }

                _logger.LogWarning("Gemini API call failed with status code: {StatusCode}. Falling back.", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while calling Gemini API. Falling back to local RAG Grounded NLP.");
            }

            return GenerateFallbackResponse(userMessage, matchedResults, sources);
        }

        public async Task<AiChatResponse> AnalyzeSymptomsAsync(string symptoms)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                _logger.LogInformation("Gemini API Key is empty. Analyzing symptoms locally.");
                return GenerateFallbackResponse(symptoms);
            }

            var prompt = $"Phân tích triệu chứng sau của bệnh nhân và đề xuất chuyên khoa khám phù hợp nhất (chọn một trong: Nội khoa tổng quát, Tim mạch, Nhi khoa, Tai Mũi Họng, Răng Hàm Mặt, Da liễu, Thần kinh, Tiêu hóa). " +
                         $"Hãy trả về kết quả ngắn gọn dưới 3 dòng y khoa và nêu rõ tên chuyên khoa. Triệu chứng: \"{symptoms}\"";

            return await GenerateResponseAsync(prompt, new List<string>());
        }

        private bool IsGreeting(string message)
        {
            var words = message.Split(new[] { ' ', '.', ',', '?', '!', '\n', '\r' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var word in words)
            {
                if (word == "hi" || word == "hello")
                {
                    return true;
                }
            }

            return message.Contains("xin chào") || 
                   message.Contains("chào bạn") || 
                   message.Contains("chào trợ lý") || 
                   message.Contains("chào bot") ||
                   message.StartsWith("chào");
        }

        #region Local Fallback NLP Engine
        private AiChatResponse GenerateFallbackResponse(string msg, List<KnowledgeSearchResult>? matchedResults = null, List<KnowledgeSourceDto>? sources = null)
        {
            if (msg.Contains("CHAN_DOAN:") && msg.Contains("CHUYEN_KHOA:"))
            {
                // This is a symptom screener prompt!
                // Let's extract the symptom content
                string symptoms = "";
                int symStart = msg.IndexOf("Triệu chứng chính: \"");
                if (symStart >= 0)
                {
                    symStart += "Triệu chứng chính: \"".Length;
                    int symEnd = msg.IndexOf("\"", symStart);
                    if (symEnd > symStart)
                    {
                        symptoms = msg.Substring(symStart, symEnd - symStart);
                    }
                }
                if (string.IsNullOrEmpty(symptoms))
                {
                    int symStartAlt = msg.IndexOf("Triệu chứng chính:");
                    if (symStartAlt >= 0)
                    {
                        symStartAlt += "Triệu chứng chính:".Length;
                        int symEndAlt = msg.IndexOf("\n", symStartAlt);
                        if (symEndAlt > symStartAlt)
                        {
                            symptoms = msg.Substring(symStartAlt, symEndAlt - symStartAlt).Trim('"').Trim();
                        }
                    }
                }

                // Default if not found
                if (string.IsNullOrEmpty(symptoms)) { symptoms = msg; }

                // Now analyze symptoms locally
                string lowerSymptoms = symptoms.ToLower();
                
                // Generic default (avoids mapping everything to cold/ENT)
                string chanDoan = "Triệu chứng chưa phân loại rõ ràng";
                string chanDoanPhu = "Cần theo dõi thêm | Khám lâm sàng tổng quát";
                string chuyenKhoa = "Nội khoa tổng quát";
                string mucDo = "NHE";
                string lyDo = "Các triệu chứng do bạn cung cấp chưa đủ đặc hiệu hoặc cần thăm khám lâm sàng trực tiếp để chẩn đoán.";
                string khuyenNghi = "Theo dõi sức khỏe, uống đủ nước, nghỉ ngơi điều độ. Vui lòng đăng ký khám Nội khoa tổng quát để bác sĩ tư vấn chi tiết.";

                if (ContainsAnyWord(lowerSymptoms, "bụng", "dạ dày", "ruột", "tiêu hóa", "nôn", "đi ngoài", "tiêu chảy", "táo bón", "trào ngược", "đầy hơi", "khó tiêu"))
                {
                    chanDoan = "Rối loạn tiêu hóa / Viêm dạ dày cấp";
                    chanDoanPhu = "Hội chứng ruột kích thích | Ngộ độc thực phẩm nhẹ";
                    chuyenKhoa = "Tiêu hóa";
                    mucDo = "NHE";
                    lyDo = "Đau bụng hoặc các triệu chứng đường tiêu hóa liên quan đến kích ứng niêm mạc dạ dày hoặc rối loạn vận động ruột.";
                    khuyenNghi = "Ăn thức ăn mềm, lỏng, dễ tiêu như cháo, súp ấm. Tránh ăn đồ cay nóng, nhiều dầu mỡ, đồ chua hoặc uống sữa khi đang đau bụng. Nên uống nhiều nước ấm hoặc oresol nếu có đi ngoài nhiều lần.";
                    
                    if (lowerSymptoms.Contains("dữ dội") || lowerSymptoms.Contains("quặn thắt") || lowerSymptoms.Contains("ra máu"))
                    {
                        mucDo = "TRUNG_BINH";
                        lyDo = "Đau bụng dữ dội hoặc quặn thắt có thể là biểu hiện của viêm ruột thừa cấp hoặc các bệnh lý ngoại khoa cấp tính.";
                        khuyenNghi = "Theo dõi sát sao tình trạng đau bụng. Nếu đau lệch sang hố chậu phải hoặc kèm sốt cao, nôn liên tục, vui lòng di chuyển ngay đến cơ sở y tế gần nhất để bác sĩ thăm khám loại trừ viêm ruột thừa.";
                    }
                }
                else if (ContainsAnyWord(lowerSymptoms, "tim") || lowerSymptoms.Contains("đau ngực") || lowerSymptoms.Contains("huyết áp") || lowerSymptoms.Contains("nhịp tim") || lowerSymptoms.Contains("khó thở"))
                {
                    chanDoan = "Nghi ngờ bệnh lý mạch vành hoặc rối loạn nhịp tim";
                    chanDoanPhu = "Cơn đau thắt ngực ổn định | Trào ngược dạ dày thực quản";
                    chuyenKhoa = "Tim mạch";
                    mucDo = "TRUNG_BINH";
                    lyDo = "Cơn đau tức ngực kèm khó thở là dấu hiệu cảnh báo hệ tuần hoàn cần được kiểm tra.";
                    khuyenNghi = "Hạn chế vận động mạnh ngay lập tức. Giảm lượng muối ăn hàng ngày (ăn nhạt), hạn chế mỡ động vật. Đo và theo dõi huyết áp/nhịp tim tại nhà đều đặn và đặt lịch khám Tim mạch sớm.";

                    if (lowerSymptoms.Contains("đau thắt") || lowerSymptoms.Contains("dữ dội") || lowerSymptoms.Contains("ngất") || lowerSymptoms.Contains("cấp cứu"))
                    {
                        mucDo = "NANG";
                        lyDo = "Triệu chứng đau ngực dữ dội có khả năng là nhồi máu cơ tim cấp tính nguy kịch.";
                        khuyenNghi = "⚠️ CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn rất nghiêm trọng. Vui lòng gọi cấp cứu 115 hoặc di chuyển ngay đến cơ sở y tế gần nhất, hoặc liên hệ Hotline CareConnect: 1900-XXXX.";
                    }
                }
                else if (ContainsAnyWord(lowerSymptoms, "bé", "trẻ", "cháu") || lowerSymptoms.Contains("nhi khoa") || lowerSymptoms.Contains("con tôi"))
                {
                    chanDoan = "Theo dõi sốt phát ban ở trẻ em / Rối loạn tiêu hóa nhi";
                    chanDoanPhu = "Sốt siêu vi | Viêm tai giữa cấp";
                    chuyenKhoa = "Nhi khoa";
                    mucDo = "NHE";
                    lyDo = "Triệu chứng phổ biến ở trẻ em liên quan đến hệ miễn dịch đang phát triển.";
                    khuyenNghi = "Theo dõi nhiệt độ của bé thường xuyên (mỗi 2 giờ). Cho bé bú nhiều hơn hoặc uống nước oresol bổ sung điện giải, ăn cháo súp loãng ấm chia làm nhiều bữa nhỏ. Lau mát nách, bẹn nếu sốt nhẹ dưới 38.5 độ.";
                }
                else if (ContainsAnyWord(lowerSymptoms, "tai", "mũi", "họng", "ho", "sốt", "xoang", "amidan", "viêm họng", "cúm", "sổ mũi", "nghẹt mũi"))
                {
                    chanDoan = "Cảm cúm thông thường";
                    chanDoanPhu = "Viêm mũi dị ứng | Viêm phế quản nhẹ";
                    chuyenKhoa = "Tai Mũi Họng";
                    mucDo = "NHE";
                    lyDo = "Các triệu chứng gợi ý tình trạng nhiễm trùng đường hô hấp trên nhẹ.";
                    khuyenNghi = "Nghỉ ngơi ấm, uống nhiều nước ấm. Súc họng nước muối ấm 2-3 lần/ngày. Tránh uống nước đá lạnh hoặc đồ ăn cay nóng. Có thể sử dụng mật ong chanh ấm để làm dịu họng tại nhà.";
                }
                else if (ContainsAnyWord(lowerSymptoms, "răng", "nướu", "miệng") || lowerSymptoms.Contains("sâu răng") || lowerSymptoms.Contains("nhổ răng"))
                {
                    chanDoan = "Viêm quanh răng / Sâu răng tiến triển";
                    chanDoanPhu = "Viêm tủy răng | Viêm lợi cấp";
                    chuyenKhoa = "Răng Hàm Mặt";
                    mucDo = "NHE";
                    lyDo = "Đau nhức răng nướu là biểu hiện của tổn thương mô răng hoặc nha chu.";
                    khuyenNghi = "Tránh thức ăn quá nóng/lạnh, đồ ngọt hoặc thực phẩm cứng. Vệ sinh răng miệng sạch bằng chỉ nha khoa, chải răng nhẹ nhàng bằng bàn chải lông mềm và súc miệng nước muối sinh lý ấm tại nhà.";
                }
                else if (ContainsAnyWord(lowerSymptoms, "da", "mụn", "ngứa", "mề đay", "ban") || lowerSymptoms.Contains("dị ứng") || lowerSymptoms.Contains("phát ban"))
                {
                    chanDoan = "Viêm da cơ địa / Dị ứng tiếp xúc";
                    chanDoanPhu = "Mề đay cấp | Trứng cá đỏ (Rosacea)";
                    chuyenKhoa = "Da liễu";
                    mucDo = "NHE";
                    lyDo = "Mẩn đỏ, ngứa ngáy da là phản ứng miễn dịch dị ứng ngoài da.";
                    khuyenNghi = "Tuyệt đối không gãi hay chà xát mạnh gây trầy xước nhiễm trùng da. Tránh ăn thực phẩm dễ dị ứng (hải sản, nhộng tằm...), uống nhiều nước, bổ sung vitamin từ rau quả và tắm nước ấm nhẹ.";
                }
                else if (ContainsAnyWord(lowerSymptoms, "đầu", "tiền đình") || lowerSymptoms.Contains("chóng mặt") || lowerSymptoms.Contains("mất ngủ") || lowerSymptoms.Contains("tê bì") || lowerSymptoms.Contains("thần kinh"))
                {
                    chanDoan = "Đau đầu căng thẳng / Thiếu máu não thoáng qua";
                    chanDoanPhu = "Đau nửa đầu Migraine | Rối loạn tiền đình";
                    chuyenKhoa = "Thần kinh";
                    mucDo = "TRUNG_BINH";
                    lyDo = "Đau đầu chóng mặt kéo dài có thể do căng thẳng thần kinh hoặc tuần hoàn máu não suy giảm.";
                    khuyenNghi = "Nghỉ ngơi yên tĩnh trong phòng tối, tránh xa thiết bị điện tử. Bổ sung Magie, Vitamin B qua thực phẩm (chuối, các loại hạt). Tập hít thở sâu, tránh suy nghĩ tiêu cực căng thẳng.";
                }

                string replySymptom = $"CHAN_DOAN: {chanDoan}\n" +
                                      $"CHAN_DOAN_PHU: {chanDoanPhu}\n" +
                                      $"CHUYEN_KHOA: {chuyenKhoa}\n" +
                                      $"MUC_DO: {mucDo}\n" +
                                      $"LY_DO: {lyDo}\n" +
                                      $"KHUYEN_NGHI: {khuyenNghi}\n\n" +
                                      $"*Lưu ý: Thông tin tư vấn từ trợ lý ảo chỉ mang tính tham khảo định hướng và không thay thế cho chẩn đoán trực tiếp của bác sĩ chuyên khoa.*";

                return new AiChatResponse
                {
                    Response = replySymptom,
                    SuggestedSpecialization = chuyenKhoa,
                    QuickReplies = new List<string> { "Đặt lịch khám ngay", "Đổi triệu chứng" }
                };
            }

            string message = msg.ToLower();
            string reply = "";
            string? spec = null;

            if (message.Contains("đau ngực dữ dội") || message.Contains("yếu nửa người") || message.Contains("méo miệng") || message.Contains("méo mặt") || message.Contains("khó thở cấp") || message.Contains("hôn mê") || message.Contains("ngộ độc nặng"))
            {
                reply = "⚠️ CẢNH BÁO NGUY HIỂM: Triệu chứng của bạn rất nghiêm trọng. Vui lòng gọi cấp cứu 115 hoặc di chuyển ngay đến cơ sở y tế gần nhất, hoặc liên hệ Hotline CareConnect: 1900-XXXX.";
            }
            else if (matchedResults != null && matchedResults.Count > 0 && matchedResults[0].Score >= 0.25)
            {
                // Ưu tiên phản hồi dựa trên tài liệu tri thức nội bộ được RAG truy xuất
                var top = matchedResults[0];
                var sb = new StringBuilder();
                sb.AppendLine($"🏥 **{top.Chunk.Title}**\n");
                sb.AppendLine(top.Chunk.Content);

                if (matchedResults.Count > 1 && matchedResults[1].Score >= 0.35)
                {
                    sb.AppendLine($"\n\n📌 **Xem thêm thông tin ({matchedResults[1].Chunk.Title}):**");
                    sb.AppendLine(matchedResults[1].Chunk.Content);
                }

                sb.AppendLine($"\n\n🛡️ *Nguồn tài liệu đã kiểm duyệt: {top.Chunk.SourceDocument} (Độ tin cậy ngữ nghĩa: {top.Score:P0})*");
                sb.AppendLine("\n*Lưu ý: Mọi chỉ dẫn y tế chuyên sâu cần có sự thăm khám trực tiếp của bác sĩ chuyên khoa.*");

                return new AiChatResponse
                {
                    Response = sb.ToString(),
                    SuggestedSpecialization = ExtractSpecialization(top.Chunk.Content),
                    QuickReplies = GetContextQuickReplies(msg),
                    IsRAGGrounded = true,
                    GroundingSources = sources ?? new List<KnowledgeSourceDto>()
                };
            }
            else if (IsGreeting(message))
            {
                reply = "👋 Xin chào! Tôi là **Trợ lý AI CareConnect**. Tôi có thể giúp bạn giải đáp các gói khám, quy trình chuẩn bị xét nghiệm, tư vấn chuyên khoa khám phù hợp hoặc hướng dẫn đặt lịch và xem hồ sơ bệnh án. Hôm nay bạn cần tôi hỗ trợ gì?";
            }
            else if (message.Contains("dinh dưỡng") || message.Contains("thực đơn") || message.Contains("tập luyện") || message.Contains("bmi") || message.Contains("tdee") || message.Contains("bmr"))
            {
                reply = "🥗 **Gợi ý thực đơn & Chế độ tập luyện từ CareConnect:**\n\n" +
                        "**1. Thực đơn dinh dưỡng tham khảo:**\n" +
                        "- *Bữa sáng:* Cháo yến mạch ức gà / Phở bò ít bánh kèm nhiều rau thơm.\n" +
                        "- *Bữa trưa:* 1 chén cơm gạo lứt, 150g cá hồi/ức gà áp chảo, bông cải xanh luộc.\n" +
                        "- *Bữa tối:* Salad rau quả trộn dầu ô liu, trứng luộc, 1 củ khoai lang nhỏ.\n" +
                        "- *Bữa phụ (nếu đói):* 1 quả táo hoặc một nắm nhỏ hạt hạnh nhân/óc chó.\n\n" +
                        "**2. Chế độ luyện tập phù hợp:**\n" +
                        "- Vận động vừa sức ít nhất 30 phút mỗi ngày (đi bộ nhanh, chạy bộ nhẹ nhàng, đạp xe hoặc bơi lội).\n" +
                        "- Thực hiện các bài tập giãn cơ cơ bản trước và sau khi luyện tập.\n\n" +
                        "**3. Khuyến cáo y khoa:**\n" +
                        "- Hãy uống đủ từ 1.5 đến 2 lít nước lọc mỗi ngày.\n" +
                        "- Hạn chế tối đa đồ ăn nhanh, nhiều dầu mỡ, đồ ngọt và các thức uống có ga.";
            }
            else if (ContainsAnyWord(message, "tim") || message.Contains("đau ngực") || message.Contains("huyết áp") || message.Contains("nhịp tim") || message.Contains("khó thở"))
            {
                reply = "❤️ **Tư vấn sức khỏe Tim mạch:**\n\n" +
                        "- **Chuyên khoa đề xuất:** Bạn nên đăng ký khám tại chuyên khoa **Tim mạch** hoặc **Nội khoa tổng quát**.\n" +
                        "- **Chế độ ăn uống:** Giảm muối tối đa (ăn nhạt), hạn chế đồ dầu mỡ, đồ chiên rán, mỡ động vật. Nên bổ sung rau xanh, cá béo giàu Omega-3 (cá hồi, cá trích) và các loại hạt.\n" +
                        "- **Cách phòng bệnh & chăm sóc tại nhà:** Tránh căng thẳng, tránh vận động đột ngột quá sức. Đo huyết áp định kỳ hàng ngày, giữ ấm cơ thể khi trời lạnh và ngủ đủ giấc.";
                spec = "Tim mạch";
            }
            else if (ContainsAnyWord(message, "bé", "trẻ", "cháu") || message.Contains("nhi khoa") || message.Contains("con tôi"))
            {
                reply = "👶 **Tư vấn chăm sóc sức khỏe Nhi khoa (Cho bé):**\n\n" +
                        "- **Chuyên khoa đề xuất:** Bạn nên đăng ký khám tại chuyên khoa **Nhi khoa**.\n" +
                        "- **Chế độ ăn uống cho bé:** Cho trẻ ăn thức ăn loãng, ấm, dễ tiêu hóa như cháo, súp chia làm nhiều bữa nhỏ. Tăng cường bú mẹ đối với trẻ sơ sinh, bổ sung nước ép hoa quả giàu Vitamin C (nước cam, nước dừa).\n" +
                        "- **Chăm sóc tại nhà:** Theo dõi nhiệt độ của bé mỗi 2-4 giờ. Lau ấm nách, bẹn nếu bé sốt nhẹ dưới 38.5 độ. Tiêm chủng đầy đủ theo độ tuổi.";
                spec = "Nhi khoa";
            }
            else if (ContainsAnyWord(message, "tai", "mũi", "họng", "ho", "sốt", "xoang", "amidan") || message.Contains("viêm họng"))
            {
                reply = "👂 **Tư vấn sức khỏe Tai Mũi Họng (Ho, sốt, đau họng):**\n\n" +
                        "- **Chuyên khoa đề xuất:** Các triệu chứng ho, sốt, đau họng thuộc chuyên khoa **Tai Mũi Họng**. Bạn nên khám chuyên khoa này để được nội soi và chẩn đoán chính xác.\n" +
                        "- **Chế độ ăn uống:** Uống nhiều nước ấm, tránh nước đá lạnh, đồ ăn cay nóng hoặc quá chua. Nên ăn thức ăn mềm, dễ nuốt như súp, canh hầm ấm.\n" +
                        "- **Cách chữa trị & phòng bệnh tại nhà:** Súc họng bằng nước muối sinh lý ấm 2-3 lần/ngày. Giữ ấm cổ họng và ngực, sử dụng máy tạo độ ẩm trong phòng ngủ. Hạn chế tiếp xúc khói bụi và thuốc lá.";
                spec = "Tai Mũi Họng";
            }
            else if (ContainsAnyWord(message, "răng", "nướu", "miệng") || message.Contains("nhổ răng") || message.Contains("sâu răng"))
            {
                reply = "🦷 **Tư vấn sức khỏe Răng Hàm Mặt:**\n\n" +
                        "- **Chuyên khoa đề xuất:** Bạn nên đăng ký khám chuyên khoa **Răng Hàm Mặt** để điều trị răng sâu, nướu răng sưng đau hoặc lấy cao răng.\n" +
                        "- **Chế độ ăn uống:** Tránh đồ ăn quá cứng, quá dai, đồ ngọt nhiều đường hoặc thức ăn quá nóng/lạnh. Ăn thức ăn mềm, lỏng.\n" +
                        "- **Chăm sóc tại nhà:** Chải răng nhẹ nhàng ít nhất 2 lần/ngày bằng bàn chải lông mềm. Kết hợp dùng chỉ nha khoa và súc miệng nước muối ấm/nước súc miệng kháng khuẩn.";
                spec = "Răng Hàm Mặt";
            }
            else if (message.Contains("da") || message.Contains("mụn") || message.Contains("ngứa") || message.Contains("dị ứng" ) || message.Contains("mề đay") || message.Contains("phát ban"))
            {
                reply = "🧴 **Tư vấn sức khỏe Da liễu (Ngứa, mụn, dị ứng):**\n\n" +
                        "- **Chuyên khoa đề xuất:** Các tình trạng dị ứng, mề đay, mụn hoặc ngứa thuộc chuyên khoa **Da liễu**.\n" +
                        "- **Chế độ ăn uống:** Uống đủ nước, ăn nhiều rau quả xanh chứa nhiều Vitamin A, C, E. Hạn chế đồ ăn dễ gây dị ứng (hải sản, nhộng tằm...), đồ ăn cay nóng và chất kích thích.\n" +
                        "- **Chăm sóc tại nhà:** Tuyệt đối không gãi mạnh gây tổn thương, nhiễm trùng da. Giữ vệ sinh da sạch sẽ bằng sữa tắm dịu nhẹ, dưỡng ẩm da đều đặn và mặc quần áo rộng rãi, thoáng mát.";
                spec = "Da liễu";
            }
            else if (message.Contains("đầu") || message.Contains("chóng mặt") || message.Contains("thần kinh") || message.Contains("mất ngủ") || message.Contains("tê bì"))
            {
                reply = "🧠 **Tư vấn sức khỏe Thần kinh (Đau đầu, chóng mặt, mất ngủ):**\n\n" +
                        "- **Chuyên khoa đề xuất:** Bạn nên khám chuyên khoa **Thần kinh** hoặc **Nội khoa tổng quát**.\n" +
                        "- **Chế độ ăn uống:** Bổ sung thực phẩm giàu Magie và Vitamin nhóm B (chuối, các loại hạt, rau bina). Uống đủ nước, hạn chế sử dụng cà phê, trà đậm hoặc rượu bia trước khi ngủ.\n" +
                        "- **Chăm sóc tại nhà:** Nghỉ ngơi trong phòng tối, yên tĩnh khi đau đầu. Tập các bài tập thở sâu, yoga hoặc thiền để giảm căng thẳng. Thiết lập thói quen ngủ và thức dậy đúng giờ cố định.";
                spec = "Thần kinh";
            }
            else if (ContainsAnyWord(message, "bụng", "dạ dày", "ruột", "tiêu hóa", "nôn", "đi ngoài", "tiêu chảy", "táo bón", "trào ngược", "đầy hơi", "khó tiêu"))
            {
                reply = "🤢 **Tư vấn sức khỏe Tiêu hóa (Đau bụng, dạ dày, đường ruột):**\n\n" +
                        "- **Chuyên khoa đề xuất:** Các triệu chứng đau bụng, trào ngược, đầy hơi thuộc về chuyên khoa **Tiêu hóa** hoặc **Nội khoa tổng quát**.\n" +
                        "- **Chế độ ăn uống:** Ưu tiên ăn đồ thanh đạm, mềm, lỏng, dễ nuốt như cháo trắng, súp thịt băm. Hạn chế đồ ăn cay nóng, đồ chua, thức ăn chứa nhiều chất béo dầu mỡ, đồ uống có ga hoặc các sản phẩm từ sữa khi đang bị đau bụng.\n" +
                        "- **Chăm sóc tại nhà:** Bạn có thể uống nước gừng ấm, chườm ấm vùng bụng bị đau để làm dịu cơ bụng. Nếu có đi ngoài/tiêu chảy, hãy bổ sung nước điện giải Oresol để tránh mất nước.";
                spec = "Tiêu hóa";
            }
            else if (message.Contains("đặt lịch") || message.Contains("hẹn") || message.Contains("booking") || message.Contains("khám bệnh"))
            {
                reply = "📅 **Hướng dẫn đặt lịch khám bệnh trên CareConnect:**\n" +
                        "1. Đăng nhập vào tài khoản **Bệnh nhân**.\n" +
                        "2. Ở phần **Đặt Lịch Hẹn Khám**, điền đầy đủ thông tin hành chính bắt buộc y tế (Số điện thoại, Ngày sinh, Giới tính, Địa chỉ).\n" +
                        "3. Chọn **Bác sĩ**, **Ngày khám**, **Ca khám** trống và điền triệu chứng.\n" +
                        "4. Bấm **Xác nhận đặt lịch**. Lịch hẹn của bạn sẽ hiển thị ở bảng bên cạnh ở trạng thái *Pending* (Đang chờ duyệt).";
            }
            else if (message.Contains("bệnh án") || message.Contains("đơn thuốc") || message.Contains("lịch sử khám"))
            {
                reply = "📝 Để xem hồ sơ bệnh án và đơn thuốc bác sĩ kê sau khi khám xong:\n" +
                        "- Bạn chuyển sang tab **Hồ Sơ Bệnh Án** trên thanh điều hướng chính.\n" +
                        "- Hệ thống sẽ hiển thị chi tiết chẩn đoán, cách điều trị và chi tiết đơn thuốc từng cuộc hẹn khám của bạn.";
            }
            else if (message.Contains("bác sĩ") || message.Contains("ca trực") || message.Contains("lịch trực"))
            {
                reply = "👨‍⚕️ Đối với **Bác sĩ**, bạn đăng nhập tài khoản bác sĩ, chọn tab **Quản Lý Ca Trực**, tick chọn các khung giờ rảnh theo từng ngày trực rồi bấm **Lưu Cấu Hình Ca Trực** để bệnh nhân có thể thấy và đặt lịch khám nhé.";
            }
            else
            {
                reply = "🤖 Tôi đã nhận được câu hỏi của bạn. Để tư vấn tốt nhất, bạn có thể mô tả cụ thể hơn triệu chứng của mình (ví dụ: đau đầu, ho sốt, đau ngực) hoặc hỏi về cách đặt lịch, xem bệnh án trên CareConnect nhé.\n\n🏥 *Mách nhỏ: Bạn luôn nên thăm khám trực tiếp tại phòng khám để bác sĩ chuẩn đoán chuẩn xác nhất.*";
            }

            if (!string.IsNullOrEmpty(spec))
            {
                reply += "\n\n*Lưu ý: Thông tin tư vấn từ trợ lý ảo chỉ mang tính tham khảo định hướng và không thay thế cho chẩn đoán trực tiếp của bác sĩ chuyên khoa.*";
            }

            return new AiChatResponse
            {
                Response = reply,
                SuggestedSpecialization = spec,
                QuickReplies = GetContextQuickReplies(msg)
            };
        }

        private List<string> GetContextQuickReplies(string msg)
        {
            string message = msg.ToLower();
            if (message.Contains("xin chào") || message.Contains("chào") || message.Contains("hi"))
            {
                return new List<string> { "Tôi bị đau ngực", "Tôi muốn tư vấn ho sốt", "Cách đặt lịch khám thế nào?" };
            }
            if (message.Contains("ngực") || message.Contains("tim"))
            {
                return new List<string> { "Bác sĩ tim mạch là ai?", "Cách đặt lịch khám thế nào?" };
            }
            if (message.Contains("đặt lịch") || message.Contains("hẹn"))
            {
                return new List<string> { "Xem bệnh án ở đâu?", "Chuyên khoa Tai Mũi Họng" };
            }
            return new List<string> { "Tư vấn đau đầu chóng mặt", "Cách xem đơn thuốc", "Liên hệ phòng khám" };
        }

        private string? ExtractSpecialization(string text)
        {
            string lowercase = text.ToLower();
            if (lowercase.Contains("tim mạch")) return "Tim mạch";
            if (lowercase.Contains("nhi khoa")) return "Nhi khoa";
            if (lowercase.Contains("tai mũi họng")) return "Tai Mũi Họng";
            if (lowercase.Contains("răng hàm mặt")) return "Răng Hàm Mặt";
            if (lowercase.Contains("da liễu")) return "Da liễu";
            if (lowercase.Contains("thần kinh")) return "Thần kinh";
            if (lowercase.Contains("nội khoa tổng quát")) return "Nội khoa tổng quát";
            if (lowercase.Contains("tiêu hóa")) return "Tiêu hóa";
            if (lowercase.Contains("mắt")) return "Mắt";
            if (lowercase.Contains("sản phụ khoa")) return "Sản phụ khoa";
            if (lowercase.Contains("xương khớp")) return "Xương khớp";
            if (lowercase.Contains("ung bướu")) return "Ung bướu";
            return null;
        }
        #endregion

        public async Task<List<NewsArticleDto>> GetTrendingNewsAsync(bool forceRefresh = false)
        {
            // Initialize cache with local fallback news if empty to ensure immediate response
            lock (_cacheLock)
            {
                if (_cachedNews == null || _cachedNews.Count == 0)
                {
                    _cachedNews = GetLocalFallbackNews();
                    _logger.LogInformation("Initialized medical news cache with local fallback news.");
                }
            }

            // News is considered stale after 15 minutes
            bool needsUpdate = forceRefresh || (DateTime.UtcNow - _lastCachedTime).TotalMinutes >= 15;

            if (needsUpdate)
            {
                if (forceRefresh)
                {
                    _logger.LogInformation("Forced news update requested. Fetching and rewriting synchronously...");
                    try
                    {
                        var rawNews = await FetchVnExpressHealthNewsAsync();
                        if (rawNews != null && rawNews.Count > 0)
                        {
                            var processedNews = await RewriteNewsWithGeminiAsync(rawNews);
                            var finalNews = processedNews ?? rawNews;
                            lock (_cacheLock)
                            {
                                _cachedNews = finalNews;
                                _lastCachedTime = DateTime.UtcNow;
                            }
                            _logger.LogInformation("Synchronous news refresh completed successfully.");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Forced synchronous news update failed. Using current cache.");
                    }
                }
                else
                {
                    bool triggerBackgroundFetch = false;
                    lock (_cacheLock)
                    {
                        if (!_isFetchingInBackground)
                        {
                            _isFetchingInBackground = true;
                            triggerBackgroundFetch = true;
                        }
                    }

                    if (triggerBackgroundFetch)
                    {
                        _logger.LogInformation("Stale news detected. Triggering background news update daemon (24/24 update)...");
                        _ = Task.Run(async () =>
                        {
                            try
                            {
                                var rawNews = await FetchVnExpressHealthNewsAsync();
                                if (rawNews != null && rawNews.Count > 0)
                                {
                                    var processedNews = await RewriteNewsWithGeminiAsync(rawNews);
                                    var finalNews = processedNews ?? rawNews;
                                    lock (_cacheLock)
                                    {
                                        _cachedNews = finalNews;
                                        _lastCachedTime = DateTime.UtcNow;
                                    }
                                    _logger.LogInformation("Background news update daemon completed successfully. Cache updated.");
                                }
                            }
                            catch (Exception ex)
                            {
                                _logger.LogError(ex, "Background news update daemon failed.");
                            }
                            finally
                            {
                                lock (_cacheLock)
                                {
                                    _isFetchingInBackground = false;
                                }
                            }
                        });
                    }
                }
            }

            lock (_cacheLock)
            {
                return new List<NewsArticleDto>(_cachedNews);
            }
        }

        private async Task<List<NewsArticleDto>?> RewriteNewsWithGeminiAsync(List<NewsArticleDto> rawNews)
        {
            if (string.IsNullOrEmpty(_apiKey))
            {
                return null;
            }

            try
            {
                var url = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={_apiKey}";
                var contextJson = JsonSerializer.Serialize(rawNews);

                var prompt = "Bạn là Trợ lý AI CareConnect của Phòng khám Đa khoa CareConnect. " +
                             $"Dưới đây là danh sách {rawNews.Count} bài viết tin tức y tế mới nhất được lấy trực tiếp từ nguồn RSS VnExpress:\n" +
                             $"{contextJson}\n\n" +
                             "Nhiệm vụ của bạn là hãy VIẾT LẠI và BIÊN TẬP lại các tin tức này dưới giọng văn chuyên môn, ấm áp và chuyên nghiệp của một bác sĩ phòng khám CareConnect. " +
                             "Đảm bảo các điểm sau:\n" +
                             "1. Giữ nguyên tính thời sự và thông tin gốc chính xác của bài viết.\n" +
                             "2. Phần 'Content' hãy viết thành một đoạn phân tích y tế hoặc lời khuyên chi tiết từ 3-4 câu từ góc độ chuyên môn y tế phòng khám.\n" +
                             "3. Phần 'Author' phải là tên của một bác sĩ hoặc chuyên gia giả lập của CareConnect (ví dụ: BS. Nguyễn Văn A, ThS. BS. Nguyễn Thị C...).\n" +
                             "4. BẮT BUỘC PHẢI GIỮ NGUYÊN và sao chép chính xác thuộc tính 'ImageUrl' và 'SourceUrl' từ tin tức gốc đầu vào sang kết quả JSON đầu ra.\n" +
                             "5. Kết quả trả về BẮT BUỘC phải là một chuỗi JSON hợp lệ chứa mảng các bài viết y tế, tuyệt đối không được chứa bất kỳ văn bản giải thích hay markdown code blocks (như ```json) nào ngoài chuỗi JSON này để hệ thống có thể phân tích cú pháp trực tiếp. Cấu trúc mỗi đối tượng trong mảng JSON như sau:\n" +
                             "[\n" +
                             "  {\n" +
                             "    \"Title\": \"Tiêu đề tin tức sau khi biên tập\",\n" +
                             "    \"Category\": \"Chuyên mục phù hợp (chọn một trong: Nhi khoa, Tim mạch, Tai Mũi Họng, Răng Hàm Mặt, Da liễu, Thần kinh, Dinh dưỡng, Nội khoa tổng quát)\",\n" +
                             "    \"Summary\": \"Tóm tắt ngắn gọn 1-2 câu\",\n" +
                             "    \"Content\": \"Lời khuyên hoặc phân tích chi tiết của bác sĩ CareConnect (3-4 câu)\",\n" +
                             "    \"Author\": \"Tên bác sĩ chuyên khoa phụ trách biên soạn\",\n" +
                             "    \"PublishDate\": \"Thời gian tương đối của tin gốc (ví dụ: '5 phút trước', '2 giờ trước')\",\n" +
                             "    \"HotTag\": \"Nhãn độ hot (ví dụ: 'TIN NÓNG', 'ĐANG QUAN TÂM', 'MỚI NHẤT')\",\n" +
                             "    \"ThemeColor\": \"Màu sắc thể hiện (chọn một trong: 'danger' - đỏ, 'warning' - vàng, 'success' - xanh lá, 'primary' - xanh dương)\",\n" +
                             "    \"Icon\": \"Tên icon FontAwesome đại diện (chọn một trong: 'fa-virus', 'fa-temperature-high', 'fa-heart-pulse', 'fa-microscope', 'fa-brain', 'fa-prescription-bottle-medical', 'fa-droplet')\",\n" +
                             "    \"ImageUrl\": \"Đường dẫn ảnh giữ nguyên 100% từ tin gốc tương ứng\",\n" +
                             "    \"SourceUrl\": \"Đường dẫn link bài báo gốc giữ nguyên 100% từ tin gốc tương ứng\"\n" +
                             "  }\n" +
                             "]";

                var payload = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    },
                    generationConfig = new
                    {
                        maxOutputTokens = 3000,
                        temperature = 0.7
                    }
                };

                var jsonPayload = JsonSerializer.Serialize(payload);
                var content = new StringContent(jsonPayload, Encoding.UTF8, "application/json");

                _httpClient.Timeout = TimeSpan.FromSeconds(15);
                var response = await _httpClient.PostAsync(url, content);

                if (response.IsSuccessStatusCode)
                {
                    var responseBody = await response.Content.ReadAsStringAsync();
                    using var doc = JsonDocument.Parse(responseBody);
                    var text = doc.RootElement
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString();

                    if (!string.IsNullOrEmpty(text))
                    {
                        string cleanText = text.Trim();
                        
                        // Sử dụng biểu thức chính quy (Regex) để trích xuất mảng JSON an toàn, bỏ qua markdown tag bổ sung
                        string jsonContent = cleanText;
                        var jsonMatch = Regex.Match(cleanText, @"```json\s*(.*?)\s*```", RegexOptions.Singleline | RegexOptions.IgnoreCase);
                        if (jsonMatch.Success)
                        {
                            jsonContent = jsonMatch.Groups[1].Value.Trim();
                        }
                        else
                        {
                            var altMatch = Regex.Match(cleanText, @"```\s*(.*?)\s*```", RegexOptions.Singleline);
                            if (altMatch.Success)
                            {
                                jsonContent = altMatch.Groups[1].Value.Trim();
                            }
                        }

                        try
                        {
                            var news = JsonSerializer.Deserialize<List<NewsArticleDto>>(jsonContent, new JsonSerializerOptions
                            {
                                PropertyNameCaseInsensitive = true
                            });

                            if (news != null && news.Count > 0)
                            {
                                return news;
                            }
                        }
                        catch (JsonException jsonEx)
                        {
                            _logger.LogError(jsonEx, "Lỗi phân tích cú pháp JSON tin tức từ Gemini. Nội dung nhận được: {Content}", jsonContent);
                        }
                    }
                }

                _logger.LogWarning("Gemini API news rewrite call failed with status: {StatusCode}. Using raw news directly.", response.StatusCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error calling Gemini for news rewrite.");
            }

            return null;
        }

        private async Task<List<NewsArticleDto>> FetchVnExpressHealthNewsAsync()
        {
            var articles = new List<NewsArticleDto>();
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Get, "https://vnexpress.net/rss/suc-khoe.rss");
                request.Headers.UserAgent.ParseAdd("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

                _httpClient.Timeout = TimeSpan.FromSeconds(10);
                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var xmlContent = await response.Content.ReadAsStringAsync();
                var doc = XDocument.Parse(xmlContent);

                var items = doc.Descendants("item").Take(12);
                var random = new Random();
                var hotTags = new[] { "TIN NÓNG", "ĐANG QUAN TÂM", "MỚI CẬP NHẬT", "ĐỘT PHÁ" };
                var authors = new[] { "Ban Biên Tập CareConnect", "BS. Nguyễn Văn A", "ThS. BS. Nguyễn Thị C", "TS. BS. Lê Hoàng D" };

                foreach (var item in items)
                {
                    string title = item.Element("title")?.Value ?? string.Empty;
                    string link = item.Element("link")?.Value ?? string.Empty;
                    string pubDateRaw = item.Element("pubDate")?.Value ?? string.Empty;
                    string descriptionRaw = item.Element("description")?.Value ?? string.Empty;

                    string imageUrl = ExtractImageUrl(descriptionRaw);
                    if (string.IsNullOrEmpty(imageUrl))
                    {
                        imageUrl = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&auto=format&fit=crop&q=60";
                    }

                    string summary = CleanHtmlTags(descriptionRaw);
                    string relativeTime = GetRelativeTimeString(pubDateRaw);
                    var (category, themeColor, icon) = ClassifyCategoryAndStyle(title, summary);

                    articles.Add(new NewsArticleDto
                    {
                        Title = title,
                        Category = category,
                        Summary = summary,
                        Content = summary + " (Thông tin chi tiết được cập nhật từ VnExpress Sức Khỏe. Vui lòng tham khảo ý kiến bác sĩ CareConnect nếu bạn có bất kỳ triệu chứng tương ứng.)",
                        Author = authors[random.Next(authors.Length)],
                        PublishDate = relativeTime,
                        HotTag = hotTags[random.Next(hotTags.Length)],
                        ThemeColor = themeColor,
                        Icon = icon,
                        ImageUrl = imageUrl,
                        SourceUrl = link
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error while fetching VnExpress RSS Sức Khỏe. Returning empty/fallback.");
            }

            return articles;
        }

        private string ExtractImageUrl(string descriptionRaw)
        {
            if (string.IsNullOrEmpty(descriptionRaw)) return string.Empty;
            try
            {
                var match = Regex.Match(descriptionRaw, @"<img\s+[^>]*?src=[""']([^""']+)[""']", RegexOptions.IgnoreCase);
                if (match.Success)
                {
                    return match.Groups[1].Value;
                }
            }
            catch
            {
                // Bỏ qua lỗi regex
            }
            return string.Empty;
        }

        private string CleanHtmlTags(string html)
        {
            if (string.IsNullOrEmpty(html)) return string.Empty;
            
            string cleaned = html;
            if (cleaned.Contains("<![CDATA["))
            {
                cleaned = cleaned.Replace("<![CDATA[", "").Replace("]]>", "");
            }

            cleaned = Regex.Replace(cleaned, "<.*?>", string.Empty);
            cleaned = System.Net.WebUtility.HtmlDecode(cleaned);
            
            return cleaned.Trim();
        }

        private string GetRelativeTimeString(string pubDateRaw)
        {
            if (DateTimeOffset.TryParse(pubDateRaw, System.Globalization.CultureInfo.InvariantCulture, System.Globalization.DateTimeStyles.None, out DateTimeOffset pubDateOffset))
            {
                var diff = DateTimeOffset.Now - pubDateOffset;
                if (diff.TotalSeconds < 0) return "Vừa cập nhật";
                if (diff.TotalMinutes < 1) return "Vừa cập nhật";
                if (diff.TotalMinutes < 60) return $"{(int)diff.TotalMinutes} phút trước";
                if (diff.TotalHours < 24) return $"{(int)diff.TotalHours} giờ trước";
                return $"{(int)diff.TotalDays} ngày trước";
            }
            return "Vừa cập nhật";
        }

        private (string Category, string ThemeColor, string Icon) ClassifyCategoryAndStyle(string title, string summary)
        {
            string searchArea = (title + " " + summary).ToLower();

            // 1. Nhi khoa (Pediatrics) - Chỉ khớp các từ liên quan mật thiết đến trẻ em
            if (searchArea.Contains("trẻ em") || 
                searchArea.Contains("trẻ nhỏ") || 
                searchArea.Contains("sơ sinh") || 
                searchArea.Contains("bé ") || 
                searchArea.Contains("em bé") || 
                searchArea.Contains("nhi khoa") || 
                searchArea.Contains("bệnh nhi") || 
                searchArea.Contains("nhi đồng") || 
                searchArea.Contains("tiêm chủng") || 
                searchArea.Contains("vắc xin") || 
                searchArea.Contains("vacxin"))
            {
                return ("Nhi khoa", "success", "fa-baby");
            }

            // 2. Tim mạch (Cardiology)
            if (searchArea.Contains("tim mạch") || 
                searchArea.Contains("huyết áp") || 
                searchArea.Contains("đột quỵ") || 
                searchArea.Contains("nhồi máu") || 
                searchArea.Contains("suy tim") || 
                searchArea.Contains("nhịp tim") ||
                searchArea.Contains("động mạch"))
            {
                return ("Tim mạch", "danger", "fa-heart-pulse");
            }

            // 3. Tai Mũi Họng (ENT)
            if (searchArea.Contains("tai mũi họng") || 
                searchArea.Contains("viêm họng") || 
                searchArea.Contains("viêm tai") || 
                searchArea.Contains("viêm mũi") || 
                searchArea.Contains("ngạt mũi") || 
                searchArea.Contains("ho khan") || 
                searchArea.Contains("ho có đờm") || 
                searchArea.Contains("sốt xuất huyết") || 
                searchArea.Contains("cúm") || 
                searchArea.Contains("covid") || 
                searchArea.Contains("virus"))
            {
                return ("Tai Mũi Họng", "warning", "fa-virus");
            }

            // 4. Răng Hàm Mặt (Dentistry)
            if (searchArea.Contains("răng") || 
                searchArea.Contains("nướu") || 
                searchArea.Contains("sâu răng") || 
                searchArea.Contains("nhổ răng") || 
                searchArea.Contains("niêm mạc miệng") || 
                searchArea.Contains("nha khoa"))
            {
                return ("Răng Hàm Mặt", "primary", "fa-tooth");
            }

            // 5. Da liễu (Dermatology)
            if (searchArea.Contains("da liễu") || 
                searchArea.Contains("mụn") || 
                searchArea.Contains("chàm") || 
                searchArea.Contains("vẩy nến") || 
                searchArea.Contains("mẩn ngứa") || 
                searchArea.Contains("dị ứng da") || 
                searchArea.Contains("chăm sóc da"))
            {
                return ("Da liễu", "info", "fa-prescription-bottle-medical");
            }

            // 6. Thần kinh (Neurology)
            if (searchArea.Contains("thần kinh") || 
                searchArea.Contains("đau đầu") || 
                searchArea.Contains("nhức đầu") || 
                searchArea.Contains("não bộ") || 
                searchArea.Contains("tiền đình") || 
                searchArea.Contains("mất ngủ") || 
                searchArea.Contains("stress") || 
                searchArea.Contains("tê bì"))
            {
                return ("Thần kinh", "secondary", "fa-brain");
            }

            // 7. Dinh dưỡng (Nutrition)
            if (searchArea.Contains("dinh dưỡng") || 
                searchArea.Contains("giảm cân") || 
                searchArea.Contains("béo phì") || 
                searchArea.Contains("chế độ ăn") || 
                searchArea.Contains("thực phẩm") || 
                searchArea.Contains("bmi"))
            {
                return ("Dinh dưỡng", "success", "fa-apple-whole");
            }

            return ("Nội khoa tổng quát", "primary", "fa-prescription-bottle-medical");
        }

        private List<NewsArticleDto> GetLocalFallbackNews()
        {
            var random = new Random();
            return new List<NewsArticleDto>
            {
                new NewsArticleDto
                {
                    Title = "Cảnh báo dịch sốt xuất huyết bùng phát mạnh đầu mùa hè 2026",
                    Category = "Dịch tễ học",
                    Summary = "Số ca nhiễm sốt xuất huyết ghi nhận xu hướng tăng nhanh tại các tỉnh thành phía Nam do thời tiết mưa ẩm kéo dài. Bộ Y tế khuyến cáo người dân tích cực diệt loăng quăng.",
                    Content = "Theo báo cáo mới nhất của Cục Y tế dự phòng, số ca nhập viện tăng 15% so với cùng kỳ. Biện pháp phòng ngừa tốt nhất vẫn là dọn dẹp các vật dụng chứa nước đọng quanh nhà, phát quang bụi rậm và ngủ màn chống muỗi đốt.",
                    Author = "PGS.TS. BS. Trần Văn B",
                    PublishDate = $"{random.Next(2, 9)} phút trước",
                    HotTag = "TIN NÓNG",
                    ThemeColor = "danger",
                    Icon = "fa-virus",
                    ImageUrl = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500",
                    SourceUrl = "https://suckhoe.vnexpress.net/"
                },
                new NewsArticleDto
                {
                    Title = "Bí quyết phòng tránh đột quỵ nhiệt trong các đợt nắng nóng kỷ lục",
                    Category = "Y học thường thức",
                    Summary = "Nhiệt độ ngoài trời tăng cao dễ dẫn đến say nắng, sốc nhiệt và nguy hiểm hơn là đột quỵ. Hãy trang bị các kiến thức nhận biết dấu hiệu khẩn cấp.",
                    Content = "Khi gặp người có biểu hiện sốc nhiệt (da nóng đỏ, đau đầu, lơ mơ), cần đưa ngay vào bóng râm, chườm mát ở nách, bẹn và gọi cấp cứu 115. Tránh cho uống nước đá lạnh đột ngột để cơ thể không bị sốc nhiệt.",
                    Author = "ThS. BS. Nguyễn Thị C",
                    PublishDate = $"{random.Next(10, 30)} phút trước",
                    HotTag = "ĐANG QUAN TÂM",
                    ThemeColor = "warning",
                    Icon = "fa-temperature-high",
                    ImageUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500",
                    SourceUrl = "https://suckhoe.vnexpress.net/"
                },
                new NewsArticleDto
                {
                    Title = "Đột phá mới: Ứng dụng Trí tuệ Nhân tạo (AI) giúp phát hiện sớm ung thư da",
                    Category = "Công nghệ y tế",
                    Summary = "Các nhà khoa học vừa công bố mô hình AI có độ chính xác lên đến 98% trong việc nhận diện các tổn thương ác tính từ hình ảnh chụp lâm sàng thông thường.",
                    Content = "Công nghệ này mở ra cơ hội sàng lọc sớm cho hàng triệu bệnh nhân ở vùng sâu vùng xa chỉ với thiết bị di động. CareConnect đang tích hợp thử nghiệm công nghệ này vào chẩn đoán hình ảnh cuối năm nay.",
                    Author = "TS. BS. Lê Hoàng D",
                    PublishDate = $"{random.Next(35, 59)} phút trước",
                    HotTag = "MỚI NHẤT",
                    ThemeColor = "success",
                    Icon = "fa-microscope",
                    ImageUrl = "https://images.unsplash.com/photo-1530026405186-ed1ea0ac7a63?w=500",
                    SourceUrl = "https://suckhoe.vnexpress.net/"
                }
            };
        }

        private static bool ContainsAnyWord(string message, params string[] wordsToFind)
        {
            if (string.IsNullOrEmpty(message) || wordsToFind == null || wordsToFind.Length == 0) return false;
            
            var words = message.Split(new[] { ' ', '.', ',', '?', '!', '\n', '\r', ':', '-', '(', ')', '[', ']', '"', '\'', '/' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var word in words)
            {
                var cleanWord = word.Trim();
                foreach (var wordToFind in wordsToFind)
                {
                    if (string.Equals(cleanWord, wordToFind, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
            }
            return false;
        }
    }
}
