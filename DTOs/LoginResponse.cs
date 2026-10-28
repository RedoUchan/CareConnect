namespace web.DTOs
{
    public class LoginResponse
    {
        public string Token { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public int ExpiresIn { get; set; } // Tính bằng giây, ví dụ 86400 cho 1 ngày
        public int UserId { get; set; }
        public string Email { get; set; } = string.Empty;
        public string FullName { get; set; } = string.Empty;
    }
}
