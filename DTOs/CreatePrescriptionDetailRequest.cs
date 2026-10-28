using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class CreatePrescriptionDetailRequest
    {
        [Required(ErrorMessage = "Mã thuốc (MedicineId) là bắt buộc.")]
        public int MedicineId { get; set; }

        [Range(1, 1000, ErrorMessage = "Số lượng thuốc kê đơn phải từ 1 đến 1000.")]
        public int Quantity { get; set; }

        [MaxLength(200, ErrorMessage = "Hướng dẫn sử dụng không được vượt quá 200 ký tự.")]
        public string UsageInstruction { get; set; } = string.Empty;
    }
}
