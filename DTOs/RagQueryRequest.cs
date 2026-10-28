using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class RagQueryRequest
    {
        [Required(ErrorMessage = "Truy vấn tìm kiếm không được để trống.")]
        public string Query { get; set; } = string.Empty;

        public int TopK { get; set; } = 3;

        public double MinScore { get; set; } = 0.2;
    }
}
