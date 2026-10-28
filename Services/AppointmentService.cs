using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using web.Data;
using web.DTOs;
using web.Models;

namespace web.Services
{
    public class AppointmentService : IAppointmentService
    {
        private readonly AppDbContext _context;

        public AppointmentService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<AppointmentDto> BookAppointmentAsync(int patientId, CreateAppointmentRequest request)
        {
            // 1. Kiểm tra Bệnh nhân tồn tại
            var patient = await _context.Users.FindAsync(patientId);
            if (patient == null || patient.Role != "Patient")
            {
                throw new ArgumentException("Bệnh nhân không hợp lệ hoặc không tồn tại.");
            }

            // 2. Kiểm tra Bác sĩ tồn tại và đúng vai trò
            var doctor = await _context.Users.FindAsync(request.DoctorId);
            if (doctor == null || doctor.Role != "Doctor")
            {
                throw new ArgumentException("Bác sĩ được chọn không tồn tại hoặc không hợp lệ.");
            }

            // 3. Kiểm tra ngày đặt lịch không ở quá khứ
            if (request.AppointmentDate.Date < DateTime.Today)
            {
                throw new InvalidOperationException("Không thể đặt lịch khám cho các ngày trong quá khứ.");
            }

            // 4. Kiểm tra bác sĩ có ca trực rảnh này không
            var bookingDate = request.AppointmentDate.Date;
            bool isSlotAvailable = await _context.DoctorSchedules
                .AnyAsync(s => s.DoctorId == request.DoctorId 
                            && s.AvailableDate.Year == bookingDate.Year
                            && s.AvailableDate.Month == bookingDate.Month
                            && s.AvailableDate.Day == bookingDate.Day
                            && s.TimeSlot.ToLower() == request.TimeSlot.ToLower());

            if (!isSlotAvailable)
            {
                throw new InvalidOperationException("Bác sĩ không có lịch trực rảnh vào ngày và ca khám đã chọn.");
            }

            // 5. Kiểm tra trùng lịch (Double-Booking) cho bác sĩ
            bool isDoubleBooked = await _context.Appointments
                .AnyAsync(a => a.DoctorId == request.DoctorId 
                            && a.AppointmentDate.Year == bookingDate.Year
                            && a.AppointmentDate.Month == bookingDate.Month
                            && a.AppointmentDate.Day == bookingDate.Day
                            && a.TimeSlot.ToLower() == request.TimeSlot.ToLower()
                            && a.Status != "Cancelled");

            if (isDoubleBooked)
            {
                throw new InvalidOperationException("Bác sĩ đã có lịch khám vào ngày và ca khám này. Vui lòng chọn ca hoặc giờ khác.");
            }

            // 6. Kiểm tra trùng lịch (Double-Booking) cho bệnh nhân
            bool isPatientDoubleBooked = await _context.Appointments
                .AnyAsync(a => a.PatientId == patientId
                            && a.AppointmentDate.Year == bookingDate.Year
                            && a.AppointmentDate.Month == bookingDate.Month
                            && a.AppointmentDate.Day == bookingDate.Day
                            && a.TimeSlot.ToLower() == request.TimeSlot.ToLower()
                            && a.Status != "Cancelled");

            if (isPatientDoubleBooked)
            {
                throw new InvalidOperationException("Bạn đã có một lịch hẹn khám khác vào ngày và khung giờ này. Vui lòng chọn giờ hoặc ngày khác.");
            }

            // 7. Tạo cuộc hẹn mới
            var serviceTier = request.ServiceTier?.Trim() ?? patient.ServiceTier ?? "Standard";
            var isPriority = request.IsPriority ?? patient.IsPriority;
            var priorityReason = request.PriorityReason?.Trim() ?? patient.PriorityReason;
            decimal calculatedFee = serviceTier == "VIP" ? 300000 : (patient.PatientType == "Insurance" ? 0 : 150000);

            var appointment = new Appointment
            {
                PatientId = patientId,
                DoctorId = request.DoctorId,
                AppointmentDate = request.AppointmentDate.Date,
                TimeSlot = request.TimeSlot.Trim(),
                Symptoms = request.Symptoms.Trim(),
                Status = "Pending",
                HospitalBranch = doctor.HospitalBranch,
                IsPriority = isPriority,
                PriorityReason = priorityReason,
                ServiceTier = serviceTier,
                CalculatedFee = calculatedFee,
                AiChatHistory = request.AiChatHistory?.Trim(),
                CreatedAt = DateTime.UtcNow
            };

            _context.Appointments.Add(appointment);
            await _context.SaveChangesAsync();

            // Nạp lại các navigation properties để lấy tên và email của Bệnh nhân & Bác sĩ
            appointment.Patient = patient;
            appointment.Doctor = doctor;

            return MapToDto(appointment);
        }

