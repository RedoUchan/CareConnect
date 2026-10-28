using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    /// <summary>
    /// Yêu cầu đăng nhập tài khoản.
    /// </summary>
    public class LoginRequest
    {
        /// <summary>
        /// Địa chỉ Email của người dùng (ví dụ: patient@hospital.com).
        /// </summary>
        [Required(ErrorMessage = "Tên đăng nhập hoặc Email không được để trống.")]
        public string Email { get; set; } = string.Empty;

        /// <summary>
        /// Mật khẩu tài khoản (mặc định: 123456).
        /// </summary>
        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        public string Password { get; set; } = string.Empty;
    }
}
