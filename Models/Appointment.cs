using System;

namespace web.Models
{
    public class Appointment
    {
        public int AppointmentId { get; set; }
        
        public int PatientId { get; set; }
        public User Patient { get; set; } = null!;

        public int DoctorId { get; set; }
        public User Doctor { get; set; } = null!;

        public DateTime AppointmentDate { get; set; }
        public string TimeSlot { get; set; } = string.Empty; // Ví dụ: "08:00 - 09:00"
        public string Symptoms { get; set; } = string.Empty;
        
        // Trạng thái: Pending, Confirmed, Completed, Cancelled
        public string Status { get; set; } = "Pending";
        
        public string? HospitalBranch { get; set; } // Chi nhánh đặt khám
        
        // Chỉ số sinh hiệu (Vitals)
        public string? BloodPressure { get; set; }
        public string? Temperature { get; set; }
        public string? Weight { get; set; }
        public string? HeartRate { get; set; }

        // Thanh toán khám bệnh
        public string? PaymentMethod { get; set; }
        public string? PaymentTransactionId { get; set; }

        public bool IsEmergency { get; set; } = false;
        public bool IsPriority { get; set; } = false;      // Đối tượng ưu tiên y tế
        public string? PriorityReason { get; set; }        // Lý do ưu tiên (Trẻ em, người cao tuổi,...)
        public string ServiceTier { get; set; } = "Standard"; // Hạng dịch vụ khám: Standard / VIP
        public decimal CalculatedFee { get; set; } = 0;    // Phí khám tính toán của ca này
        
        public string? AiChatHistory { get; set; } // Lịch sử cuộc hội thoại sàng lọc triệu chứng bằng AI

        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
