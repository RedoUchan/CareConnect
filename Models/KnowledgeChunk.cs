using System.Collections.Generic;

namespace web.Models
{
    /// <summary>
    /// Đơn vị phân đoạn ngữ nghĩa (Chunk) của kho dữ liệu tri thức nội bộ CareConnect
    /// </summary>
    public class KnowledgeChunk
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty; // Packages, Preparation, Branches, Policies, MedicalGuidelines
        public string Content { get; set; } = string.Empty;
        public string SourceDocument { get; set; } = string.Empty;
        public List<string> Keywords { get; set; } = new();
        public Dictionary<string, double>? VectorWeights { get; set; }
    }
}
