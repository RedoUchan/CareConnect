using System;

namespace web.DTOs
{
    public class AppointmentDto
    {
        public int AppointmentId { get; set; }
        
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientEmail { get; set; } = string.Empty;
        public string PatientPhone { get; set; } = string.Empty;
        public DateTime? PatientDob { get; set; }
        public string PatientGender { get; set; } = string.Empty;
        public string PatientBloodType { get; set; } = string.Empty;
        public string PatientAddress { get; set; } = string.Empty;
        public string PatientInsuranceCardNumber { get; set; } = string.Empty;
        public string PatientNationalId { get; set; } = string.Empty;
        public string PatientType { get; set; } = string.Empty;

        public int DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string DoctorEmail { get; set; } = string.Empty;

        public DateTime AppointmentDate { get; set; }
        public string TimeSlot { get; set; } = string.Empty;
        public string Symptoms { get; set; } = string.Empty;
        public string Status { get; set; } = string.Empty;
        public string? HospitalBranch { get; set; }
        
        // Vitals
        public string? BloodPressure { get; set; }
        public string? Temperature { get; set; }
        public string? Weight { get; set; }
        public string? HeartRate { get; set; }

        // Payment
        public string? PaymentMethod { get; set; }
        public string? PaymentTransactionId { get; set; }
        
        public bool IsEmergency { get; set; }

        public bool IsPriority { get; set; } // Đối tượng ưu tiên y tế
        public string? PriorityReason { get; set; } // Lý do ưu tiên
        public string ServiceTier { get; set; } = "Standard"; // Hạng dịch vụ khám: Standard / VIP
        public decimal CalculatedFee { get; set; } // Phí khám thực tế đã tính toán
        
        public string? AiChatHistory { get; set; } // Lịch sử hội thoại với AI dạng JSON string
        
        public DateTime CreatedAt { get; set; }
    }
}
