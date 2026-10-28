using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class AiChatRequest
    {
        [Required(ErrorMessage = "Tin nhắn không được để trống.")]
        public string Message { get; set; } = string.Empty;

        public List<string> History { get; set; } = new List<string>();
    }
}