        public async Task<IEnumerable<AppointmentDto>> GetPatientAppointmentsAsync(int patientId)
        {
            var appointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .Where(a => a.PatientId == patientId)
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.TimeSlot)
                .ToListAsync();

            return appointments.Select(MapToDto);
        }

        public async Task<IEnumerable<AppointmentDto>> GetDoctorAppointmentsAsync(int doctorId)
        {
            var appointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .Where(a => a.DoctorId == doctorId)
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.TimeSlot)
                .ToListAsync();

            return appointments.Select(MapToDto);
        }

        public async Task<IEnumerable<AppointmentDto>> GetAllAppointmentsAsync()
        {
            var appointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.TimeSlot)
                .ToListAsync();

            return appointments.Select(MapToDto);
        }

        public async Task<bool> UpdateStatusAsync(int appointmentId, string status, int userId, string userRole, string? bp = null, string? temp = null, string? weight = null, string? hr = null, string? paymentMethod = null, string? paymentTransactionId = null)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null)
            {
                return false;
            }

            // Phân quyền cập nhật trạng thái:
            // - Bác sĩ chỉ được cập nhật lịch của chính họ.
            // - Quản trị viên (Admin) có quyền cập nhật bất kỳ lịch nào.
            // - Bệnh nhân (Patient) chỉ được phép hủy (Cancelled) lịch hẹn của chính họ.
            // - Nhân viên tiếp đón (Receptionist) chỉ được cập nhật sang Confirmed, CheckedIn, Cancelled.
            if (userRole == "Doctor" && appointment.DoctorId != userId)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền cập nhật lịch hẹn của bác sĩ khác.");
            }

            if (userRole == "Patient")
            {
                if (appointment.PatientId != userId)
                {
                    throw new UnauthorizedAccessException("Bạn không có quyền cập nhật lịch hẹn của bệnh nhân khác.");
                }
                if (status != "Cancelled" && status != "Confirmed")
                {
                    throw new UnauthorizedAccessException("Bệnh nhân chỉ có quyền tự hủy lịch khám hoặc xác nhận thanh toán.");
                }
            }
            if (userRole == "Receptionist" && status != "Confirmed" && status != "CheckedIn" && status != "Cancelled")
            {
                throw new UnauthorizedAccessException("Nhân viên tiếp đón chỉ được xác nhận (Confirmed), tiếp đón (CheckedIn) hoặc hủy (Cancelled) lịch khám.");
            }
            if (userRole != "Admin" && userRole != "Doctor" && userRole != "Patient" && userRole != "Receptionist")
            {
                throw new UnauthorizedAccessException("Chỉ có Bác sĩ, Bệnh nhân, Nhân viên tiếp đón hoặc Quản trị viên mới được cập nhật trạng thái lịch khám.");
            }

            appointment.Status = status;
            
            if (status == "CheckedIn")
            {
                appointment.BloodPressure = bp;
                appointment.Temperature = temp;
                appointment.Weight = weight;
                appointment.HeartRate = hr;
            }

            if (!string.IsNullOrEmpty(paymentMethod))
            {
                appointment.PaymentMethod = paymentMethod;
                appointment.PaymentTransactionId = paymentTransactionId;
            }

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> RescheduleAsync(int appointmentId, DateTime newDate, string newTimeSlot, int userId, string userRole)
        {
            var appointment = await _context.Appointments.FindAsync(appointmentId);
            if (appointment == null)
            {
                return false;
            }

            if (userRole == "Patient" && appointment.PatientId != userId)
            {
                throw new UnauthorizedAccessException("Bạn không có quyền đổi lịch hẹn của người khác.");
            }

            if (appointment.Status != "Pending" && appointment.Status != "Confirmed")
            {
                throw new InvalidOperationException("Chỉ có thể đổi lịch hẹn đối với các cuộc hẹn đang chờ (Pending) hoặc đã xác nhận (Confirmed).");
            }

            if (newDate.Date < DateTime.Today)
            {
                throw new InvalidOperationException("Không thể đặt lịch khám cho các ngày trong quá khứ.");
            }

            var bookingDate = newDate.Date;
            bool isSlotAvailable = await _context.DoctorSchedules
                .AnyAsync(s => s.DoctorId == appointment.DoctorId 
                            && s.AvailableDate.Year == bookingDate.Year
                            && s.AvailableDate.Month == bookingDate.Month
                            && s.AvailableDate.Day == bookingDate.Day
                            && s.TimeSlot.ToLower() == newTimeSlot.ToLower());

            if (!isSlotAvailable)
            {
                throw new InvalidOperationException("Bác sĩ không có lịch trực rảnh vào ngày và ca khám đã chọn.");
            }

            bool isDoubleBooked = await _context.Appointments
                .AnyAsync(a => a.AppointmentId != appointmentId
                            && a.DoctorId == appointment.DoctorId 
                            && a.AppointmentDate.Year == bookingDate.Year
                            && a.AppointmentDate.Month == bookingDate.Month
                            && a.AppointmentDate.Day == bookingDate.Day
                            && a.TimeSlot.ToLower() == newTimeSlot.ToLower()
                            && a.Status != "Cancelled");

            if (isDoubleBooked)
            {
                throw new InvalidOperationException("Bác sĩ đã có lịch khám khác vào ngày và ca khám này.");
            }

            // Kiểm tra trùng lịch cho bệnh nhân khi đổi lịch
            bool isPatientDoubleBooked = await _context.Appointments
                .AnyAsync(a => a.AppointmentId != appointmentId
                            && a.PatientId == appointment.PatientId
                            && a.AppointmentDate.Year == bookingDate.Year
                            && a.AppointmentDate.Month == bookingDate.Month
                            && a.AppointmentDate.Day == bookingDate.Day
                            && a.TimeSlot.ToLower() == newTimeSlot.ToLower()
                            && a.Status != "Cancelled");

            if (isPatientDoubleBooked)
            {
                throw new InvalidOperationException("Bệnh nhân đã có lịch hẹn khám khác vào ngày và khung giờ này. Vui lòng chọn giờ hoặc ngày khác.");
            }

            appointment.AppointmentDate = newDate.Date;
            appointment.TimeSlot = newTimeSlot.Trim();
            appointment.Status = "Pending"; // Đặt lại về chờ duyệt sau khi đổi lịch

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<AppointmentDto>> SearchAppointmentsAsync(string query, string searchType)
        {
            var queryNorm = (query ?? string.Empty).Trim();
            IQueryable<Appointment> baseQuery = _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor);

            if (searchType == "national_id")
            {
                baseQuery = baseQuery.Where(a => a.Patient != null && a.Patient.NationalId != null && a.Patient.NationalId == queryNorm);
            }
            else // default: phone
            {
                baseQuery = baseQuery.Where(a => a.Patient != null && a.Patient.PhoneNumber != null && a.Patient.PhoneNumber == queryNorm);
            }

            var appointments = await baseQuery
                .OrderByDescending(a => a.AppointmentDate)
                .ThenBy(a => a.TimeSlot)
                .ToListAsync();

            return appointments.Select(MapToDto);
        }

        public async Task<IEnumerable<AppointmentDto>> GetTodayAppointmentsAsync()
        {
            var today = DateTime.UtcNow.Date;
            var appointments = await _context.Appointments
                .Include(a => a.Patient)
                .Include(a => a.Doctor)
                .Where(a => a.AppointmentDate.Year == today.Year
                         && a.AppointmentDate.Month == today.Month
                         && a.AppointmentDate.Day == today.Day)
                .OrderBy(a => a.TimeSlot)
                .ToListAsync();

            return appointments.Select(MapToDto);
        }

        private static AppointmentDto MapToDto(Appointment a) => new AppointmentDto
        {
            AppointmentId = a.AppointmentId,
            PatientId = a.PatientId,
            PatientName = a.Patient?.FullName ?? string.Empty,
            PatientEmail = a.Patient?.Email ?? string.Empty,
            PatientPhone = a.Patient?.PhoneNumber ?? string.Empty,
            PatientDob = a.Patient?.DateOfBirth,
            PatientGender = a.Patient?.Gender ?? string.Empty,
            PatientBloodType = a.Patient?.BloodType ?? string.Empty,
            PatientAddress = a.Patient?.Address ?? string.Empty,
            PatientInsuranceCardNumber = a.Patient?.InsuranceCardNumber ?? string.Empty,
            PatientNationalId = a.Patient?.NationalId ?? string.Empty,
            PatientType = a.Patient?.PatientType ?? string.Empty,
            DoctorId = a.DoctorId,
            DoctorName = a.Doctor?.FullName ?? string.Empty,
            DoctorEmail = a.Doctor?.Email ?? string.Empty,
            AppointmentDate = a.AppointmentDate,
            TimeSlot = a.TimeSlot,
            Symptoms = a.Symptoms,
            Status = a.Status,
            HospitalBranch = a.HospitalBranch,
            BloodPressure = a.BloodPressure,
            Temperature = a.Temperature,
            Weight = a.Weight,
            HeartRate = a.HeartRate,
            PaymentMethod = a.PaymentMethod,
            PaymentTransactionId = a.PaymentTransactionId,
            IsEmergency = a.IsEmergency,
            IsPriority = a.IsPriority,
            PriorityReason = a.PriorityReason,
            ServiceTier = a.ServiceTier,
            CalculatedFee = a.CalculatedFee,
            AiChatHistory = a.AiChatHistory,
            CreatedAt = a.CreatedAt
        };
    }
}
