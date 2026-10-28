using System.Collections.Generic;
using System.Threading.Tasks;
using web.DTOs;

namespace web.Services
{
    public interface IMedicalRecordService
    {
        Task<MedicalRecordDto> CreateRecordAsync(int doctorId, CreateMedicalRecordRequest request);
        Task<IEnumerable<MedicalRecordDto>> GetPatientRecordsAsync(int patientId);
        Task<IEnumerable<MedicalRecordDto>> GetDoctorRecordsAsync(int doctorId);
        Task<IEnumerable<MedicalRecordDto>> GetAllRecordsAsync();
        Task<bool> PayRecordAsync(int recordId);
        Task<bool> DispensePrescriptionAsync(int recordId);
        Task<bool> UpdateLabRequestAsync(int recordId, int labRequestId, string results, string? imageUrl);
        Task<IEnumerable<MedicineDto>> GetAllMedicinesAsync();
        Task<MedicineDto?> RestockMedicineAsync(int medicineId, int quantity);
        Task<MedicineDto> AddMedicineAsync(SaveMedicineRequest request);
        Task<MedicineDto?> UpdateMedicineAsync(int medicineId, SaveMedicineRequest request);
        Task<bool> DeleteMedicineAsync(int medicineId);
    }
}
