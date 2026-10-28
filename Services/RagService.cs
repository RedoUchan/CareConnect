using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using web.Models;

namespace web.Services
{
    public class RagService : IRagService
    {
        private readonly ILogger<RagService> _logger;
        private readonly List<KnowledgeChunk> _knowledgeStore = new();
        private readonly Dictionary<string, double> _idfMap = new();

        public RagService(ILogger<RagService> logger)
        {
            _logger = logger;
            InitializeKnowledgeBase();
            BuildVectorIndex();
        }

        public IReadOnlyList<KnowledgeChunk> GetAllChunks() => _knowledgeStore.AsReadOnly();

        public KnowledgeChunk? GetChunkById(string id)
        {
            if (string.IsNullOrWhiteSpace(id)) return null;
            return _knowledgeStore.FirstOrDefault(c => string.Equals(c.Id, id, StringComparison.OrdinalIgnoreCase));
        }

        public Task<List<KnowledgeSearchResult>> SearchAsync(string query, int topK = 3, double minScore = 0.2)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                return Task.FromResult(new List<KnowledgeSearchResult>());
            }

            var queryTokens = Tokenize(query);
            if (queryTokens.Count == 0)
            {
                return Task.FromResult(new List<KnowledgeSearchResult>());
            }

            // Tạo vector TF-IDF cho câu truy vấn
            var queryVector = BuildTfIdfVector(queryTokens);
            double queryNorm = Math.Sqrt(queryVector.Values.Sum(v => v * v));

            if (queryNorm <= 0)
            {
                return Task.FromResult(new List<KnowledgeSearchResult>());
            }

            var results = new List<KnowledgeSearchResult>();
            string lowerQuery = query.ToLowerInvariant();

            foreach (var chunk in _knowledgeStore)
            {
                if (chunk.VectorWeights == null || chunk.VectorWeights.Count == 0)
                    continue;

                // Tính Cosine Similarity giữa Vector Query và Vector Chunk
                double dotProduct = 0.0;
                foreach (var (term, weight) in queryVector)
                {
                    if (chunk.VectorWeights.TryGetValue(term, out double docWeight))
                    {
                        dotProduct += weight * docWeight;
                    }
                }

                double docNorm = Math.Sqrt(chunk.VectorWeights.Values.Sum(v => v * v));
                double cosine = (queryNorm * docNorm) > 0 ? (dotProduct / (queryNorm * docNorm)) : 0;

                // Thưởng điểm khớp Keyword chính xác (hỗ trợ cả có dấu và không dấu)
                string unaccentedQuery = RemoveDiacritics(lowerQuery);
                int keywordHits = chunk.Keywords.Count(kw => 
                    lowerQuery.Contains(kw.ToLowerInvariant()) || 
                    unaccentedQuery.Contains(RemoveDiacritics(kw.ToLowerInvariant())));
                double keywordBoost = Math.Min(keywordHits * 0.15, 0.45);

                // Thưởng điểm nếu truy vấn chứa trực tiếp từ khóa trong Tiêu đề
                string unaccentedTitle = RemoveDiacritics(chunk.Title.ToLowerInvariant());
                if (lowerQuery.Contains(chunk.Title.ToLowerInvariant()) || 
                    unaccentedQuery.Contains(unaccentedTitle) ||
                    unaccentedTitle.Split(' ', StringSplitOptions.RemoveEmptyEntries).Any(w => w.Length > 3 && unaccentedQuery.Contains(w)))
                {
                    keywordBoost += 0.1;
                }

                double finalScore = Math.Min(1.0, cosine * 0.65 + keywordBoost);

                if (finalScore >= minScore)
                {
                    string snippet = GenerateSnippet(chunk.Content, queryTokens);
                    results.Add(new KnowledgeSearchResult
                    {
                        Chunk = chunk,
                        Score = Math.Round(finalScore, 4),
                        Snippet = snippet
                    });
                }
            }

            var sortedResults = results
                .OrderByDescending(r => r.Score)
                .Take(topK)
                .ToList();

            _logger.LogInformation("RAG Query: '{Query}' -> Matched {Count} chunks (Top score: {TopScore})", 
                query, sortedResults.Count, sortedResults.FirstOrDefault()?.Score ?? 0);

