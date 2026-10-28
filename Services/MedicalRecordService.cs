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
    public class MedicalRecordService : IMedicalRecordService
    {
        private readonly AppDbContext _context;

        public MedicalRecordService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<MedicalRecordDto> CreateRecordAsync(int doctorId, CreateMedicalRecordRequest request)
        {
            // 1. Kiểm tra Bác sĩ lập hồ sơ
            var doctor = await _context.Users.FindAsync(doctorId);
            if (doctor == null || doctor.Role != "Doctor")
            {
                throw new ArgumentException("Bác sĩ lập bệnh án không hợp lệ hoặc không tồn tại.");
            }

            // 2. Kiểm tra Bệnh nhân
            var patient = await _context.Users.FindAsync(request.PatientId);
            if (patient == null || patient.Role != "Patient")
            {
                throw new ArgumentException("Bệnh nhân không hợp lệ hoặc không tồn tại.");
            }

            // 3. Xử lý Lịch hẹn đi kèm (nếu có)
            Appointment? appointment = null;
            decimal appointmentFee = 0;
            if (request.AppointmentId.HasValue)
            {
                appointment = await _context.Appointments.FindAsync(request.AppointmentId.Value);
                if (appointment == null)
                {
                    throw new ArgumentException("Lịch khám liên kết không tồn tại.");
                }
                if (appointment.DoctorId != doctorId || appointment.PatientId != request.PatientId)
                {
                    throw new ArgumentException("Lịch khám liên kết không khớp với thông tin Bác sĩ và Bệnh nhân này.");
                }

                // Cập nhật trạng thái cuộc hẹn thành Completed (Hoàn thành)
                appointment.Status = "Completed";
                appointmentFee = appointment.CalculatedFee;
            }

            // 4. Khởi tạo thực thể MedicalRecord
            var record = new MedicalRecord
            {
                PatientId = request.PatientId,
                DoctorId = doctorId,
                AppointmentId = request.AppointmentId,
                Diagnosis = request.Diagnosis.Trim(),
                Treatment = request.Treatment.Trim(),
                Prescription = request.Prescription?.Trim() ?? string.Empty,
                RecordDate = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                DispenseStatus = "NotDispensed"
            };

            // 5. Xử lý Kê đơn thuốc chi tiết
            decimal prescriptionFee = 0;
            var details = new List<PrescriptionDetail>();
            if (request.PrescriptionDetails != null && request.PrescriptionDetails.Any())
            {
                // Lấy danh sách ID thuốc để tối ưu hóa truy vấn
                var medIds = request.PrescriptionDetails.Select(pd => pd.MedicineId).Distinct().ToList();
                var medicines = await _context.Medicines
                    .Where(m => medIds.Contains(m.MedicineId))
                    .ToDictionaryAsync(m => m.MedicineId);

                foreach (var reqDetail in request.PrescriptionDetails)
                {
                    if (!medicines.TryGetValue(reqDetail.MedicineId, out var med))
                    {
                        throw new ArgumentException($"Thuốc với ID {reqDetail.MedicineId} không tồn tại trong danh mục.");
                    }

                    var detail = new PrescriptionDetail
                    {
                        MedicineId = reqDetail.MedicineId,
                        Quantity = reqDetail.Quantity,
                        UsageInstruction = string.IsNullOrWhiteSpace(reqDetail.UsageInstruction)
                            ? med.UsageInstruction
                            : reqDetail.UsageInstruction.Trim(),
                        UnitPrice = med.UnitPrice
                    };
                    details.Add(detail);
                    prescriptionFee += detail.UnitPrice * detail.Quantity;
                }
                record.PrescriptionDetails = details;
            }
            record.PrescriptionFee = prescriptionFee;

            // 6. Xử lý Chỉ định Cận lâm sàng
            decimal labFee = 0;
            var labRequests = new List<LabRequest>();
            if (request.LabRequests != null && request.LabRequests.Any())
            {
                foreach (var reqLab in request.LabRequests)
                {
                    var lab = new LabRequest
                    {
                        LabType = reqLab.LabType.Trim(),
                        Fee = reqLab.Fee,
                        Status = "Pending",
                        Results = string.Empty,
                        RecordDate = DateTime.UtcNow
                    };
                    labRequests.Add(lab);
                    labFee += lab.Fee;
                }
                record.LabRequests = labRequests;
            }

            // 7. Tính toán Tài chính & Khấu trừ Bảo hiểm Y tế (BHYT)
            decimal totalFee = appointmentFee + prescriptionFee + labFee;
            decimal insuranceCoveredFee = 0;

            if (patient.PatientType == "Insurance")
            {
                // Ưu tiên (trẻ em, người già, khuyết tật) được bao trả 95%, người thường được 80%
                decimal rate = patient.IsPriority ? 0.95m : 0.80m;
                insuranceCoveredFee = totalFee * rate;
            }
            else
            {
                insuranceCoveredFee = 0; // Tự chi trả 100%
            }

            decimal patientCoPayFee = totalFee - insuranceCoveredFee;

            record.TotalFee = totalFee;
            record.InsuranceCoveredFee = Math.Round(insuranceCoveredFee, 2);
            record.PatientCoPayFee = Math.Round(patientCoPayFee, 2);

            // Cập nhật trạng thái thanh toán viện phí
            record.BillingStatus = record.PatientCoPayFee <= 0 ? "Paid" : "Unpaid";

            _context.MedicalRecords.Add(record);
            await _context.SaveChangesAsync();

            // Nạp dữ liệu liên kết để ánh xạ DTO đầy đủ
            record.Patient = patient;
            record.Doctor = doctor;
            record.Appointment = appointment;

            // Tải lại mối quan hệ PrescriptionDetails và LabRequests để ánh xạ chính xác thuốc
            await _context.Entry(record).Collection(r => r.PrescriptionDetails).Query().Include(pd => pd.Medicine).LoadAsync();
            await _context.Entry(record).Collection(r => r.LabRequests).LoadAsync();

            return MapToDto(record);
        }

        public async Task<IEnumerable<MedicalRecordDto>> GetPatientRecordsAsync(int patientId)
        {
            var records = await _context.MedicalRecords
                .Include(m => m.Patient)
                .Include(m => m.Doctor)
                .Include(m => m.Appointment)
                .Include(m => m.PrescriptionDetails)
                    .ThenInclude(pd => pd.Medicine)
                .Include(m => m.LabRequests)
                .Where(m => m.PatientId == patientId)
                .OrderByDescending(m => m.RecordDate)
                .ToListAsync();

            return records.Select(MapToDto);
        }

        public async Task<IEnumerable<MedicalRecordDto>> GetDoctorRecordsAsync(int doctorId)
        {
            var records = await _context.MedicalRecords
                .Include(m => m.Patient)
                .Include(m => m.Doctor)
                .Include(m => m.Appointment)
                .Include(m => m.PrescriptionDetails)
                    .ThenInclude(pd => pd.Medicine)
                .Include(m => m.LabRequests)
                .Where(m => m.DoctorId == doctorId)
                .OrderByDescending(m => m.RecordDate)
                .ToListAsync();

            return records.Select(MapToDto);
        }

        public async Task<IEnumerable<MedicalRecordDto>> GetAllRecordsAsync()
        {
            var records = await _context.MedicalRecords
                .Include(m => m.Patient)
                .Include(m => m.Doctor)
                .Include(m => m.Appointment)
                .Include(m => m.PrescriptionDetails)
                    .ThenInclude(pd => pd.Medicine)
                .Include(m => m.LabRequests)
                .OrderByDescending(m => m.RecordDate)
                .ToListAsync();

            return records.Select(MapToDto);
        }

        public async Task<bool> PayRecordAsync(int recordId)
        {
            var record = await _context.MedicalRecords.FindAsync(recordId);
            if (record == null) return false;

            record.BillingStatus = "Paid";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> DispensePrescriptionAsync(int recordId)
        {
            var record = await _context.MedicalRecords
                .Include(m => m.PrescriptionDetails)
                    .ThenInclude(pd => pd.Medicine)
                .FirstOrDefaultAsync(m => m.MedicalRecordId == recordId);

            if (record == null) return false;

            // Kiểm tra trạng thái thanh toán viện phí trước khi cấp thuốc
            if (record.BillingStatus != "Paid")
            {
                throw new InvalidOperationException("Bệnh nhân chưa thanh toán hóa đơn viện phí/thuốc.");
            }

            if (record.DispenseStatus == "Dispensed")
            {
                return true; // Đã phát rồi
            }

            // Trừ số lượng tồn kho dược phẩm
            foreach (var detail in record.PrescriptionDetails)
            {
                if (detail.Medicine.StockQuantity < detail.Quantity)
                {
                    throw new InvalidOperationException($"Thuốc '{detail.Medicine.Name}' không đủ tồn kho để cấp phát (Yêu cầu: {detail.Quantity}, Tồn kho hiện tại: {detail.Medicine.StockQuantity}).");
                }
                detail.Medicine.StockQuantity -= detail.Quantity;
            }

            record.DispenseStatus = "Dispensed";
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<bool> UpdateLabRequestAsync(int recordId, int labRequestId, string results, string? imageUrl)
        {
            var lab = await _context.LabRequests
                .FirstOrDefaultAsync(l => l.LabRequestId == labRequestId && l.MedicalRecordId == recordId);

            if (lab == null) return false;

            lab.Results = results.Trim();
            lab.ImageUrl = imageUrl?.Trim();
            lab.Status = "Completed";
            lab.RecordDate = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<IEnumerable<MedicineDto>> GetAllMedicinesAsync()
        {
            var medicines = await _context.Medicines
                .OrderBy(m => m.Name)
                .ToListAsync();

            return medicines.Select(m => new MedicineDto
            {
                MedicineId = m.MedicineId,
                Name = m.Name,
                ActiveIngredient = m.ActiveIngredient,
                Unit = m.Unit,
                UnitPrice = m.UnitPrice,
                StockQuantity = m.StockQuantity,
                UsageInstruction = m.UsageInstruction
            });
        }

        public async Task<MedicineDto?> RestockMedicineAsync(int medicineId, int quantity)
        {
            var medicine = await _context.Medicines.FindAsync(medicineId);
            if (medicine == null) return null;

            if (quantity <= 0)
            {
                throw new ArgumentException("Số lượng nhập kho phải lớn hơn 0.");
            }

            medicine.StockQuantity += quantity;
            await _context.SaveChangesAsync();

            return new MedicineDto
            {
                MedicineId = medicine.MedicineId,
                Name = medicine.Name,
                ActiveIngredient = medicine.ActiveIngredient,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                StockQuantity = medicine.StockQuantity,
                UsageInstruction = medicine.UsageInstruction
            };
        }

        public async Task<MedicineDto> AddMedicineAsync(SaveMedicineRequest request)
        {
            var medicine = new Medicine
            {
                Name = request.Name.Trim(),
                ActiveIngredient = request.ActiveIngredient?.Trim() ?? string.Empty,
                Unit = request.Unit.Trim(),
                UnitPrice = request.UnitPrice,
                StockQuantity = request.StockQuantity,
                UsageInstruction = request.UsageInstruction?.Trim() ?? string.Empty
            };

            _context.Medicines.Add(medicine);
            await _context.SaveChangesAsync();

            return new MedicineDto
            {
                MedicineId = medicine.MedicineId,
                Name = medicine.Name,
                ActiveIngredient = medicine.ActiveIngredient,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                StockQuantity = medicine.StockQuantity,
                UsageInstruction = medicine.UsageInstruction
            };
        }

        public async Task<MedicineDto?> UpdateMedicineAsync(int medicineId, SaveMedicineRequest request)
        {
            var medicine = await _context.Medicines.FindAsync(medicineId);
            if (medicine == null) return null;

            medicine.Name = request.Name.Trim();
            medicine.ActiveIngredient = request.ActiveIngredient?.Trim() ?? string.Empty;
            medicine.Unit = request.Unit.Trim();
            medicine.UnitPrice = request.UnitPrice;
            medicine.StockQuantity = request.StockQuantity;
            medicine.UsageInstruction = request.UsageInstruction?.Trim() ?? string.Empty;

            await _context.SaveChangesAsync();

            return new MedicineDto
            {
                MedicineId = medicine.MedicineId,
                Name = medicine.Name,
                ActiveIngredient = medicine.ActiveIngredient,
                Unit = medicine.Unit,
                UnitPrice = medicine.UnitPrice,
                StockQuantity = medicine.StockQuantity,
                UsageInstruction = medicine.UsageInstruction
            };
        }

        public async Task<bool> DeleteMedicineAsync(int medicineId)
        {
            var medicine = await _context.Medicines.FindAsync(medicineId);
            if (medicine == null) return false;

            _context.Medicines.Remove(medicine);
            await _context.SaveChangesAsync();
            return true;
        }

        private static MedicalRecordDto MapToDto(MedicalRecord m) => new MedicalRecordDto
        {
            MedicalRecordId = m.MedicalRecordId,
            PatientId = m.PatientId,
            PatientName = m.Patient?.FullName ?? string.Empty,
            PatientEmail = m.Patient?.Email ?? string.Empty,
            DoctorId = m.DoctorId,
            DoctorName = m.Doctor?.FullName ?? string.Empty,
            DoctorEmail = m.Doctor?.Email ?? string.Empty,
            AppointmentId = m.AppointmentId,
            Diagnosis = m.Diagnosis,
            Treatment = m.Treatment,
            Prescription = m.Prescription,
            HospitalBranch = m.Doctor?.HospitalBranch ?? string.Empty,
            BloodPressure = m.Appointment?.BloodPressure,
            Temperature = m.Appointment?.Temperature,
            Weight = m.Appointment?.Weight,
            HeartRate = m.Appointment?.HeartRate,
            PrescriptionFee = m.PrescriptionFee,
            BillingStatus = m.BillingStatus,
            DispenseStatus = m.DispenseStatus,
            TotalFee = m.TotalFee,
            InsuranceCoveredFee = m.InsuranceCoveredFee,
            PatientCoPayFee = m.PatientCoPayFee,
            RecordDate = m.RecordDate,
            PrescriptionDetails = m.PrescriptionDetails?.Select(pd => new PrescriptionDetailDto
            {
                PrescriptionDetailId = pd.PrescriptionDetailId,
                MedicineId = pd.MedicineId,
                MedicineName = pd.Medicine?.Name ?? string.Empty,
                ActiveIngredient = pd.Medicine?.ActiveIngredient ?? string.Empty,
                Unit = pd.Medicine?.Unit ?? string.Empty,
                Quantity = pd.Quantity,
                UsageInstruction = pd.UsageInstruction,
                UnitPrice = pd.UnitPrice
            }).ToList() ?? new List<PrescriptionDetailDto>(),
            LabRequests = m.LabRequests?.Select(lr => new LabRequestDto
            {
                LabRequestId = lr.LabRequestId,
                LabType = lr.LabType,
                Fee = lr.Fee,
                Status = lr.Status,
                Results = lr.Results,
                ImageUrl = lr.ImageUrl,
                RecordDate = lr.RecordDate
            }).ToList() ?? new List<LabRequestDto>()
        };
    }
}
