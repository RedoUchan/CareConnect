using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using web.DTOs;
using web.Services;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [ApiExplorerSettings(GroupName = "auth")]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;

        public AuthController(IAuthService authService)
        {
            _authService = authService;
        }

        /// <summary>
        /// Đăng nhập hệ thống và lấy JWT Token xác thực.
        /// </summary>
        /// <param name="request">Thông tin tài khoản đăng nhập (Email và Mật khẩu).</param>
        /// <response code="200">Đăng nhập thành công, trả về JWT Token và thông tin người dùng.</response>
        /// <response code="400">Dữ liệu yêu cầu không hợp lệ (Validation Error).</response>
        /// <response code="401">Email hoặc mật khẩu không chính xác.</response>
        [HttpPost("login")]
        [ProducesResponseType(200)]
        [ProducesResponseType(400)]
        [ProducesResponseType(401)]
        public async Task<IActionResult> Login([FromBody] LoginRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var response = await _authService.LoginAsync(request);

            if (response == null)
            {
                return Unauthorized(new { message = "Email hoặc mật khẩu không chính xác" });
            }

            return Ok(response);
        }

        [HttpPost("register")]
        [AllowAnonymous]
        public async Task<IActionResult> Register([FromBody] RegisterRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            // Mọi tài khoản đăng ký công khai đều là Patient
            request.Role = "Patient";

            try
            {
                var user = await _authService.RegisterAsync(request);
                return Ok(new { message = "Đăng ký tài khoản thành công! Vui lòng đăng nhập.", userId = user.UserId });
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

        [HttpPost("verify-citizen")]
        [AllowAnonymous]
        public async Task<IActionResult> VerifyCitizen([FromBody] VerifyCitizenRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _authService.VerifyCitizenAsync(request);
                if (!result.Success)
                {
                    return BadRequest(new { message = result.Message });
                }
                return Ok(result);
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi xác thực hệ thống.", details = ex.Message });
            }
        }

        [HttpPost("reset-password")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _authService.ResetPasswordAsync(request);
                return Ok(new { message = "Khôi phục mật khẩu thành công! Vui lòng đăng nhập bằng mật khẩu mới." });
            }
            catch (System.ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (System.Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi đặt lại mật khẩu hệ thống.", details = ex.Message });
            }
        }

        [HttpGet("admin-only")]
        [Authorize(Roles = "Admin")]
        public IActionResult AdminOnly()
        {
            // Trích xuất claims để chứng minh token đã được giải mã chính xác
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            var email = User.FindFirst(ClaimTypes.Email)?.Value;
            var role = User.FindFirst(ClaimTypes.Role)?.Value;

            return Ok(new
            {
                Message = "Chào mừng Admin! Cơ chế RBAC hoạt động chính xác.",
                UserInfo = new
                {
                    UserId = userId,
                    Email = email,
                    Role = role
                }
            });
        }

        [HttpGet("doctors")]
        [AllowAnonymous]
        public async Task<IActionResult> GetDoctors()
        {
            var doctors = await _authService.GetDoctorsAsync();
            return Ok(doctors);
        }

        [HttpGet("profile")]
        [Authorize]
        public async Task<IActionResult> GetProfile()
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst("UserId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });
            }

            var user = await _authService.GetProfileAsync(userId);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            return Ok(new
            {
                user.UserId,
                user.FullName,
                user.Email,
                user.Role,
                user.PhoneNumber,
                user.DateOfBirth,
                user.Address,
                user.Gender,
                user.BloodType,
                user.Specialization,
                user.HospitalBranch,
                user.Degree,
                user.PatientType,
                user.InsuranceCardNumber,
                user.NationalId,
                user.IsPriority,
                user.PriorityReason,
                user.ServiceTier,
                user.Ethnicity,
                user.Occupation,
                user.Nationality,
                user.Province,
                user.District,
                user.Ward,
                user.AddressDetail
            });
        }

        [HttpPut("profile")]
        [Authorize]
        public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                              ?? User.FindFirst("UserId")?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !int.TryParse(userIdClaim, out int userId))
            {
                return Unauthorized(new { message = "Không xác định được danh tính người dùng." });
            }

            var result = await _authService.UpdateProfileAsync(userId, request);
            if (!result)
            {
                return NotFound(new { message = "Không tìm thấy người dùng để cập nhật." });
            }

            return Ok(new { message = "Cập nhật hồ sơ thành công." });
        }

        [HttpPost("register-device-token")]
        public async Task<IActionResult> RegisterDeviceToken([FromBody] RegisterDeviceTokenRequest request, [FromServices] web.Data.AppDbContext dbContext)
        {
            if (string.IsNullOrEmpty(request.DeviceToken))
            {
                return BadRequest(new { message = "Device Token không được để trống." });
            }

            var user = await dbContext.Users.FindAsync(request.UserId);
            if (user == null)
            {
                return NotFound(new { message = "Không tìm thấy người dùng." });
            }

            user.DeviceToken = request.DeviceToken;
            await dbContext.SaveChangesAsync();

            return Ok(new { message = "Đăng ký Device Token thành công." });
        }
    }

    public class RegisterDeviceTokenRequest
    {
        public int UserId { get; set; }
        public string DeviceToken { get; set; } = string.Empty;
    }
}

