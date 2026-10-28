using System;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using web.DTOs;
using web.Services;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [ApiExplorerSettings(GroupName = "appointments")]
    public class AppointmentsController : ControllerBase
    {
        private readonly IAppointmentService _appointmentService;
        private readonly IServiceScopeFactory _serviceScopeFactory;

        public AppointmentsController(IAppointmentService appointmentService, IServiceScopeFactory serviceScopeFactory)
        {
            _appointmentService = appointmentService;
            _serviceScopeFactory = serviceScopeFactory;
        }

        [HttpPost]
        [Authorize(Roles = "Patient,Receptionist,Admin")] // Patient, Receptionist, Admin đều có thể đặt lịch khám
        public async Task<IActionResult> BookAppointment([FromBody] CreateAppointmentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var role = GetUserRole();
                int patientId;
                
                if (role == "Receptionist" || role == "Admin")
                {
                    if (!request.PatientId.HasValue || request.PatientId.Value <= 0)
                    {
                        return BadRequest(new { message = "Vui lòng chỉ định mã bệnh nhân (PatientId) khi đặt lịch hộ." });
                    }
                    patientId = request.PatientId.Value;
                }
                else
                {
                    patientId = GetUserId();
                }

                var result = await _appointmentService.BookAppointmentAsync(patientId, request);
                return CreatedAtAction(nameof(GetMyAppointments), new { }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }


        [HttpGet("my-appointments")]
        public async Task<IActionResult> GetMyAppointments()
        {
            var userId = GetUserId();
            var role = GetUserRole();

            if (role == "Patient")
            {
                var appointments = await _appointmentService.GetPatientAppointmentsAsync(userId);
                return Ok(appointments);
            }
            else if (role == "Doctor")
            {
                var appointments = await _appointmentService.GetDoctorAppointmentsAsync(userId);
                return Ok(appointments);
            }
            else if (role == "Admin" || role == "Receptionist")
            {
                var appointments = await _appointmentService.GetAllAppointmentsAsync();
                return Ok(appointments);
            }

            return Forbid();
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin,Receptionist")] // Admin và Receptionist được xem toàn bộ lịch khám
        public async Task<IActionResult> GetAllAppointments()
        {
            var appointments = await _appointmentService.GetAllAppointmentsAsync();
            return Ok(appointments);
        }

        [HttpGet("search")]
        [Authorize(Roles = "Admin,Receptionist")]
        public async Task<IActionResult> SearchAppointments([FromQuery] string q, [FromQuery] string type = "phone")
        {
            if (string.IsNullOrWhiteSpace(q))
                return BadRequest(new { message = "Vui lòng nhập từ khóa tìm kiếm." });

            var results = await _appointmentService.SearchAppointmentsAsync(q, type);
            return Ok(results);
        }

        [HttpGet("today")]
        [Authorize(Roles = "Admin,Receptionist,Doctor")]
        public async Task<IActionResult> GetTodayAppointments()
        {
            var appointments = await _appointmentService.GetTodayAppointmentsAsync();
            return Ok(appointments);
        }

        [HttpPut("{id}/status")]
        [Authorize(Roles = "Admin,Doctor,Patient,Receptionist")] // Bác sĩ, Admin, Bệnh nhân hoặc Nhân viên tiếp đón đều có thể cập nhật trạng thái lịch khám
        public async Task<IActionResult> UpdateStatus(int id, [FromBody] UpdateAppointmentStatusRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = GetUserId();
                var role = GetUserRole();

                var success = await _appointmentService.UpdateStatusAsync(
                    id, 
                    request.Status, 
                    userId, 
                    role, 
                    request.BloodPressure, 
                    request.Temperature, 
                    request.Weight, 
                    request.HeartRate,
                    request.PaymentMethod,
                    request.PaymentTransactionId
                );

                if (!success)
                {
                    return NotFound(new { message = $"Không tìm thấy cuộc hẹn có mã {id}." });
                }

                // Gửi thông báo đẩy bất đồng bộ (không chặn luồng xử lý chính)
                _ = Task.Run(async () =>
                {
                    try
                    {
                        using (var scope = _serviceScopeFactory.CreateScope())
                        {
                            var scopedContext = scope.ServiceProvider.GetRequiredService<web.Data.AppDbContext>();
                            var scopedNotification = scope.ServiceProvider.GetRequiredService<INotificationService>();

                            var appointment = await scopedContext.Appointments
                                .Include(a => a.Patient)
                                .Include(a => a.Doctor)
                                .FirstOrDefaultAsync(a => a.AppointmentId == id);

                            if (appointment?.Patient != null && !string.IsNullOrEmpty(appointment.Patient.DeviceToken))
                            {
                                string title = "Cập nhật trạng thái lịch khám - CareConnect";
                                string statusText = request.Status switch
                                {
                                    "CheckedIn" => "đã được tiếp nhận vào phòng khám",
                                    "Completed" => "đã khám xong và có kết quả bệnh án mới",
                                    "Cancelled" => "đã bị hủy",
                                    "Confirmed" => "đã được xác nhận",
                                    _ => $"đã chuyển sang trạng thái: {request.Status}"
                                };
                                string body = $"Chào {appointment.Patient.FullName}, lịch khám của bạn với BS. {appointment.Doctor.FullName} {statusText}.";

                                await scopedNotification.SendNotificationAsync(appointment.Patient.DeviceToken, title, body);
                            }
                        }
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Error sending push notification: {ex.Message}");
                    }
                });

                return Ok(new { message = $"Cập nhật trạng thái cuộc hẹn thành công sang '{request.Status}'." });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message }); // Trả về 403 Forbidden kèm thông báo lỗi cụ thể
            }
        }

        [HttpPut("{id}/reschedule")]
        [Authorize(Roles = "Patient,Admin,Receptionist")]
        public async Task<IActionResult> Reschedule(int id, [FromBody] RescheduleAppointmentRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var userId = GetUserId();
                var role = GetUserRole();

                var success = await _appointmentService.RescheduleAsync(id, request.AppointmentDate, request.TimeSlot, userId, role);
                if (!success)
                {
                    return NotFound(new { message = $"Không tìm thấy cuộc hẹn có mã {id}." });
                }

                return Ok(new { message = "Đổi lịch hẹn khám thành công!" });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(403, new { message = ex.Message });
            }
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                             ?? User.FindFirst("UserId")?.Value;
            return int.TryParse(claimValue, out int userId) ? userId : 0;
        }

        private string GetUserRole()
        {
            return User.FindFirst(ClaimTypes.Role)?.Value 
                   ?? User.FindFirst("Role")?.Value 
                   ?? string.Empty;
        }
    }
}
