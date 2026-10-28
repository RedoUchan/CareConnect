using System;

namespace web.DTOs
{
    public class LabRequestDto
    {
        public int LabRequestId { get; set; }
        public string LabType { get; set; } = string.Empty;
        public decimal Fee { get; set; }
        public string Status { get; set; } = "Pending";
        public string Results { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
        public DateTime RecordDate { get; set; }
    }
}
