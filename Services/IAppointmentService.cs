using System.Collections.Generic;
using System.Threading.Tasks;
using web.DTOs;

namespace web.Services
{
    public interface IAppointmentService
    {
        Task<AppointmentDto> BookAppointmentAsync(int patientId, CreateAppointmentRequest request);
        Task<IEnumerable<AppointmentDto>> GetPatientAppointmentsAsync(int patientId);
        Task<IEnumerable<AppointmentDto>> GetDoctorAppointmentsAsync(int doctorId);
        Task<IEnumerable<AppointmentDto>> GetAllAppointmentsAsync();
        Task<bool> UpdateStatusAsync(int appointmentId, string status, int userId, string userRole, string? bp = null, string? temp = null, string? weight = null, string? hr = null, string? paymentMethod = null, string? paymentTransactionId = null);
        Task<bool> RescheduleAsync(int appointmentId, DateTime newDate, string newTimeSlot, int userId, string userRole);
        Task<IEnumerable<AppointmentDto>> SearchAppointmentsAsync(string query, string searchType);
        Task<IEnumerable<AppointmentDto>> GetTodayAppointmentsAsync();
    }
}
