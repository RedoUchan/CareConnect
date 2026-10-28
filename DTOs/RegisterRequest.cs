using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class RegisterRequest
    {
        [Required(ErrorMessage = "Họ và tên không được để trống.")]
        [MaxLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự.")]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(100, ErrorMessage = "Tên đăng nhập không được vượt quá 100 ký tự.")]
        [RegularExpression(@"^[a-zA-Z0-9_.]*$", ErrorMessage = "Tên đăng nhập chỉ được chứa chữ cái, số, dấu gạch dưới và dấu chấm.")]
        public string? Username { get; set; }

        private string? _email;
        [EmailAddress(ErrorMessage = "Định dạng Email không hợp lệ.")]
        [MaxLength(150, ErrorMessage = "Email không được vượt quá 150 ký tự.")]
        public string? Email
        {
            get => _email;
            set => _email = string.IsNullOrWhiteSpace(value) ? null : value;
        }

        [Required(ErrorMessage = "Mật khẩu không được để trống.")]
        [MinLength(6, ErrorMessage = "Mật khẩu phải có độ dài tối thiểu là 6 ký tự.")]
        [MaxLength(50, ErrorMessage = "Mật khẩu không được vượt quá 50 ký tự.")]
        public string Password { get; set; } = string.Empty;

        [Required(ErrorMessage = "Vai trò (Role) không được để trống.")]
        [RegularExpression(@"^(Patient|Doctor|Receptionist)$", ErrorMessage = "Vai trò không hợp lệ. Chỉ chấp nhận 'Patient', 'Doctor' hoặc 'Receptionist'.")]
        public string Role { get; set; } = string.Empty;

        // --- Thông tin bổ sung (tùy chọn) ---
        [MaxLength(20)]
        public string? PhoneNumber { get; set; }    // Số điện thoại

        public DateTime? DateOfBirth { get; set; }  // Ngày sinh

        [MaxLength(300)]
        public string? Address { get; set; }         // Địa chỉ

        [MaxLength(10)]
        public string? Gender { get; set; }          // Giới tính: Nam / Nữ / Khác

        [MaxLength(5)]
        public string? BloodType { get; set; }       // Nhóm máu: A / B / AB / O

        [MaxLength(100)]
        public string? Specialization { get; set; }  // Chuyên khoa (Doctor)

        [MaxLength(150)]
        public string? HospitalBranch { get; set; }  // Chi nhánh bệnh viện (Doctor)

        [MaxLength(50)]
        public string? Degree { get; set; }          // Học vị / Học hàm (Doctor)

        [MaxLength(20)]
        public string? PatientType { get; set; }     // Phân cấp đối tượng (Patient)

        [MaxLength(30)]
        public string? InsuranceCardNumber { get; set; } // Số thẻ BHYT (Patient)

        [MaxLength(12)]
        public string? NationalId { get; set; } // Số căn cước công dân (CCCD)

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
