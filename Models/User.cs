namespace web.Models
{
    public class User
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Username { get; set; }                  // Tên đăng nhập
        public string Email { get; set; } = string.Empty;
        public string PasswordHash { get; set; } = string.Empty; // Được băm bằng BCrypt
        public string Role { get; set; } = string.Empty; // Giá trị: "Admin", "Doctor", "Patient", "Receptionist"

        // --- Thông tin mở rộng ---
        public string? PhoneNumber { get; set; }      // Số điện thoại
        public DateTime? DateOfBirth { get; set; }    // Ngày sinh (tính tuổi)
        public string? Address { get; set; }          // Địa chỉ nơi ở
        public string? Gender { get; set; }           // Giới tính: Nam / Nữ / Khác
        public string? BloodType { get; set; }        // Nhóm máu: A / B / AB / O
        public string? Specialization { get; set; }   // Chuyên khoa (chỉ dùng cho Doctor)
        public string? HospitalBranch { get; set; }   // Chi nhánh bệnh viện (chỉ dùng cho Doctor)
        public string? Degree { get; set; }           // Học vị / Học hàm (chỉ dùng cho Doctor)
        public string? PatientType { get; set; }      // Phân cấp đối tượng thanh toán: Service / Insurance
        public string? InsuranceCardNumber { get; set; } // Số thẻ BHYT
        public string? NationalId { get; set; }            // Số căn cước công dân (CCCD)
        public bool IsPriority { get; set; } = false;      // Đối tượng ưu tiên y tế
        public string? PriorityReason { get; set; }        // Lý do ưu tiên (Trẻ em, người già, khuyết tật...)
        public string ServiceTier { get; set; } = "Standard"; // Hạng dịch vụ: Standard / VIP
        public string? DeviceToken { get; set; }           // FCM Device Token phục vụ thông báo đẩy di động
        public string? Ethnicity { get; set; }        // Dân tộc
        public string? Occupation { get; set; }       // Nghề nghiệp
        public string? Nationality { get; set; }      // Quốc gia
        public string? Province { get; set; }         // Tỉnh/Thành phố
        public string? District { get; set; }         // Quận/Huyện
        public string? Ward { get; set; }             // Xã/Phường
        public string? AddressDetail { get; set; }     // Địa chỉ chi tiết
    }
}
