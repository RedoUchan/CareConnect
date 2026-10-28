using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web.Data;
using web.DTOs;
using web.Models;
using web.Services;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize(Roles = "Admin,Receptionist")]
    [ApiExplorerSettings(GroupName = "admin")]
    public class AdminController : ControllerBase
    {
        private readonly AppDbContext _context;

        public AdminController(AppDbContext context)
        {
            _context = context;
        }

        // GET /api/admin/users — Lấy toàn bộ người dùng (kèm thông tin mở rộng)
        [HttpGet("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetUsers()
        {
            var users = await _context.Users
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.PhoneNumber,
                    u.Gender,
                    u.BloodType,
                    u.Address,
                    u.Specialization,
                    DateOfBirth = u.DateOfBirth,
                    Age = u.DateOfBirth != null
                        ? (int)((DateTime.UtcNow - u.DateOfBirth.Value).TotalDays / 365.25)
                        : (int?)null,
                    u.PatientType,
                    u.InsuranceCardNumber,
                    u.NationalId,
                    u.IsPriority,
                    u.PriorityReason,
                    u.ServiceTier,
                    u.Ethnicity,
                    u.Occupation,
                    u.Nationality,
                    u.Province,
                    u.District,
                    u.Ward,
                    u.AddressDetail
                })
                .ToListAsync();

            return Ok(users);
        }

        // GET /api/admin/staff — Lấy danh sách Bác sĩ + Quản trị viên + Lễ tân
        [HttpGet("staff")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStaff()
        {
            var staff = await _context.Users
                .Where(u => u.Role == "Doctor" || u.Role == "Admin" || u.Role == "Receptionist" || u.Role == "Finance" || u.Role == "Pharmacist" || u.Role == "LabTechnician")
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.Role,
                    u.PhoneNumber,
                    u.Specialization,
                    u.HospitalBranch
                })
                .OrderBy(u => u.Role)
                .ThenBy(u => u.FullName)
                .ToListAsync();

            return Ok(staff);
        }

        // GET /api/admin/patients — Lấy danh sách Bệnh nhân kèm thông tin đầy đủ
        [HttpGet("patients")]
        public async Task<IActionResult> GetPatients()
        {
            var patients = await _context.Users
                .Where(u => u.Role == "Patient")
                .Select(u => new
                {
                    u.UserId,
                    u.FullName,
                    u.Email,
                    u.PhoneNumber,
                    u.Gender,
                    u.BloodType,
                    u.Address,
                    DateOfBirth = u.DateOfBirth,
                    Age = u.DateOfBirth != null
                        ? (int)((DateTime.UtcNow - u.DateOfBirth.Value).TotalDays / 365.25)
                        : (int?)null,
                    u.PatientType,
                    u.InsuranceCardNumber,
                    u.NationalId,
                    u.IsPriority,
                    u.PriorityReason,
                    u.ServiceTier,
                    // Đếm số lần khám
                    TotalAppointments = _context.Appointments.Count(a => a.PatientId == u.UserId),
                    TotalRecords      = _context.MedicalRecords.Count(m => m.PatientId == u.UserId)
                })
                .OrderBy(u => u.FullName)
                .ToListAsync();

            return Ok(patients);
        }

        // DELETE /api/admin/users/{id}
        [HttpDelete("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> DeleteUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng có mã {id}." });
            }

            // Ngăn chặn việc Admin tự xóa chính mình
            var adminIdClaim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value 
                               ?? User.FindFirst("UserId")?.Value;
            if (int.TryParse(adminIdClaim, out int adminId) && adminId == id)
            {
                return BadRequest(new { message = "Bạn không thể tự xóa tài khoản quản trị viên của chính mình." });
            }

            // Kiểm tra ràng buộc khóa ngoại trước khi xóa để đưa ra thông báo lỗi thân thiện thay vì lỗi database 500
            bool hasAppointments = await _context.Appointments.AnyAsync(a => a.PatientId == id || a.DoctorId == id);
            bool hasMedicalRecords = await _context.MedicalRecords.AnyAsync(m => m.PatientId == id || m.DoctorId == id);

            if (hasAppointments || hasMedicalRecords)
            {
                return BadRequest(new { message = "Không thể xóa người dùng này vì họ đã có lịch hẹn hoặc hồ sơ bệnh án trong hệ thống." });
            }

            _context.Users.Remove(user);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Xóa người dùng thành công." });
        }

        // GET /api/admin/stats
        [HttpGet("stats")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetStats()
        {
            var totalPatients = await _context.Users.CountAsync(u => u.Role == "Patient");
            var totalDoctors = await _context.Users.CountAsync(u => u.Role == "Doctor");
            var totalAppointments = await _context.Appointments.CountAsync();

            var appointments = await _context.Appointments.ToListAsync();
            var statusBreakdown = appointments
                .GroupBy(a => a.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            // Đảm bảo đầy đủ các trạng thái chính xuất hiện trong kết quả trả về
            var statuses = new[] { "Pending", "Confirmed", "CheckedIn", "Completed", "Cancelled" };
            foreach (var status in statuses)
            {
                if (!statusBreakdown.ContainsKey(status))
                {
                    statusBreakdown[status] = 0;
                }
            }

            return Ok(new
            {
                TotalPatients = totalPatients,
                TotalDoctors = totalDoctors,
                TotalAppointments = totalAppointments,
                StatusBreakdown = statusBreakdown
            });
        }

        // GET /api/admin/overview
        // Trả về dữ liệu tổng hợp cho Dashboard Tổng Quan của Admin
        [HttpGet("overview")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetOverview()
        {
            // --- Thống kê tổng quan ---
            var totalPatients = await _context.Users.CountAsync(u => u.Role == "Patient");
            var totalDoctors = await _context.Users.CountAsync(u => u.Role == "Doctor");
            var totalAppointments = await _context.Appointments.CountAsync();
            var totalRecords = await _context.MedicalRecords.CountAsync();

            var appointments = await _context.Appointments.ToListAsync();
            var statusBreakdown = appointments
                .GroupBy(a => a.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            var statuses = new[] { "Pending", "Confirmed", "CheckedIn", "Completed", "Cancelled" };
            foreach (var s in statuses)
                if (!statusBreakdown.ContainsKey(s)) statusBreakdown[s] = 0;

            // Tỷ lệ hoàn thành (Completed / Total)
            double completionRate = totalAppointments > 0
                ? Math.Round((double)statusBreakdown["Completed"] / totalAppointments * 100, 1)
                : 0;

            // --- 5 lịch hẹn gần nhất ---
            var recentAppointments = await _context.Appointments
                .OrderByDescending(a => a.AppointmentId)
                .Take(5)
                .Join(_context.Users, a => a.PatientId, u => u.UserId, (a, u) => new { a, PatientName = u.FullName })
                .Join(_context.Users, x => x.a.DoctorId, u => u.UserId, (x, u) => new
                {
                    x.a.AppointmentId,
                    x.PatientName,
                    DoctorName = u.FullName,
                    x.a.AppointmentDate,
                    x.a.TimeSlot,
                    x.a.Status
                })
                .ToListAsync();

            // --- 5 bệnh án gần nhất ---
            var recentRecords = await _context.MedicalRecords
                .OrderByDescending(r => r.MedicalRecordId)
                .Take(5)
                .Join(_context.Users, r => r.PatientId, u => u.UserId, (r, u) => new { r, PatientName = u.FullName })
                .Join(_context.Users, x => x.r.DoctorId, u => u.UserId, (x, u) => new
                {
                    x.r.MedicalRecordId,
                    x.PatientName,
                    DoctorName = u.FullName,
                    x.r.Diagnosis,
                    x.r.RecordDate
                })
                .ToListAsync();

            // --- Top bác sĩ theo số lượng cuộc hẹn hoàn thành ---
            var topDoctors = await _context.Appointments
                .Where(a => a.Status == "Completed")
                .GroupBy(a => a.DoctorId)
                .Select(g => new { DoctorId = g.Key, CompletedCount = g.Count() })
                .OrderByDescending(x => x.CompletedCount)
                .Take(5)
                .Join(_context.Users, x => x.DoctorId, u => u.UserId, (x, u) => new
                {
                    u.FullName,
                    x.CompletedCount
                })
                .ToListAsync();

            return Ok(new
            {
                Summary = new
                {
                    TotalPatients = totalPatients,
                    TotalDoctors = totalDoctors,
                    TotalAppointments = totalAppointments,
                    TotalRecords = totalRecords,
                    CompletionRate = completionRate,
                    StatusBreakdown = statusBreakdown
                },
                RecentAppointments = recentAppointments,
                RecentRecords = recentRecords,
                TopDoctors = topDoctors
            });
        }

        // POST /api/admin/reset-db
        // Xóa toàn bộ dữ liệu và khởi tạo lại cơ sở dữ liệu với dữ liệu mẫu mặc định
        [HttpPost("reset-db")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ResetDb()
        {
            try
            {
                // Xóa và tạo lại database
                await _context.Database.EnsureDeletedAsync();
                await _context.Database.EnsureCreatedAsync();

                return Ok(new { message = "Cơ sở dữ liệu đã được đặt lại thành công. Dữ liệu mẫu mặc định đã được khởi tạo lại." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = $"Lỗi khi đặt lại cơ sở dữ liệu: {ex.Message}" });
            }
        }

        // GET /api/admin/users/{id} — Lấy chi tiết thông tin người dùng
        [HttpGet("users/{id}")]
        public async Task<IActionResult> GetUserDetail(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng có mã {id}." });
            }
            return Ok(user);
        }

        // PUT /api/admin/users/{id} — Cập nhật thông tin người dùng
        [HttpPut("users/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> UpdateUser(int id, [FromBody] UpdateUserRequest request)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null)
            {
                return NotFound(new { message = $"Không tìm thấy người dùng có mã {id}." });
            }

            if (!string.Equals(user.Email, request.Email, StringComparison.OrdinalIgnoreCase))
            {
                bool emailExists = await _context.Users.AnyAsync(u => u.UserId != id && u.Email.ToLower() == request.Email.ToLower());
                if (emailExists)
                {
                    return BadRequest(new { message = "Email này đã được sử dụng bởi một tài khoản khác." });
                }
            }

            user.FullName = request.FullName.Trim();
            user.Email = request.Email.Trim().ToLower();
            user.PhoneNumber = request.PhoneNumber?.Trim();
            user.Gender = request.Gender?.Trim();
            user.BloodType = request.BloodType?.Trim();
            user.DateOfBirth = request.DateOfBirth;

            user.Ethnicity = request.Ethnicity?.Trim();
            user.Occupation = request.Occupation?.Trim();
            user.Nationality = request.Nationality?.Trim();
            user.AddressDetail = request.AddressDetail?.Trim();
            user.Ward = request.Ward?.Trim();
            user.District = request.District?.Trim();
            user.Province = request.Province?.Trim();

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
            
            if (user.Role == "Doctor" || user.Role == "Receptionist" || user.Role == "Finance" || user.Role == "Pharmacist" || user.Role == "LabTechnician")
            {
                user.HospitalBranch = request.HospitalBranch?.Trim();
                if (user.Role == "Doctor")
                {
                    user.Specialization = request.Specialization?.Trim();
                    user.Degree = request.Degree?.Trim();
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
                    user.PatientType = string.IsNullOrEmpty(request.InsuranceCardNumber) ? "Service" : "Insurance";
                }

                user.InsuranceCardNumber = request.InsuranceCardNumber?.Trim();
                user.NationalId = request.NationalId?.Trim();
                if (request.IsPriority != null)
                {
                    user.IsPriority = request.IsPriority.Value;
                }
                user.PriorityReason = request.PriorityReason?.Trim();
                user.ServiceTier = request.ServiceTier?.Trim() ?? "Standard";

                // Tự động kiểm tra lại độ tuổi để cập nhật IsPriority
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

            if (!string.IsNullOrEmpty(request.Password))
            {
                if (request.Password.Length < 6)
                {
                    return BadRequest(new { message = "Mật khẩu phải có độ dài tối thiểu là 6 ký tự." });
                }
                user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password);
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật thông tin người dùng thành công." });
        }

        // POST /api/admin/users — Tạo tài khoản nhân viên mới (chỉ Admin được phép)
        [HttpPost("users")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> CreateUser([FromBody] RegisterRequest request, [FromServices] IAuthService authService)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var user = await authService.RegisterAsync(request);
                return Ok(new { message = $"Tạo tài khoản {request.Role} thành công!", userId = user.UserId });
            }
            catch (System.ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống.", details = ex.Message });
            }
        }
    }
}

