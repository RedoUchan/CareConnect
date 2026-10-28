using System;

namespace web.DTOs
{
    public class MedicalRecordDto
    {
        public int MedicalRecordId { get; set; }
        
        public int PatientId { get; set; }
        public string PatientName { get; set; } = string.Empty;
        public string PatientEmail { get; set; } = string.Empty;

        public int DoctorId { get; set; }
        public string DoctorName { get; set; } = string.Empty;
        public string DoctorEmail { get; set; } = string.Empty;

        public int? AppointmentId { get; set; }
        public string Diagnosis { get; set; } = string.Empty;
        public string Treatment { get; set; } = string.Empty;
        public string Prescription { get; set; } = string.Empty;
        public string? HospitalBranch { get; set; } = string.Empty;
        
        // Vitals
        public string? BloodPressure { get; set; }
        public string? Temperature { get; set; }
        public string? Weight { get; set; }
        public string? HeartRate { get; set; }
        
        public decimal PrescriptionFee { get; set; }
        public string BillingStatus { get; set; } = "Paid"; // Unpaid, Paid
        public string DispenseStatus { get; set; } = "NotDispensed"; // NotDispensed, Dispensed

        public decimal TotalFee { get; set; }
        public decimal InsuranceCoveredFee { get; set; }
        public decimal PatientCoPayFee { get; set; }

        public List<PrescriptionDetailDto> PrescriptionDetails { get; set; } = new();
        public List<LabRequestDto> LabRequests { get; set; } = new();

        public DateTime RecordDate { get; set; }
    }
}
