using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class SubmitTestimonialRequest
    {
        [Required(ErrorMessage = "Vui lòng nhập họ và tên.")]
        [StringLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự.")]
        public string FullName { get; set; } = string.Empty;

        [StringLength(150, ErrorMessage = "Nghề nghiệp / địa chỉ không được vượt quá 150 ký tự.")]
        public string RoleOrJob { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vui lòng đánh giá số sao.")]
        [Range(1, 5, ErrorMessage = "Số sao đánh giá phải từ 1 đến 5.")]
        public int Rating { get; set; }

        [Required(ErrorMessage = "Vui lòng nhập nội dung đánh giá.")]
        [StringLength(1000, ErrorMessage = "Nội dung đánh giá không được vượt quá 1000 ký tự.")]
        public string Comment { get; set; } = string.Empty;
    }
}
