using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class RescheduleAppointmentRequest
    {
        [Required(ErrorMessage = "Ngày khám mới là bắt buộc.")]
        public DateTime AppointmentDate { get; set; }

        [Required(ErrorMessage = "Ca khám mới là bắt buộc.")]
        [RegularExpression(@"^(?:0[89]|1[0-7]):00\s*-\s*(?:0[9]|1[0-8]):00$", 
            ErrorMessage = "Ca khám phải theo định dạng tròn giờ, ví dụ: '08:00 - 09:00', '14:00 - 15:00'.")]
        public string TimeSlot { get; set; } = string.Empty;
    }
}
