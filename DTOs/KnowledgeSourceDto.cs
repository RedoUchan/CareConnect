namespace web.DTOs
{
    public class KnowledgeSourceDto
    {
        public string Id { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public string SourceDocument { get; set; } = string.Empty;
        public double Confidence { get; set; }
        public string Snippet { get; set; } = string.Empty;
    }
}
