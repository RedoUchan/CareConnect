using System;

namespace web.Models
{
    public class Testimonial
    {
        public int TestimonialId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string RoleOrJob { get; set; } = string.Empty;
        public int Rating { get; set; }
        public string Comment { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        // Quan hệ tùy chọn với người dùng đã đăng nhập trong hệ thống
        public int? UserId { get; set; }
        public User? User { get; set; }
    }
}
