using System;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.IdentityModel.Tokens;
using web.Data;
using web.DTOs;
using web.Models;

namespace web.Services
{
    public class AuthService : IAuthService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;

        public AuthService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
        }

        public async Task<LoginResponse?> LoginAsync(LoginRequest request)
        {
            // 1. Tìm User trong Database theo Tên đăng nhập hoặc Email
            var query = request.Email.Trim().ToLower();
            var user = await _context.Users
                .FirstOrDefaultAsync(u => (u.Username != null && u.Username.ToLower() == query) || u.Email.ToLower() == query);

            if (user == null)
            {
                return null;
            }

            // 2. Xác thực mật khẩu với BCrypt
            bool isPasswordValid = BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash);
            if (!isPasswordValid)
            {
                return null;
            }

            // 3. Tạo JWT Token
            var tokenHandler = new JwtSecurityTokenHandler();
            
            var jwtKey = _configuration["Jwt:Key"] ?? throw new InvalidOperationException("JWT Secret Key is not configured.");
            var key = Encoding.UTF8.GetBytes(jwtKey);

            // Payload (Claims) chứa UserId, Email, Role (cả dạng chuẩn và dạng custom để tương thích tối đa)
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.UserId.ToString()),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role),
                new Claim("UserId", user.UserId.ToString()),
                new Claim("Email", user.Email),
                new Claim("Role", user.Role),
                new Claim("FullName", user.FullName)
            };

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Subject = new ClaimsIdentity(claims),
                Expires = DateTime.UtcNow.AddDays(1),
                Issuer = _configuration["Jwt:Issuer"],
                Audience = _configuration["Jwt:Audience"],
                SigningCredentials = new SigningCredentials(new SymmetricSecurityKey(key), SecurityAlgorithms.HmacSha256Signature)
            };

            var token = tokenHandler.CreateToken(tokenDescriptor);
            var tokenString = tokenHandler.WriteToken(token);

            // 4. Trả về response theo đúng yêu cầu
            return new LoginResponse
            {
                Token = tokenString,
                Role = user.Role,
                ExpiresIn = 86400, // 1 ngày tính bằng giây
                UserId = user.UserId,
                Email = user.Email,
                FullName = user.FullName
            };
        }

        public async Task<User> RegisterAsync(RegisterRequest request)
        {
            // Kiểm tra Ngày sinh và đối soát CCCD 12 số
            if (request.DateOfBirth.HasValue)
            {
                var dob = request.DateOfBirth.Value;
                var nationalId = request.NationalId?.Trim();

                if (dob.Date > DateTime.UtcNow.Date)
                {
                    throw new ArgumentException("Ngày sinh không hợp lệ (không được ở tương lai).");
                }
                if (dob.Year < 1900)
                {
                    throw new ArgumentException("Ngày sinh không hợp lệ (phải từ năm 1900 trở đi).");
                }

                if (!string.IsNullOrEmpty(nationalId) && nationalId.Length == 12)
                {
                    // 1. Kiểm tra 3 chữ số đầu (Mã tỉnh khai sinh)
                    string provinceCode = nationalId.Substring(0, 3);
                    var validProvinces = new System.Collections.Generic.HashSet<string>
                    {
                        "001", "002", "004", "006", "008", "010", "011", "012", "014", "015",
                        "017", "019", "020", "022", "024", "025", "026", "027", "030", "031",
                        "033", "034", "035", "036", "037", "038", "040", "042", "044", "045",
                        "046", "048", "049", "051", "052", "054", "056", "058", "060", "062",
                        "064", "066", "067", "068", "070", "072", "074", "075", "077", "079",
                        "080", "082", "083", "084", "086", "087", "089", "091", "092", "093",
                        "094", "095", "096"
                    };
                    if (!validProvinces.Contains(provinceCode))
                    {
                        throw new ArgumentException("Không xác thực được thông tin. Vui lòng kiểm tra lại!");
                    }

                    // 2. Kiểm tra chữ số thứ 4 (Mã thế kỷ sinh & giới tính)
                    int centuryCode = nationalId[3] - '0';
                    int birthYear = dob.Year;
                    int expectedCentury1 = -1; // Nam
                    int expectedCentury2 = -1; // Nữ

                    if (birthYear >= 1900 && birthYear <= 1999)
                    {
                        expectedCentury1 = 0;
                        expectedCentury2 = 1;
                    }
                    else if (birthYear >= 2000 && birthYear <= 2099)
                    {
                        expectedCentury1 = 2;
                        expectedCentury2 = 3;
                    }
                    else if (birthYear >= 2100 && birthYear <= 2199)
                    {
                        expectedCentury1 = 4;
                        expectedCentury2 = 5;
                    }
                    else if (birthYear >= 2200 && birthYear <= 2299)
                    {
                        expectedCentury1 = 6;
                        expectedCentury2 = 7;
                    }
                    else if (birthYear >= 1800 && birthYear <= 1899)
                    {
                        expectedCentury1 = 8;
                        expectedCentury2 = 9;
                    }

                    if (centuryCode != expectedCentury1 && centuryCode != expectedCentury2)
                    {
                        throw new ArgumentException("Không xác thực được thông tin. Vui lòng kiểm tra lại!");
                    }

                    // 3. Kiểm tra chữ số thứ 5 và 6 (Mã năm sinh)
                    string birthYearLastTwo = (birthYear % 100).ToString("D2");
                    string cccdYearCode = nationalId.Substring(4, 2);
                    if (cccdYearCode != birthYearLastTwo)
                    {
                        throw new ArgumentException("Không xác thực được thông tin. Vui lòng kiểm tra lại!");
                    }
                }
            }

            // Kiểm tra và chuẩn hóa Tên đăng nhập. Nếu rỗng (Trường hợp Lễ tân tiếp đón walk-in), tự sinh unique username
            string username = string.IsNullOrEmpty(request.Username)
                ? "cc_" + (request.PhoneNumber?.Trim() ?? request.NationalId?.Trim() ?? Guid.NewGuid().ToString("N").Substring(0, 8))
                : request.Username.Trim().ToLower();

            // Nếu người dùng cung cấp Username tùy chỉnh, kiểm tra trùng lặp
            if (string.IsNullOrEmpty(request.Username) == false)
            {
                bool usernameExists = await _context.Users
                    .AnyAsync(u => u.Username != null && u.Username.ToLower() == username);

                if (usernameExists)
                {
                    throw new ArgumentException("Tên đăng nhập này đã được sử dụng bởi một tài khoản khác.");
                }
            }

            // Nếu Email trống, tự động gán email định danh theo tên đăng nhập
            string email = string.IsNullOrEmpty(request.Email) 
                ? $"{username}@careconnect.local" 
                : request.Email.Trim().ToLower();

            // Kiểm tra Email đã tồn tại chưa
            bool emailExists = await _context.Users
                .AnyAsync(u => u.Email.ToLower() == email);

            if (emailExists)
            {
                throw new ArgumentException("Email này đã được sử dụng bởi một tài khoản khác.");
            }

            // Tự động xác định độ ưu tiên dựa trên độ tuổi
            bool isPriority = request.IsPriority ?? false;
            string? priorityReason = request.PriorityReason?.Trim();
            if (request.DateOfBirth.HasValue)
            {
                var age = DateTime.UtcNow.Year - request.DateOfBirth.Value.Year;
                if (request.DateOfBirth.Value.Date > DateTime.UtcNow.AddYears(-age).Date) age--;

                if (age < 6)
                {
                    isPriority = true;
                    priorityReason = string.IsNullOrEmpty(priorityReason) ? "Trẻ em dưới 6 tuổi" : priorityReason;
                }
                else if (age >= 75)
                {
                    isPriority = true;
                    priorityReason = string.IsNullOrEmpty(priorityReason) ? "Người cao tuổi (>= 75 tuổi)" : priorityReason;
                }
            }

            var cleanAddress = request.Address?.Trim();
            if (string.IsNullOrEmpty(cleanAddress))
            {
                var parts = new System.Collections.Generic.List<string>();
                if (!string.IsNullOrEmpty(request.AddressDetail)) parts.Add(request.AddressDetail.Trim());
                if (!string.IsNullOrEmpty(request.Ward)) parts.Add(request.Ward.Trim());
                if (!string.IsNullOrEmpty(request.District)) parts.Add(request.District.Trim());
                if (!string.IsNullOrEmpty(request.Province)) parts.Add(request.Province.Trim());
                if (parts.Count > 0)
                {
                    cleanAddress = string.Join(", ", parts);
                }
            }

            // KIỂM TRA ĐỐI SOÁT HỒ SƠ VÃNG LAI ĐÃ CÓ TRONG HỆ THỐNG
            User? existingUser = null;
            if (!string.IsNullOrEmpty(request.NationalId))
            {
                existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.NationalId == request.NationalId.Trim());
            }
            if (existingUser == null && !string.IsNullOrEmpty(request.PhoneNumber))
            {
                existingUser = await _context.Users
                    .FirstOrDefaultAsync(u => u.PhoneNumber == request.PhoneNumber.Trim());
            }

            if (existingUser != null)
            {
                // Kiểm tra xem hồ sơ này đã có tài khoản online được đăng ký trước đó chưa
                bool hasAccount = existingUser.Username != null && !existingUser.Username.StartsWith("cc_");
                if (hasAccount)
                {
                    throw new ArgumentException("Số CCCD/Số điện thoại này đã được đăng ký tài khoản thành viên. Vui lòng quay lại đăng nhập!");
                }

                // Tiến hành Cập nhật thông tin tài khoản thành viên online lên hồ sơ vãng lai đang có để đồng bộ bệnh án
                existingUser.FullName = request.FullName.Trim();
                existingUser.Username = username;
                existingUser.Email = email;
                existingUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
                existingUser.PhoneNumber = request.PhoneNumber?.Trim();
                existingUser.DateOfBirth = request.DateOfBirth;
                existingUser.Address = cleanAddress;
                existingUser.Gender = request.Gender?.Trim();
                existingUser.BloodType = request.BloodType?.Trim();
                existingUser.Specialization = request.Specialization?.Trim();
                existingUser.HospitalBranch = request.HospitalBranch?.Trim();
                existingUser.Degree = request.Degree?.Trim();
                existingUser.PatientType = request.PatientType?.Trim() ?? "Service";
                existingUser.InsuranceCardNumber = request.InsuranceCardNumber?.Trim();
                existingUser.IsPriority = isPriority;
                existingUser.PriorityReason = priorityReason;
                existingUser.ServiceTier = request.ServiceTier?.Trim() ?? "Standard";
                existingUser.Ethnicity = request.Ethnicity?.Trim();
                existingUser.Occupation = request.Occupation?.Trim();
                existingUser.Nationality = request.Nationality?.Trim();
                existingUser.Province = request.Province?.Trim();
                existingUser.District = request.District?.Trim();
                existingUser.Ward = request.Ward?.Trim();
                existingUser.AddressDetail = request.AddressDetail?.Trim();

                await _context.SaveChangesAsync();
                return existingUser;
            }

            // Nếu không trùng hồ sơ nào, tạo User mới bình thường
            var user = new User
            {
                FullName        = request.FullName.Trim(),
                Username        = username,
                Email           = email,
                PasswordHash    = BCrypt.Net.BCrypt.HashPassword(request.Password),
                Role            = request.Role,
                PhoneNumber     = request.PhoneNumber?.Trim(),
                DateOfBirth     = request.DateOfBirth,
                Address         = cleanAddress,
                Gender          = request.Gender?.Trim(),
                BloodType       = request.BloodType?.Trim(),
                Specialization  = request.Specialization?.Trim(),
                HospitalBranch  = request.HospitalBranch?.Trim(),
                Degree          = request.Degree?.Trim(),
                PatientType     = request.PatientType?.Trim() ?? "Service",
                InsuranceCardNumber = request.InsuranceCardNumber?.Trim(),
                NationalId      = request.NationalId?.Trim(),
                IsPriority      = isPriority,
                PriorityReason  = priorityReason,
                ServiceTier     = request.ServiceTier?.Trim() ?? "Standard",
                Ethnicity       = request.Ethnicity?.Trim(),
                Occupation      = request.Occupation?.Trim(),
                Nationality     = request.Nationality?.Trim(),
                Province        = request.Province?.Trim(),
                District        = request.District?.Trim(),
                Ward            = request.Ward?.Trim(),
                AddressDetail   = request.AddressDetail?.Trim()
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            return user;
        }

        public async Task<IEnumerable<DoctorDto>> GetDoctorsAsync()
        {
            return await _context.Users
                .Where(u => u.Role == "Doctor")
                .Select(u => new DoctorDto
                {
                    UserId = u.UserId,
                    FullName = u.FullName,
                    Specialization = u.Specialization,
                    HospitalBranch = u.HospitalBranch
                })
                .ToListAsync();
        }

        public async Task<User?> GetProfileAsync(int userId)
        {
            return await _context.Users.FindAsync(userId);
        }

        public async Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request)
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                return false;
            }

            user.FullName = request.FullName.Trim();
            user.PhoneNumber = request.PhoneNumber?.Trim();
            user.DateOfBirth = request.DateOfBirth;
            user.Address = request.Address?.Trim();
            user.Gender = request.Gender?.Trim();
            user.BloodType = request.BloodType?.Trim();
            if (user.Role == "Doctor")
            {
                if (request.Specialization != null)
                {
                    user.Specialization = request.Specialization.Trim();
                }
                if (request.HospitalBranch != null)
                {
                    user.HospitalBranch = request.HospitalBranch.Trim();
                }
                if (request.Degree != null)
                {
                    user.Degree = request.Degree.Trim();
                }
            }
            else if (user.Role == "Patient")
            {
                if (request.PatientType != null)
                {
                    user.PatientType = request.PatientType.Trim();
                }
                else if (request.InsuranceCardNumber != null)
                {
                    // Tự động phân loại đối tượng y tế khi cập nhật từ Mobile Client (không gửi PatientType trực tiếp)
                    user.PatientType = string.IsNullOrEmpty(request.InsuranceCardNumber) ? "Service" : "Insurance";
                }

                if (request.InsuranceCardNumber != null)
                {
                    user.InsuranceCardNumber = request.InsuranceCardNumber.Trim();
                }
                if (request.IsPriority != null)
                {
                    user.IsPriority = request.IsPriority.Value;
                }
                if (request.PriorityReason != null)
                {
                    user.PriorityReason = request.PriorityReason.Trim();
                }
                if (request.ServiceTier != null)
                {
                    user.ServiceTier = request.ServiceTier.Trim();
                }

                // Tự động tính toán lại cờ ưu tiên theo độ tuổi nếu tuổi thay đổi hoặc chưa thiết lập
                if (user.DateOfBirth.HasValue)
                {
                    var age = DateTime.UtcNow.Year - user.DateOfBirth.Value.Year;
                    if (user.DateOfBirth.Value.Date > DateTime.UtcNow.AddYears(-age).Date) age--;

                    if (age < 6)
                    {
                        user.IsPriority = true;
                        user.PriorityReason = string.IsNullOrEmpty(user.PriorityReason) ? "Trẻ em dưới 6 tuổi" : user.PriorityReason;
                    }
                    else if (age >= 75)
                    {
                        user.IsPriority = true;
                        user.PriorityReason = string.IsNullOrEmpty(user.PriorityReason) ? "Người cao tuổi (>= 75 tuổi)" : user.PriorityReason;
                    }
                }
            }
            // Cập nhật CCCD cho mọi vai trò (Patient có CCCD, Receptionist cũng có)
            if (request.NationalId != null)
            {
                user.NationalId = request.NationalId.Trim();
            }

            if (request.Ethnicity != null) user.Ethnicity = request.Ethnicity.Trim();
            if (request.Occupation != null) user.Occupation = request.Occupation.Trim();
            if (request.Nationality != null) user.Nationality = request.Nationality.Trim();
            if (request.AddressDetail != null) user.AddressDetail = request.AddressDetail.Trim();
            if (request.Ward != null) user.Ward = request.Ward.Trim();
            if (request.District != null) user.District = request.District.Trim();
            if (request.Province != null) user.Province = request.Province.Trim();

            // Tái cấu trúc địa chỉ tự động nếu các thành phần địa chỉ được cập nhật
            if (request.AddressDetail != null || request.Ward != null || request.District != null || request.Province != null)
            {
                var parts = new System.Collections.Generic.List<string>();
                if (!string.IsNullOrEmpty(user.AddressDetail)) parts.Add(user.AddressDetail);
                if (!string.IsNullOrEmpty(user.Ward)) parts.Add(user.Ward);
                if (!string.IsNullOrEmpty(user.District)) parts.Add(user.District);
                if (!string.IsNullOrEmpty(user.Province)) parts.Add(user.Province);
                if (parts.Count > 0)
                {
                    user.Address = string.Join(", ", parts);
                }
            }
            else if (request.Address != null)
            {
                user.Address = request.Address.Trim();
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<VerifyCitizenResult> VerifyCitizenAsync(VerifyCitizenRequest request)
        {
            var nationalId = request.NationalId.Trim();
            var phone = request.PhoneNumber.Trim();

            // Kiểm tra Ngày sinh hợp lý
            var today = DateTime.UtcNow.Date;
            if (request.DateOfBirth.Date > today)
            {
                return new VerifyCitizenResult
                {
                    Success = false,
                    Message = "Ngày sinh không hợp lệ (không được nằm trong tương lai)."
                };
            }
            if (request.DateOfBirth.Year < 1900)
            {
                return new VerifyCitizenResult
                {
                    Success = false,
                    Message = "Ngày sinh không hợp lệ (phải từ năm 1900 trở đi)."
                };
            }

            // Đối soát cấu trúc thẻ CCCD 12 số gắn chip theo quy định của Bộ Công An
            if (nationalId.Length == 12)
            {
                // 1. Kiểm tra 3 chữ số đầu (Mã tỉnh khai sinh)
                string provinceCode = nationalId.Substring(0, 3);
                var validProvinces = new System.Collections.Generic.HashSet<string>
                {
                    "001", "002", "004", "006", "008", "010", "011", "012", "014", "015",
                    "017", "019", "020", "022", "024", "025", "026", "027", "030", "031",
                    "033", "034", "035", "036", "037", "038", "040", "042", "044", "045",
                    "046", "048", "049", "051", "052", "054", "056", "058", "060", "062",
                    "064", "066", "067", "068", "070", "072", "074", "075", "077", "079",
                    "080", "082", "083", "084", "086", "087", "089", "091", "092", "093",
                    "094", "095", "096"
                };
                if (!validProvinces.Contains(provinceCode))
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Không xác thực được thông tin. Vui lòng kiểm tra lại!"
                    };
                }

                // 2. Kiểm tra chữ số thứ 4 (Mã thế kỷ sinh & giới tính)
                int centuryCode = nationalId[3] - '0';
                int birthYear = request.DateOfBirth.Year;
                int expectedCentury1 = -1; // Mã thế kỷ ứng với Nam
                int expectedCentury2 = -1; // Mã thế kỷ ứng với Nữ

                if (birthYear >= 1900 && birthYear <= 1999)
                {
                    expectedCentury1 = 0;
                    expectedCentury2 = 1;
                }
                else if (birthYear >= 2000 && birthYear <= 2099)
                {
                    expectedCentury1 = 2;
                    expectedCentury2 = 3;
                }
                else if (birthYear >= 2100 && birthYear <= 2199)
                {
                    expectedCentury1 = 4;
                    expectedCentury2 = 5;
                }
                else if (birthYear >= 2200 && birthYear <= 2299)
                {
                    expectedCentury1 = 6;
                    expectedCentury2 = 7;
                }
                else if (birthYear >= 1800 && birthYear <= 1899)
                {
                    expectedCentury1 = 8;
                    expectedCentury2 = 9;
                }

                if (centuryCode != expectedCentury1 && centuryCode != expectedCentury2)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Không xác thực được thông tin. Vui lòng kiểm tra lại!"
                    };
                }

                // 3. Kiểm tra chữ số thứ 5 và 6 (Mã năm sinh)
                string birthYearLastTwo = (birthYear % 100).ToString("D2");
                string cccdYearCode = nationalId.Substring(4, 2);
                if (cccdYearCode != birthYearLastTwo)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Không xác thực được thông tin. Vui lòng kiểm tra lại!"
                    };
                }
            }

            // 1. Tìm hồ sơ theo CCCD/CMND trước
            var existingUserByNationalId = await _context.Users
                .FirstOrDefaultAsync(u => u.NationalId == nationalId);

            if (existingUserByNationalId != null)
            {
                // Kiểm tra xem Họ tên và Ngày sinh có trùng khớp không
                bool nameMatches = existingUserByNationalId.FullName.Trim().ToLower() == request.FullName.Trim().ToLower();
                bool dobMatches = existingUserByNationalId.DateOfBirth.HasValue && 
                                  existingUserByNationalId.DateOfBirth.Value.Date == request.DateOfBirth.Date;

                if (!nameMatches || !dobMatches)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Số CCCD/CMND này đã được đăng ký trong hệ thống nhưng Họ tên hoặc Ngày sinh không khớp với hồ sơ lưu trữ."
                    };
                }

                // Kiểm tra xem đã đăng ký tài khoản thành viên online chưa
                bool hasAccount = existingUserByNationalId.Username != null && !existingUserByNationalId.Username.StartsWith("cc_");
                if (hasAccount)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Số CCCD/CMND này đã được đăng ký tài khoản thành viên. Vui lòng quay lại đăng nhập!"
                    };
                }

                return new VerifyCitizenResult
                {
                    Success = true,
                    Message = "Tìm thấy hồ sơ bệnh án cũ của bạn. Tài khoản của bạn sẽ tự động đồng bộ lịch sử khám bệnh!",
                    Exists = true
                };
            }

            // 2. Tìm hồ sơ theo Số điện thoại
            var existingUserByPhone = await _context.Users
                .FirstOrDefaultAsync(u => u.PhoneNumber == phone);

            if (existingUserByPhone != null)
            {
                // Kiểm tra xem Họ tên và Ngày sinh có trùng khớp không
                bool nameMatches = existingUserByPhone.FullName.Trim().ToLower() == request.FullName.Trim().ToLower();
                bool dobMatches = existingUserByPhone.DateOfBirth.HasValue && 
                                  existingUserByPhone.DateOfBirth.Value.Date == request.DateOfBirth.Date;

                if (!nameMatches || !dobMatches)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Số điện thoại này đã được đăng ký trong hệ thống nhưng Họ tên hoặc Ngày sinh không khớp với hồ sơ lưu trữ."
                    };
                }

                // Kiểm tra xem đã đăng ký tài khoản thành viên online chưa
                bool hasAccount = existingUserByPhone.Username != null && !existingUserByPhone.Username.StartsWith("cc_");
                if (hasAccount)
                {
                    return new VerifyCitizenResult
                    {
                        Success = false,
                        Message = "Số điện thoại này đã được đăng ký tài khoản thành viên. Vui lòng quay lại đăng nhập!"
                    };
                }

                return new VerifyCitizenResult
                {
                    Success = true,
                    Message = "Tìm thấy hồ sơ bệnh án cũ theo số điện thoại. Hệ thống sẽ tự động liên kết dữ liệu khám bệnh của bạn!",
                    Exists = true
                };
            }

            // 3. Nếu không tìm thấy hồ sơ cũ nào trùng khớp
            return new VerifyCitizenResult
            {
                Success = true,
                Message = "Thông tin hành chính hợp lệ. Mời bạn tiếp tục hoàn tất thông tin tài khoản và địa chỉ.",
                Exists = false
            };
        }

        public async Task<bool> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var accountOrPhone = request.AccountOrPhone.Trim().ToLower();
            var nationalId = request.NationalId.Trim();

            // Tìm user theo username, email hoặc số điện thoại
            var user = await _context.Users.FirstOrDefaultAsync(u =>
                (u.Username != null && u.Username.ToLower() == accountOrPhone) ||
                (u.Email != null && u.Email.ToLower() == accountOrPhone) ||
                (u.PhoneNumber != null && u.PhoneNumber == accountOrPhone)
            );

            if (user == null)
            {
                throw new ArgumentException("Không tìm thấy tài khoản khớp với Tên đăng nhập/SĐT đã cung cấp.");
            }

            // Kiểm tra thông tin định danh: CCCD và Ngày sinh phải khớp
            bool nationalIdMatches = user.NationalId != null && user.NationalId.Trim() == nationalId;
            bool dobMatches = user.DateOfBirth.HasValue && user.DateOfBirth.Value.Date == request.DateOfBirth.Date;

            if (!nationalIdMatches || !dobMatches)
            {
                throw new ArgumentException("Thông tin xác thực Số CCCD hoặc Ngày sinh không khớp với hồ sơ tài khoản.");
            }

            // Đặt mật khẩu mới
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();
            return true;
        }
    }
}

