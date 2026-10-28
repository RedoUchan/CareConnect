using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class UpdateUserRequest
    {
        [Required(ErrorMessage = "Họ và tên không được để trống.")]
        [MaxLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự.")]
        public string FullName { get; set; } = string.Empty;

        [Required(ErrorMessage = "Email không được để trống.")]
        [EmailAddress(ErrorMessage = "Định dạng Email không hợp lệ.")]
        [MaxLength(150, ErrorMessage = "Email không được vượt quá 150 ký tự.")]
        public string Email { get; set; } = string.Empty;

        public string? Password { get; set; } // Nếu không trống thì cập nhật mật khẩu

        [MaxLength(20)]
        public string? PhoneNumber { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(300)]
        public string? Address { get; set; }

        [MaxLength(10)]
        public string? Gender { get; set; }

        [MaxLength(5)]
        public string? BloodType { get; set; }

        // Bác sĩ
        [MaxLength(100)]
        public string? Specialization { get; set; }

        [MaxLength(150)]
        public string? HospitalBranch { get; set; }

        [MaxLength(50)]
        public string? Degree { get; set; }

        // Bệnh nhân
        [MaxLength(20)]
        public string? PatientType { get; set; }

        [MaxLength(30)]
        public string? InsuranceCardNumber { get; set; }

        [MaxLength(12)]
        public string? NationalId { get; set; }

        public bool? IsPriority { get; set; } // Đối tượng ưu tiên y tế

        [MaxLength(150)]
        public string? PriorityReason { get; set; } // Lý do ưu tiên

        [MaxLength(50)]
        public string? ServiceTier { get; set; } // Hạng dịch vụ: Standard / VIP

        [MaxLength(50)]
        public string? Ethnicity { get; set; } // Dân tộc

        [MaxLength(100)]
        public string? Occupation { get; set; } // Nghề nghiệp

        [MaxLength(50)]
        public string? Nationality { get; set; } // Quốc gia

        [MaxLength(100)]
        public string? Province { get; set; } // Tỉnh/Thành phố

        [MaxLength(100)]
        public string? District { get; set; } // Quận/Huyện

        [MaxLength(100)]
        public string? Ward { get; set; } // Xã/Phường

        [MaxLength(200)]
        public string? AddressDetail { get; set; } // Địa chỉ chi tiết
    }
}
