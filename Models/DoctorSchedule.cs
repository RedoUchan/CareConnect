using System;

namespace web.Models
{
    public class DoctorSchedule
    {
        public int DoctorScheduleId { get; set; }
        
        public int DoctorId { get; set; }
        public User? Doctor { get; set; }
        
        public DateTime AvailableDate { get; set; } // Ngày rảnh trực (Date only)
        public string TimeSlot { get; set; } = string.Empty; // Khung giờ trực rảnh, e.g. "08:00 - 09:00"
    }
}
