using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    /// <summary>
    /// Yêu cầu khôi phục mật khẩu tài khoản.
    /// </summary>
    public class ResetPasswordRequest
    {
        [Required(ErrorMessage = "Tên đăng nhập hoặc Số điện thoại không được để trống.")]
        public string AccountOrPhone { get; set; } = string.Empty;

        [Required(ErrorMessage = "Số CCCD/CMND không được để trống.")]
        public string NationalId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày sinh không được để trống.")]
        public DateTime DateOfBirth { get; set; }

        [Required(ErrorMessage = "Mật khẩu mới không được để trống.")]
        [MinLength(6, ErrorMessage = "Mật khẩu mới phải có tối thiểu 6 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mật khẩu mới không được vượt quá 50 ký tự.")]
        public string NewPassword { get; set; } = string.Empty;
    }
}
