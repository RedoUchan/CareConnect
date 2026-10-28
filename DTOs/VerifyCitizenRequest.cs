using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    /// <summary>
    /// Yêu cầu xác minh thông tin hành chính công dân ở Bước 1.
    /// </summary>
    public class VerifyCitizenRequest
    {
        [Required(ErrorMessage = "Họ tên không được để trống.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "CCCD/CMND không được để trống.")]
        [RegularExpression(@"^\d{9}$|^\d{12}$", ErrorMessage = "Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.")]
        public string NationalId { get; set; } = string.Empty;

        [Required(ErrorMessage = "Số điện thoại không được để trống.")]
        public string PhoneNumber { get; set; } = string.Empty;

        [Required(ErrorMessage = "Ngày sinh không được để trống.")]
        public DateTime DateOfBirth { get; set; }
    }

    /// <summary>
    /// Kết quả xác minh thông tin hành chính công dân ở Bước 1.
    /// </summary>
    public class VerifyCitizenResult
    {
        public bool Success { get; set; }
        public string Message { get; set; } = string.Empty;
        public bool Exists { get; set; }
    }
}
