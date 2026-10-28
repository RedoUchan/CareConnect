using System;
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
    [Authorize]
    [ApiExplorerSettings(GroupName = "appointments")]
    public class MedicalRecordsController : ControllerBase
    {
        private readonly IMedicalRecordService _medicalRecordService;

        public MedicalRecordsController(IMedicalRecordService medicalRecordService)
        {
            _medicalRecordService = medicalRecordService;
        }

        [HttpPost]
        [Authorize(Roles = "Doctor")] // Chỉ Bác sĩ (Doctor) mới được quyền tạo bệnh án
        public async Task<IActionResult> CreateMedicalRecord([FromBody] CreateMedicalRecordRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var doctorId = GetUserId();
                var result = await _medicalRecordService.CreateRecordAsync(doctorId, request);
                return CreatedAtAction(nameof(GetMyRecords), new { }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống.", details = ex.Message });
            }
        }

        [HttpGet("my-records")]
        public async Task<IActionResult> GetMyRecords()
        {
            var userId = GetUserId();
            var role = GetUserRole();

            if (role == "Patient")
            {
                var records = await _medicalRecordService.GetPatientRecordsAsync(userId);
                return Ok(records);
            }
            else if (role == "Doctor")
            {
                var records = await _medicalRecordService.GetDoctorRecordsAsync(userId);
                return Ok(records);
            }
            else if (role == "Admin")
            {
                var records = await _medicalRecordService.GetAllRecordsAsync();
                return Ok(records);
            }

            return Forbid();
        }

        [HttpGet("all")]
        [Authorize(Roles = "Admin,Receptionist,Finance")] // Admin, Lễ tân và Tài chính có quyền xem danh sách tất cả các bệnh án để thu phí
        public async Task<IActionResult> GetAllRecords()
        {
            var records = await _medicalRecordService.GetAllRecordsAsync();
            return Ok(records);
        }

        [HttpGet("patient/{patientId}")]
        [Authorize(Roles = "Doctor,Admin")] // Bác sĩ hoặc Admin được quyền xem lịch sử bệnh án của bệnh nhân
        public async Task<IActionResult> GetPatientRecords(int patientId)
        {
            var records = await _medicalRecordService.GetPatientRecordsAsync(patientId);
            return Ok(records);
        }

        [HttpPut("{recordId}/pay")]
        [Authorize(Roles = "Admin,Receptionist,Finance,Patient")] // Chặn Bác sĩ không được quyền thu tiền/duyệt hóa đơn
        public async Task<IActionResult> PayMedicalRecord(int recordId)
        {
            var success = await _medicalRecordService.PayRecordAsync(recordId);
            if (!success)
            {
                return NotFound(new { message = "Không tìm thấy hồ sơ bệnh án." });
            }
            return Ok(new { message = "Thanh toán viện phí / hóa đơn đơn thuốc thành công." });
        }

        [HttpPut("{recordId}/dispense")]
        [Authorize(Roles = "Admin,Receptionist,Pharmacist")] // Chỉ Admin, Lễ tân và Dược sĩ được phát thuốc
        public async Task<IActionResult> DispensePrescription(int recordId)
        {
            try
            {
                var success = await _medicalRecordService.DispensePrescriptionAsync(recordId);
                if (!success)
                {
                    return NotFound(new { message = "Không tìm thấy hồ sơ bệnh án để cấp phát thuốc." });
                }
                return Ok(new { message = "Cấp phát thuốc thành công và cập nhật tồn kho." });
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi cấp phát thuốc.", details = ex.Message });
            }
        }

        [HttpPut("{recordId}/labs/{labId}")]
        [Authorize(Roles = "Admin,LabTechnician")] // Chỉ Admin và Kỹ thuật viên xét nghiệm được nhập kết quả
        public async Task<IActionResult> UpdateLabRequest(int recordId, int labId, [FromBody] UpdateLabRequestPayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var success = await _medicalRecordService.UpdateLabRequestAsync(recordId, labId, payload.Results, payload.ImageUrl);
                if (!success)
                {
                    return NotFound(new { message = "Không tìm thấy chỉ định cận lâm sàng hợp lệ để cập nhật." });
                }
                return Ok(new { message = "Cập nhật kết quả cận lâm sàng thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi cập nhật cận lâm sàng.", details = ex.Message });
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

    public class UpdateLabRequestPayload
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Kết quả xét nghiệm không được để trống.")]
        public string Results { get; set; } = string.Empty;
        public string? ImageUrl { get; set; }
    }
}
