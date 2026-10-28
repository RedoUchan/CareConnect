using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Claims;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using web.Data;
using web.DTOs;
using web.Models;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [ApiExplorerSettings(GroupName = "appointments")]
    public class ScheduleController : ControllerBase
    {
        private readonly AppDbContext _context;

        public ScheduleController(AppDbContext context)
        {
            _context = context;
        }

        // POST /api/schedule
        // Chỉ bác sĩ mới cấu hình ca trực rảnh của chính mình
        [HttpPost]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> SetSchedule([FromBody] SetScheduleRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var doctorId = GetUserId();
            if (request.AvailableDate.Date < DateTime.Today)
            {
                return BadRequest(new { message = "Không thể cấu hình lịch trực cho ngày trong quá khứ." });
            }

            // Lấy danh sách các ca trực hiện tại của bác sĩ trong ngày này
            var targetDate = request.AvailableDate.Date;
            var existingSlots = await _context.DoctorSchedules
                .Where(s => s.DoctorId == doctorId 
                            && s.AvailableDate.Year == targetDate.Year
                            && s.AvailableDate.Month == targetDate.Month
                            && s.AvailableDate.Day == targetDate.Day)
                .ToListAsync();

            // Tìm các ca trực đã có lịch hẹn (không Cancelled)
            var bookedSlots = await _context.Appointments
                .Where(a => a.DoctorId == doctorId 
                            && a.AppointmentDate.Year == targetDate.Year
                            && a.AppointmentDate.Month == targetDate.Month
                            && a.AppointmentDate.Day == targetDate.Day
                            && a.Status != "Cancelled")
                .Select(a => a.TimeSlot.ToLower())
                .ToListAsync();

            // 1. Xác định các ca trực cần xóa: có trong existingSlots nhưng không có trong request.TimeSlots
            var slotsToRemove = existingSlots
                .Where(s => !request.TimeSlots.Any(ts => ts.Trim().ToLower() == s.TimeSlot.ToLower()))
                .ToList();

            // Nếu bác sĩ bỏ chọn một ca trực đã có lịch hẹn khám -> Báo lỗi
            foreach (var slot in slotsToRemove)
            {
                if (bookedSlots.Contains(slot.TimeSlot.ToLower()))
                {
                    return BadRequest(new { message = $"Không thể loại bỏ ca khám '{slot.TimeSlot}' vì đã có bệnh nhân đặt lịch hẹn." });
                }
            }

            // Xóa các ca trực không còn được chọn
            _context.DoctorSchedules.RemoveRange(slotsToRemove);

            // 2. Xác định các ca trực cần thêm mới: có trong request.TimeSlots nhưng chưa có trong existingSlots
            foreach (var slot in request.TimeSlots)
            {
                var trimmedSlot = slot.Trim();
                bool alreadyExists = existingSlots.Any(s => s.TimeSlot.ToLower() == trimmedSlot.ToLower());
                if (!alreadyExists)
                {
                    _context.DoctorSchedules.Add(new DoctorSchedule
                    {
                        DoctorId = doctorId,
                        AvailableDate = request.AvailableDate.Date,
                        TimeSlot = trimmedSlot
                    });
                }
            }

            await _context.SaveChangesAsync();
            return Ok(new { message = "Cập nhật ca trực rảnh thành công." });
        }

        // GET /api/schedule/my-schedule
        // Bác sĩ xem toàn bộ danh sách ca trực của mình
        [HttpGet("my-schedule")]
        [Authorize(Roles = "Doctor")]
        public async Task<IActionResult> GetMySchedule()
        {
            var doctorId = GetUserId();
            var schedules = await _context.DoctorSchedules
                .Where(s => s.DoctorId == doctorId)
                .OrderBy(s => s.AvailableDate)
                .ThenBy(s => s.TimeSlot)
                .Select(s => new
                {
                    s.DoctorScheduleId,
                    AvailableDate = s.AvailableDate,
                    s.TimeSlot
                })
                .ToListAsync();

            return Ok(schedules);
        }

        // GET /api/schedule/doctor/{doctorId}/date/{date}
        // Bệnh nhân/Công khai lấy danh sách ca trực còn trống của một bác sĩ vào ngày cụ thể
        [HttpGet("doctor/{doctorId}/date/{date}")]
        [AllowAnonymous]
        public async Task<IActionResult> GetAvailableSlots(int doctorId, string date)
        {
            if (!DateTime.TryParse(date, out DateTime parsedDate))
            {
                return BadRequest(new { message = "Định dạng ngày không hợp lệ. Sử dụng YYYY-MM-DD." });
            }

            // Lấy tất cả ca trực rảnh được bác sĩ cấu hình cho ngày này
            var targetDate = parsedDate.Date;
            var configuredSlots = await _context.DoctorSchedules
                .Where(s => s.DoctorId == doctorId 
                            && s.AvailableDate.Year == targetDate.Year
                            && s.AvailableDate.Month == targetDate.Month
                            && s.AvailableDate.Day == targetDate.Day)
                .Select(s => s.TimeSlot)
                .ToListAsync();

            // Lấy các ca trực đã bị đặt lịch hẹn (trạng thái khác Cancelled)
            var bookedSlots = await _context.Appointments
                .Where(a => a.DoctorId == doctorId 
                            && a.AppointmentDate.Year == targetDate.Year
                            && a.AppointmentDate.Month == targetDate.Month
                            && a.AppointmentDate.Day == targetDate.Day
                            && a.Status != "Cancelled")
                .Select(a => a.TimeSlot.ToLower())
                .ToListAsync();

            // Lọc ra các ca trực rảnh chưa bị đặt lịch hẹn
            var availableSlots = configuredSlots
                .Where(slot => !bookedSlots.Contains(slot.ToLower()))
                .ToList();

            return Ok(availableSlots);
        }

        private int GetUserId()
        {
            var claimValue = User.FindFirst(ClaimTypes.NameIdentifier)?.Value 
                             ?? User.FindFirst("UserId")?.Value;
            return int.TryParse(claimValue, out int userId) ? userId : 0;
        }
    }
}