            return Task.FromResult(sortedResults);
        }

        #region Vector Engine & NLP Math
        private string RemoveDiacritics(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return string.Empty;
            var normalizedString = text.Normalize(System.Text.NormalizationForm.FormD);
            var stringBuilder = new System.Text.StringBuilder();

            foreach (var c in normalizedString)
            {
                var unicodeCategory = System.Globalization.CharUnicodeInfo.GetUnicodeCategory(c);
                if (unicodeCategory != System.Globalization.UnicodeCategory.NonSpacingMark)
                {
                    stringBuilder.Append(c);
                }
            }

            return stringBuilder.ToString().Normalize(System.Text.NormalizationForm.FormC).Replace("đ", "d").Replace("Đ", "D");
        }

        private List<string> Tokenize(string text)
        {
            if (string.IsNullOrWhiteSpace(text)) return new List<string>();

            // Lấy cả chuỗi có dấu và chuỗi không dấu để hỗ trợ tìm kiếm không dấu
            string unaccented = RemoveDiacritics(text);
            string combined = text + " " + unaccented;

            // Chuyển chữ thường và làm sạch ký tự đặc biệt
            string cleaned = Regex.Replace(combined.ToLowerInvariant(), @"[^\w\s\d]", " ");
            var rawWords = cleaned.Split(new[] { ' ', '\t', '\r', '\n' }, StringSplitOptions.RemoveEmptyEntries);

            var stopWords = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            {
                "và", "hoặc", "là", "có", "của", "cho", "ở", "tại", "những", "các", "một", "này", "đó",
                "khi", "để", "thì", "với", "trong", "được", "ra", "vào", "lại", "rất", "nhiều", "như",
                "va", "hoac", "la", "co", "cua", "cho", "o", "tai", "nhung", "cac", "mot", "nay", "do",
                "khi", "de", "thi", "voi", "trong", "duoc", "ra", "vao", "lai", "rat", "nhieu", "nhu"
            };

            var words = rawWords.Where(w => w.Length >= 2 && !stopWords.Contains(w)).ToList();

            // Sinh Bi-grams để nắm bắt ngữ nghĩa kết hợp (vd: 'xét nghiệm', 'tim mạch', 'nhịn ăn')
            var tokens = new List<string>(words);
            for (int i = 0; i < words.Count - 1; i++)
            {
                tokens.Add($"{words[i]}_{words[i + 1]}");
            }

            return tokens;
        }

        private Dictionary<string, double> BuildTfIdfVector(List<string> tokens)
        {
            var tf = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            foreach (var t in tokens)
            {
                tf[t] = tf.TryGetValue(t, out double count) ? count + 1 : 1;
            }

            var vector = new Dictionary<string, double>(StringComparer.OrdinalIgnoreCase);
            int total = tokens.Count;

            foreach (var (term, count) in tf)
            {
                double termFreq = count / total;
                double idf = _idfMap.TryGetValue(term, out double val) ? val : 1.2;
                vector[term] = termFreq * idf;
            }

            return vector;
        }

        private void BuildVectorIndex()
        {
            int docCount = _knowledgeStore.Count;
            if (docCount == 0) return;

            var docTermOccurrences = new Dictionary<string, int>(StringComparer.OrdinalIgnoreCase);
            var chunkTokensList = new List<List<string>>();

            foreach (var chunk in _knowledgeStore)
            {
                string fullText = $"{chunk.Title} {chunk.Category} {string.Join(" ", chunk.Keywords)} {chunk.Content}";
                var tokens = Tokenize(fullText);
                chunkTokensList.Add(tokens);

                var distinctTerms = tokens.Distinct(StringComparer.OrdinalIgnoreCase);
                foreach (var term in distinctTerms)
                {
                    docTermOccurrences[term] = docTermOccurrences.TryGetValue(term, out int c) ? c + 1 : 1;
                }
            }

            // Tính IDF
            _idfMap.Clear();
            foreach (var (term, df) in docTermOccurrences)
            {
                _idfMap[term] = Math.Log((1.0 + docCount) / (1.0 + df)) + 1.0;
            }

            // Đánh index TF-IDF cho từng chunk
            for (int i = 0; i < docCount; i++)
            {
                var chunk = _knowledgeStore[i];
                var tokens = chunkTokensList[i];
                chunk.VectorWeights = BuildTfIdfVector(tokens);
            }

            _logger.LogInformation("Indexed {ChunkCount} CareConnect knowledge chunks with {VocabularySize} semantic terms.", 
                docCount, _idfMap.Count);
        }

        private string GenerateSnippet(string content, List<string> queryTokens)
        {
            if (string.IsNullOrEmpty(content) || content.Length <= 180)
                return content;

            var sentences = content.Split(new[] { '.', '\n', ';' }, StringSplitOptions.RemoveEmptyEntries);
            foreach (var s in sentences)
            {
                if (queryTokens.Any(t => s.Contains(t.Replace("_", " "), StringComparison.OrdinalIgnoreCase)))
                {
                    return s.Trim() + "...";
                }
            }

            return content.Substring(0, Math.Min(180, content.Length)) + "...";
        }
        #endregion

        #region CareConnect Knowledge Base Seeding
        private void InitializeKnowledgeBase()
        {
            _knowledgeStore.AddRange(new[]
            {
                new KnowledgeChunk
                {
                    Id = "KB-PKG-01",
                    Title = "Gói Khám Tổng Quát Standard",
                    Category = "Gói Khám",
                    SourceDocument = "Bảng giá & Danh mục Gói khám CareConnect 2026",
                    Keywords = new List<string> { "tổng quát", "standard", "gói khám", "1.200.000", "xét nghiệm máu", "ecg", "siêu âm bụng", "x-quang" },
                    Content = @"Gói Khám Tổng Quát Standard tại CareConnect có chi phí 1.200.000 VNĐ.
Gói khám bao gồm các danh mục:
1. Thăm khám lâm sàng cùng Bác sĩ Nội khoa tổng quát: Đo huyết áp, khám tim phổi, tư vấn tiền sử bệnh.
2. Chẩn đoán hình ảnh: Chụp X-quang phổi thẳng kỹ thuật số, siêu âm ổ bụng tổng quát màu.
3. Thăm dò chức năng: Đo điện tim (ECG 12 chuyển đạo).
4. Xét nghiệm máu & nước tiểu: Công thức máu 18 chỉ số (CBC), đường huyết lúc đói (Glucose), mỡ máu toàn phần (Cholesterol, Triglyceride), chức năng gan (AST, ALT), chức năng thận (Ure, Creatinine) và tổng phân tích nước tiểu 10 thông số.
Thời gian hoàn tất gói khám: 2 - 2.5 giờ. Bệnh nhân cần nhịn ăn tối thiểu 8 tiếng trước khi lấy máu."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PKG-02",
                    Title = "Gói Tầm Soát Tim Mạch Chuyên Sâu",
                    Category = "Gói Khám",
                    SourceDocument = "Bảng giá & Danh mục Gói khám CareConnect 2026",
                    Keywords = new List<string> { "tim mạch", "chuyên sâu", "2.800.000", "doppler", "holter", "troponin", "huyết áp", "đau ngực" },
                    Content = @"Gói Tầm Soát Tim Mạch Chuyên Sâu tại CareConnect có chi phí 2.800.000 VNĐ.
Gói khám bao gồm:
1. Khám và tư vấn chuyên sâu cùng Bác sĩ Chuyên khoa Tim mạch.
2. Siêu âm tim Doppler màu 4D: Đánh giá chức năng bơm máu, van tim, cơ tim và màng ngoài tim.
3. Đo Holter điện tâm đồ 24 giờ liên tục (hoặc đo điện tâm đồ gắng sức theo chỉ định chuyên gia).
4. Xét nghiệm dấu ấn sinh học: Định lượng men tim Troponin T độ nhạy cao, Bilan lipid máu toàn diện (HDL, LDL, Triglyceride, Cholesterol), đường huyết HbA1c.
5. Chụp X-quang tim phổi thẳng và điện tâm đồ thường quy.
Khuyến nghị cho người có nguy cơ cao: Người trên 45 tuổi, người thường xuyên hồi hộp, tức ngực, khó thở khi gắng sức, người có tiền sử tăng huyết áp hoặc gia đình mắc bệnh tim mạch sớm."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PKG-03",
                    Title = "Gói Khám Nhi Khoa Standard",
                    Category = "Gói Khám",
                    SourceDocument = "Bảng giá & Danh mục Gói khám CareConnect 2026",
                    Keywords = new List<string> { "nhi khoa", "trẻ em", "bé", "650.000", "tiêm chủng", "dinh dưỡng", "chiều cao", "cân nặng" },
                    Content = @"Gói Khám Nhi Khoa Standard tại CareConnect có chi phí 650.000 VNĐ.
Dành cho trẻ từ 0 đến 15 tuổi, bao gồm:
1. Đánh giá sự phát triển thể chất toàn diện: Cân nặng, chiều cao, vòng đầu, tính toán chỉ số BMI theo bảng chuẩn WHO.
2. Khám lâm sàng toàn diện: Khám tim phổi, tai mũi họng, kiểm tra răng nướu, khám bụng và phát hiện sớm các dị tật bẩm sinh/cong vẹo cột sống.
3. Tư vấn vi chất dinh dưỡng và chế độ ăn dặm, ăn uống phù hợp từng lứa tuổi.
4. Rà soát sổ tiêm chủng mở rộng và tư vấn các mũi vắc-xin nhắc lại cần thiết.
Thời gian khám: 45 - 60 phút. Không yêu cầu trẻ phải nhịn đói trừ khi có chỉ định xét nghiệm máu cụ thể."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PKG-04",
                    Title = "Gói Tầm Soát Ung Thư Cảnh Báo Sớm",
                    Category = "Gói Khám",
                    SourceDocument = "Bảng giá & Danh mục Gói khám CareConnect 2026",
                    Keywords = new List<string> { "ung thư", "tầm soát", "4.500.000", "dấu ấn", "cea", "afp", "nội soi", "tuyến giáp" },
                    Content = @"Gói Tầm Soát Ung Thư Cảnh Báo Sớm tại CareConnect có chi phí 4.500.000 VNĐ.
Gói khám chuyên sâu bao gồm:
1. Xét nghiệm các chỉ điểm sinh học khối u (Tumor Markers): CEA (đại trực tràng/phổi), AFP (gan), CA 19-9 (tụy/đường mật), CA 125 (buồng trứng ở nữ) hoặc PSA toàn phần (tiền liệt tuyến ở nam).
2. Siêu âm màu kỹ thuật số: Tuyến giáp, ổ bụng tổng quát, tuyến vú (đối với nữ).
3. Chụp X-quang phổi kỹ thuật số liều thấp.
4. Nội soi tiêu hóa không đau (gây mê êm ái) theo gói tùy chọn.
5. Tư vấn kết quả và phác đồ theo dõi định kỳ bởi hội đồng chuyên gia ung bướu."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PREP-01",
                    Title = "Hướng Dẫn Chuẩn Bị Trước Khi Xét Nghiệm Máu",
                    Category = "Chỉ Dẫn Y Khoa",
                    SourceDocument = "Sổ tay Hướng dẫn Bệnh nhân CareConnect - Quy trình Lấy mẫu",
                    Keywords = new List<string> { "nhịn ăn", "xét nghiệm máu", "uống nước", "chuẩn bị", "glucose", "đường huyết", "mỡ máu" },
                    Content = @"Để kết quả xét nghiệm máu đạt độ chính xác tối đa, bệnh nhân bắt buộc phải tuân thủ các quy tắc sau:
1. Nhịn ăn: Nhịn ăn hoàn toàn từ 8 đến 12 tiếng trước giờ lấy mẫu (thường từ sau 21h tối hôm trước nếu lấy máu vào sáng hôm sau).
2. Nước uống: Được phép và nên uống một ít nước lọc nguội (giúp tĩnh mạch căng, dễ lấy máu và tránh cô đặc máu). Tuyệt đối KHÔNG uống sữa, nước ép hoa quả, nước ngọt, cà phê, trà hay nước tăng lực.
3. Chất kích thích: Không uống rượu, bia, hút thuốc lá trong vòng 24 giờ trước khi xét nghiệm.
4. Thuốc điều trị: Thuốc điều trị huyết áp, tim mạch vẫn có thể uống với một ngụm nước lọc nhỏ vào buổi sáng. Riêng thuốc hạ đường huyết hoặc tiêm Insulin chỉ dùng sau khi đã lấy máu và được ăn sáng."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PREP-02",
                    Title = "Hướng Dẫn Chuẩn Bị Trước Nội Soi Tiêu Hóa (Dạ Dày & Đại Tràng)",
                    Category = "Chỉ Dẫn Y Khoa",
                    SourceDocument = "Sổ tay Hướng dẫn Bệnh nhân CareConnect - Đơn vị Nội soi",
                    Keywords = new List<string> { "nội soi", "dạ dày", "đại tràng", "tiêu hóa", "gây mê", "làm sạch ruột", "chuẩn bị" },
                    Content = @"Quy định chuẩn bị an toàn cho dịch vụ Nội soi tiêu hóa tại CareConnect:
1. Nội soi dạ dày:
- Nhịn ăn ít nhất 6 tiếng trước giờ nội soi.
- Nhịn uống hoàn toàn (kể cả nước lọc) trong 2 tiếng trước giờ tiến hành thủ thuật để tránh nguy cơ trào ngược dịch vào phổi khi gây mê.
2. Nội soi đại tràng:
- Ăn nhẹ (cháo loãng, súp không rau củ) trong ngày trước ngày nội soi.
- Uống thuốc làm sạch ruột theo đúng hướng dẫn của điều dưỡng CareConnect để làm sạch cặn bã trong lòng ruột.
- Nhịn uống 2 tiếng trước khi gây mê.
Lưu ý quan trọng: Bệnh nhân đi nội soi có tiền mê cần đi cùng người thân để hỗ trợ đưa về sau thủ thuật. Không tự lái xe trong vòng 4 tiếng sau gây mê."
                },
                new KnowledgeChunk
                {
                    Id = "KB-PREP-03",
                    Title = "Hướng Dẫn Chuẩn Bị Trước Khi Siêu Âm Ổ Bụng & Phụ Khoa / Tuyến Tiền Liệt",
                    Category = "Chỉ Dẫn Y Khoa",
                    SourceDocument = "Sổ tay Hướng dẫn Bệnh nhân CareConnect - Khoa Chẩn đoán hình ảnh",
                    Keywords = new List<string> { "siêu âm", "ổ bụng", "nhịn tiểu", "uống nước", "tiền liệt tuyến", "phụ khoa", "túi mật" },
                    Content = @"Hướng dẫn chuẩn bị cho bệnh nhân trước khi siêu âm tại CareConnect:
1. Siêu âm ổ bụng tổng quát & Hệ tiết niệu / Phụ khoa / Tuyến tiền liệt:
- Bệnh nhân cần uống 500ml - 1000ml nước lọc trước giờ siêu âm khoảng 45 - 60 phút và NHỊN TIỂU.
- Bàng quang căng đầy sẽ tạo cửa sổ âm học giúp bác sĩ quan sát rõ nét tử cung, phần phụ, bàng quang và tuyến tiền liệt.
2. Siêu âm túi mật và tụy:
- Bệnh nhân cần nhịn ăn ít nhất 6 tiếng trước giờ siêu âm để túi mật căng to, không bị co bóp, giúp phát hiện sỏi nhỏ hoặc polyp thành túi mật.
- Trang phục: Nên mặc quần áo rộng rãi, thoải mái, hai mảnh để thuận tiện bộc lộ vùng bụng khi khám."
                },
                new KnowledgeChunk
                {
                    Id = "KB-BRANCH-01",
                    Title = "Mạng Lưới Chi Nhánh Phòng Khám & Giờ Hoạt Động CareConnect",
                    Category = "Chi Nhánh & Cơ Sở",
                    SourceDocument = "Quy chế Vận hành Hệ thống Phòng khám CareConnect",
                    Keywords = new List<string> { "chi nhánh", "địa chỉ", "quận 1", "quận 3", "thủ đức", "thái nguyên", "giờ làm việc", "đỗ xe" },
                    Content = @"Hệ thống Phòng khám Đa khoa CareConnect hiện có mạng lưới các cơ sở sau:
1. CareConnect Quận 1: 123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM.
- Giờ làm việc: 07:30 - 20:00 (Mở cửa tất cả các ngày trong tuần kể cả Chủ Nhật).
- Tiện ích: Có bãi đỗ xe ô tô và xe máy miễn phí cho khách hàng đến thăm khám. Hotline: (028) 3822 0001.
2. CareConnect Quận 3: 456 Nguyễn Thị Minh Khai, Phường 5, Quận 3, TP.HCM.
- Giờ làm việc: 08:00 - 17:30 (Thứ 2 đến Thứ 7, Chủ Nhật nghỉ). Có chỗ gửi xe máy tại chỗ.
3. CareConnect Thủ Đức: 789 Võ Văn Ngân, Phường Trường Thọ, TP. Thủ Đức, TP.HCM.
- Giờ làm việc: 07:30 - 19:00 (Thứ 2 đến Thứ 7).
4. CareConnect Thái Nguyên: Phục vụ cư dân khu vực Thái Nguyên và sinh viên ICTU / Đại học Thái Nguyên.
Bệnh nhân có thể sử dụng tính năng 'Định vị & Tìm chi nhánh gần nhất' trên hệ thống web CareConnect để nhận chỉ đường bản đồ."
                },
                new KnowledgeChunk
                {
                    Id = "KB-POLICY-01",
                    Title = "Chính Sách Bảo Hiểm Y Tế (BHYT) & Bảo Lãnh Viện Phí Tư Nhân",
                    Category = "Chính Sách & Thanh Toán",
                    SourceDocument = "Cẩm nang Bảo hiểm & Viện phí CareConnect",
                    Keywords = new List<string> { "bhyt", "bảo hiểm", "bảo lãnh", "viện phí", "vssid", "thẻ bảo hiểm", "thanh toán" },
                    Content = @"Chính sách thanh toán và quyền lợi bảo hiểm tại CareConnect:
1. Bảo hiểm Y tế Nhà nước (BHYT):
- Chấp nhận thẻ BHYT điện tử qua ứng dụng VssID hoặc Căn cước công dân gắn chip (CCCD) thay thế thẻ BHYT giấy.
- Thanh toán đúng tuyến và hỗ trợ thông tuyến khám chữa bệnh theo đúng khung quy định hiện hành của Bộ Y tế và Bảo hiểm Xã hội Việt Nam.
2. Bảo lãnh viện phí trực tiếp (Direct Billing):
- CareConnect liên kết bảo lãnh viện phí ngoại trú và nội trú với hơn 25 công ty bảo hiểm hàng đầu: Bảo Việt, Dai-ichi Life, Prudential, Manulife, AIA, PVI, PTI, Generali, Liberty, Insmart...
- Thủ tục đơn giản: Người bệnh chỉ cần xuất trình Thẻ bảo hiểm cứng/app và CCCD tại quầy Lễ tân trước khi vào khám để được bảo lãnh trừ thẳng viện phí."
                },
                new KnowledgeChunk
                {
                    Id = "KB-POLICY-02",
                    Title = "Chế Độ Phân Luồng Khám Ưu Tiên (Priority Care)",
                    Category = "Chính Sách & Thanh Toán",
                    SourceDocument = "Quy chế Tiếp đón và Phục vụ Khách hàng CareConnect",
                    Keywords = new List<string> { "ưu tiên", "priority", "người già", "phụ nữ mang thai", "trẻ em", "xếp hàng" },
                    Content = @"CareConnect áp dụng phân luồng dịch vụ Khám Ưu Tiên (Priority Lane) cho các đối tượng sau:
1. Người cao tuổi từ 75 tuổi trở lên.
2. Phụ nữ đang mang thai từ tháng thứ 7 trở lên (hoặc thai kỳ nguy cơ cao có chỉ định bác sĩ).
3. Trẻ sơ sinh và trẻ nhỏ dưới 3 tuổi đang có triệu chứng mệt mỏi hoặc quấy khóc.
4. Người khuyết tật vận động, người có thương tật nặng.
Khi đến phòng khám, quý khách vui lòng thông báo với Lễ tân để được cấp số thứ tự ưu tiên và dẫn trực tiếp vào phòng khám mà không phải xếp hàng chờ đợi lâu."
                },
                new KnowledgeChunk
                {
                    Id = "KB-APP-01",
                    Title = "Quy Trình Đặt Lịch Khám & Tra Cứu Bệnh Án Điện Tử Trên CareConnect",
                    Category = "Hướng Dẫn Hệ Thống",
                    SourceDocument = "Tài liệu Hướng dẫn Người dùng Hệ thống CareConnect",
                    Keywords = new List<string> { "đặt lịch", "hẹn khám", "hồ sơ", "bệnh án", "đơn thuốc", "hướng dẫn", "tài khoản" },
                    Content = @"Hướng dẫn thao tác sử dụng cổng y tế điện tử CareConnect:
1. Đặt lịch khám:
- Đăng nhập tài khoản Bệnh nhân (hoặc chọn 'Đặt cho người thân' nếu đặt hộ cha mẹ, con cái).
- Chọn Chi nhánh phòng khám mong muốn, chọn Bác sĩ chuyên khoa, ngày khám và khung giờ còn trống (Slot).
- Điền mô tả triệu chứng sơ bộ hoặc tải kết quả xét nghiệm cũ (nếu có) rồi bấm 'Xác nhận đặt lịch'.
2. Tra cứu Hồ sơ bệnh án & Đơn thuốc:
- Toàn bộ kết luận chẩn đoán của bác sĩ, kết quả xét nghiệm cận lâm sàng và đơn thuốc điện tử được cập nhật tức thời vào mục 'Hồ Sơ Bệnh Án'.
- Bệnh nhân có thể xem lại lịch sử điều trị, đơn thuốc chi tiết và tải file PDF bệnh án bất cứ lúc nào."
                },
                new KnowledgeChunk
                {
                    Id = "KB-EMERG-01",
                    Title = "Quy Trình Xử Lý Dấu Hiệu Y Tế Nguy Hiểm & Cảnh Báo Khẩn Cấp (Red Flags)",
                    Category = "Chỉ Dẫn Y Khoa",
                    SourceDocument = "Phác đồ Cấp cứu Sơ bộ Ban đầu - CareConnect Emergency Protocol",
                    Keywords = new List<string> { "cấp cứu", "khẩn cấp", "đau ngực dữ dội", "đột quỵ", "khó thở", "115", "nguy hiểm", "red flags" },
                    Content = @"⚠️ CÁC DẤU HIỆU CẢNH BÁO NGUY HIỂM TÍNH MẠNG (RED FLAGS):
Khi người bệnh xuất hiện bất kỳ dấu hiệu nào sau đây, KHÔNG ĐƯỢC CHỜ ĐỢI hoặc tự điều trị tại nhà:
1. Đau thắt ngực dữ dội kéo dài trên 15 phút, vã mồ hôi lạnh, đau lan lên cằm, cổ hoặc cánh tay trái (Dấu hiệu Nhồi máu cơ tim cấp).
2. Dấu hiệu Đột quỵ (FAST): Méo miệng, lệch mặt, yếu hoặc liệt đột ngột một bên tay/chân, nói ngọng hoặc không nói được, nhìn mờ đột ngột.
3. Khó thở cấp tính dữ dội, tím tái môi đầu chi, thở rít hoặc co kéo cơ hô hấp.
4. Nôn ra máu đỏ tươi hoặc đại tiện phân đen như bã cà phê kèm chóng mặt ngất xỉu.
5. Co giật, chấn thương đầu nặng hoặc hôn mê mất tri giác.
HÀNH ĐỘNG CẦN THIẾT: Gọi ngay Cấp cứu 115 hoặc di chuyển tức thời đến khoa cấp cứu bệnh viện gần nhất!"
                }
            });
        }
        #endregion
    }
}
