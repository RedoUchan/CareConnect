using System;

namespace web.Models
{
    public class LabRequest
    {
        public int LabRequestId { get; set; }

        public int MedicalRecordId { get; set; }
        public MedicalRecord MedicalRecord { get; set; } = null!;

        public string LabType { get; set; } = string.Empty; // Xét nghiệm máu, Siêu âm ổ bụng, Chụp X-quang...
        public decimal Fee { get; set; }
        public string Status { get; set; } = "Pending"; // Pending, Completed
        public string Results { get; set; } = string.Empty; // Kết quả chẩn đoán
        public string? ImageUrl { get; set; } // Link ảnh chẩn đoán/xét nghiệm (nếu có)
        
        public DateTime RecordDate { get; set; } = DateTime.UtcNow;
    }
}
