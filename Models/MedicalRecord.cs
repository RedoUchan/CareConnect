using System;

namespace web.Models
{
    public class MedicalRecord
    {
        public int MedicalRecordId { get; set; }

        public int PatientId { get; set; }
        public User Patient { get; set; } = null!;

        public int DoctorId { get; set; }
        public User Doctor { get; set; } = null!;

        public int? AppointmentId { get; set; }
        public Appointment? Appointment { get; set; }

        public string Diagnosis { get; set; } = string.Empty; // Chẩn đoán bệnh
        public string Treatment { get; set; } = string.Empty; // Phương án điều trị
        public string Prescription { get; set; } = string.Empty; // Đơn thuốc kê kèm theo

        public decimal PrescriptionFee { get; set; } = 0;
        public string BillingStatus { get; set; } = "Paid"; // Unpaid, Paid
        public string DispenseStatus { get; set; } = "NotDispensed"; // NotDispensed, Dispensed

        public decimal TotalFee { get; set; } = 0;
        public decimal InsuranceCoveredFee { get; set; } = 0;
        public decimal PatientCoPayFee { get; set; } = 0;

        public ICollection<PrescriptionDetail> PrescriptionDetails { get; set; } = new List<PrescriptionDetail>();
        public ICollection<LabRequest> LabRequests { get; set; } = new List<LabRequest>();

        public DateTime RecordDate { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
