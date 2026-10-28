using System;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using web.Services;
using web.DTOs;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    [ApiExplorerSettings(GroupName = "appointments")]
    public class MedicinesController : ControllerBase
    {
        private readonly IMedicalRecordService _medicalRecordService;

        public MedicinesController(IMedicalRecordService medicalRecordService)
        {
            _medicalRecordService = medicalRecordService;
        }

        [HttpGet]
        public async Task<IActionResult> GetAllMedicines()
        {
            try
            {
                var medicines = await _medicalRecordService.GetAllMedicinesAsync();
                return Ok(medicines);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi tải danh mục thuốc.", details = ex.Message });
            }
        }

        [HttpPut("{medicineId}/restock")]
        [Authorize(Roles = "Admin,Pharmacist")] // Chỉ Admin và Dược sĩ được nhập kho thuốc
        public async Task<IActionResult> RestockMedicine(int medicineId, [FromBody] RestockPayload payload)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _medicalRecordService.RestockMedicineAsync(medicineId, payload.Quantity);
                if (result == null)
                {
                    return NotFound(new { message = "Không tìm thấy thuốc cần nhập kho." });
                }
                return Ok(new { message = "Nhập kho thuốc thành công.", data = result });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi nhập kho thuốc.", details = ex.Message });
            }
        }

        [HttpPost]
        [Authorize(Roles = "Admin,Pharmacist")] // Chỉ Admin và Dược sĩ được thêm thuốc
        public async Task<IActionResult> AddMedicine([FromBody] SaveMedicineRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _medicalRecordService.AddMedicineAsync(request);
                return CreatedAtAction(nameof(GetAllMedicines), new { }, result);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi thêm thuốc mới.", details = ex.Message });
            }
        }

        [HttpPut("{medicineId}")]
        [Authorize(Roles = "Admin,Pharmacist")] // Chỉ Admin và Dược sĩ được sửa thuốc
        public async Task<IActionResult> UpdateMedicine(int medicineId, [FromBody] SaveMedicineRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var result = await _medicalRecordService.UpdateMedicineAsync(medicineId, request);
                if (result == null)
                {
                    return NotFound(new { message = "Không tìm thấy thuốc cần chỉnh sửa." });
                }
                return Ok(new { message = "Cập nhật thông tin thuốc thành công.", data = result });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi cập nhật thông tin thuốc.", details = ex.Message });
            }
        }

        [HttpDelete("{medicineId}")]
        [Authorize(Roles = "Admin,Pharmacist")] // Chỉ Admin và Dược sĩ được xóa thuốc
        public async Task<IActionResult> DeleteMedicine(int medicineId)
        {
            try
            {
                var success = await _medicalRecordService.DeleteMedicineAsync(medicineId);
                if (!success)
                {
                    return NotFound(new { message = "Không tìm thấy thuốc cần xóa." });
                }
                return Ok(new { message = "Xóa thuốc khỏi danh mục thành công." });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi hệ thống khi xóa thuốc.", details = ex.Message });
            }
        }
    }

    public class RestockPayload
    {
        [System.ComponentModel.DataAnnotations.Required(ErrorMessage = "Số lượng nhập kho là bắt buộc.")]
        [System.ComponentModel.DataAnnotations.Range(1, 1000000, ErrorMessage = "Số lượng nhập kho phải từ 1 đến 1,000,000.")]
        public int Quantity { get; set; }
    }
}
