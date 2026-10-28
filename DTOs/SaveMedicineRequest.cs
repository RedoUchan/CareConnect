using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class SaveMedicineRequest
    {
        [Required(ErrorMessage = "Tên thuốc/hóa chất không được để trống.")]
        [MaxLength(150, ErrorMessage = "Tên thuốc không được vượt quá 150 ký tự.")]
        public string Name { get; set; } = string.Empty;

        [MaxLength(150, ErrorMessage = "Tên hoạt chất không được vượt quá 150 ký tự.")]
        public string ActiveIngredient { get; set; } = string.Empty;

        [Required(ErrorMessage = "Đơn vị tính không được để trống.")]
        [MaxLength(50, ErrorMessage = "Đơn vị tính không được vượt quá 50 ký tự.")]
        public string Unit { get; set; } = string.Empty; // Viên, Gói, Chai, Lọ...

        [Range(0, 100000000, ErrorMessage = "Đơn giá không được âm.")]
        public decimal UnitPrice { get; set; }

        [Range(0, 1000000, ErrorMessage = "Số lượng tồn kho phải từ 0 đến 1,000,000.")]
        public int StockQuantity { get; set; }

        [MaxLength(500, ErrorMessage = "Hướng dẫn sử dụng không được vượt quá 500 ký tự.")]
        public string UsageInstruction { get; set; } = string.Empty;
    }
}
