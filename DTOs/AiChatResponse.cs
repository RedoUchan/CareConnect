using System.Collections.Generic;

namespace web.DTOs
{
    public class AiChatResponse
    {
        public string Response { get; set; } = string.Empty;
        public string? SuggestedSpecialization { get; set; }
        public List<string> QuickReplies { get; set; } = new List<string>();

        /// <summary>
        /// Đánh dấu câu trả lời được bảo chứng bởi dữ liệu tri thức nội bộ RAG
        /// </summary>
        public bool IsRAGGrounded { get; set; } = false;

        /// <summary>
        /// Danh sách tài liệu/nguồn trích dẫn được kiểm duyệt từ CareConnect Knowledge Base
        /// </summary>
        public List<KnowledgeSourceDto> GroundingSources { get; set; } = new List<KnowledgeSourceDto>();
    }
}
