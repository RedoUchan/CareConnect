using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class CreateAppointmentRequest
    {
        [Required(ErrorMessage = "Mã bác sĩ (DoctorId) là bắt buộc.")]
        public int DoctorId { get; set; }

        [Required(ErrorMessage = "Ngày khám (AppointmentDate) là bắt buộc.")]
        public DateTime AppointmentDate { get; set; }

        [Required(ErrorMessage = "Ca khám (TimeSlot) là bắt buộc.")]
        [RegularExpression(@"^(?:0[89]|1[0-7]):00\s*-\s*(?:0[9]|1[0-8]):00$", 
            ErrorMessage = "Ca khám phải theo định dạng tròn giờ, ví dụ: '08:00 - 09:00', '14:00 - 15:00'.")]
        public string TimeSlot { get; set; } = string.Empty;

        [MaxLength(500, ErrorMessage = "Triệu chứng không được vượt quá 500 ký tự.")]
        public string Symptoms { get; set; } = string.Empty;

        public int? PatientId { get; set; } // Dành cho Admin/Lễ tân đặt hộ bệnh nhân

        [MaxLength(50)]
        public string? ServiceTier { get; set; } // Hạng dịch vụ khám: Standard / VIP

        public bool? IsPriority { get; set; } // Ghi đè trạng thái ưu tiên y tế

        [MaxLength(150)]
        public string? PriorityReason { get; set; } // Lý do ưu tiên y tế

        public string? AiChatHistory { get; set; } // Lịch sử hội thoại với AI dạng JSON string
    }
}
