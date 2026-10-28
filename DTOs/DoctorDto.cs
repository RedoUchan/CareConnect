namespace web.DTOs
{
    public class DoctorDto
    {
        public int UserId { get; set; }
        public string FullName { get; set; } = string.Empty;
        public string? Specialization { get; set; }
        public string? HospitalBranch { get; set; }
    }
}
