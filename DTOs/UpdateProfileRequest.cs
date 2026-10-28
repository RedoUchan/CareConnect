using System;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class UpdateProfileRequest
    {
        [Required(ErrorMessage = "Họ và tên không được để trống.")]
        [MaxLength(100, ErrorMessage = "Họ và tên không được vượt quá 100 ký tự.")]
        public string FullName { get; set; } = string.Empty;

        [MaxLength(20, ErrorMessage = "Số điện thoại không được vượt quá 20 ký tự.")]
        public string? PhoneNumber { get; set; }

        public DateTime? DateOfBirth { get; set; }

        [MaxLength(300, ErrorMessage = "Địa chỉ không được vượt quá 300 ký tự.")]
        public string? Address { get; set; }

        [MaxLength(10, ErrorMessage = "Giới tính không được vượt quá 10 ký tự.")]
        public string? Gender { get; set; }

        [MaxLength(5, ErrorMessage = "Nhóm máu không được vượt quá 5 ký tự.")]
        public string? BloodType { get; set; }

        [MaxLength(100, ErrorMessage = "Chuyên khoa không được vượt quá 100 ký tự.")]
        public string? Specialization { get; set; }

        [MaxLength(150, ErrorMessage = "Chi nhánh không được vượt quá 150 ký tự.")]
        public string? HospitalBranch { get; set; }

        [MaxLength(50, ErrorMessage = "Học hàm không được vượt quá 50 ký tự.")]
        public string? Degree { get; set; }          // Học vị / Học hàm (Doctor)

        [MaxLength(20, ErrorMessage = "Loại đối tượng không được vượt quá 20 ký tự.")]
        public string? PatientType { get; set; }     // Service / Insurance (Patient)

        [MaxLength(30, ErrorMessage = "Số thẻ BHYT không được vượt quá 30 ký tự.")]
        public string? InsuranceCardNumber { get; set; } // Số thẻ BHYT (Patient)

        [MaxLength(12, ErrorMessage = "Số CCCD không được vượt quá 12 ký tự.")]
        public string? NationalId { get; set; } // Số căn cước công dân (CCCD)

        public bool? IsPriority { get; set; } // Đối tượng ưu tiên y tế

        [MaxLength(150, ErrorMessage = "Lý do ưu tiên không được vượt quá 150 ký tự.")]
        public string? PriorityReason { get; set; } // Lý do ưu tiên

        [MaxLength(50, ErrorMessage = "Hạng dịch vụ không được vượt quá 50 ký tự.")]
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
