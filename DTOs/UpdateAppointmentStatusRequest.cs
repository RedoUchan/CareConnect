using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class UpdateAppointmentStatusRequest
    {
        [Required(ErrorMessage = "Trạng thái (Status) là bắt buộc.")]
        [RegularExpression(@"^(Pending|Confirmed|CheckedIn|Completed|Cancelled)$", 
            ErrorMessage = "Trạng thái phải là một trong các giá trị: 'Pending', 'Confirmed', 'CheckedIn', 'Completed', 'Cancelled'.")]
        public string Status { get; set; } = string.Empty;

        // Vitals
        public string? BloodPressure { get; set; }
        public string? Temperature { get; set; }
        public string? Weight { get; set; }
        public string? HeartRate { get; set; }

        // Payment
        public string? PaymentMethod { get; set; }
        public string? PaymentTransactionId { get; set; }
    }
}
