using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class CreateLabRequestRequest
    {
        [Required(ErrorMessage = "Loại chỉ định cận lâm sàng (LabType) là bắt buộc.")]
        [MaxLength(100, ErrorMessage = "Tên loại cận lâm sàng không được vượt quá 100 ký tự.")]
        public string LabType { get; set; } = string.Empty;

        [Range(0, 100000000, ErrorMessage = "Phí cận lâm sàng không được âm.")]
        public decimal Fee { get; set; }
    }
}
