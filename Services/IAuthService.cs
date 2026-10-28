using System.Collections.Generic;
using System.Threading.Tasks;
using web.DTOs;
using web.Models;


namespace web.Services
{
    public interface IAuthService
    {
        Task<LoginResponse?> LoginAsync(LoginRequest request);
        Task<User> RegisterAsync(RegisterRequest request);
        Task<VerifyCitizenResult> VerifyCitizenAsync(VerifyCitizenRequest request);
        Task<bool> ResetPasswordAsync(ResetPasswordRequest request);
        Task<IEnumerable<DoctorDto>> GetDoctorsAsync();
        Task<User?> GetProfileAsync(int userId);
        Task<bool> UpdateProfileAsync(int userId, UpdateProfileRequest request);
    }
}

