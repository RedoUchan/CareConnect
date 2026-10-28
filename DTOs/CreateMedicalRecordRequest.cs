using System.ComponentModel.DataAnnotations;

namespace web.DTOs
{
    public class CreateMedicalRecordRequest
    {
        [Required(ErrorMessage = "Mã bệnh nhân (PatientId) là bắt buộc.")]
        public int PatientId { get; set; }

        public int? AppointmentId { get; set; }

        [Required(ErrorMessage = "Chẩn đoán bệnh (Diagnosis) là bắt buộc.")]
        [MaxLength(250, ErrorMessage = "Chẩn đoán không được vượt quá 250 ký tự.")]
        public string Diagnosis { get; set; } = string.Empty;

        [Required(ErrorMessage = "Phương án điều trị (Treatment) là bắt buộc.")]
        [MaxLength(500, ErrorMessage = "Phương án điều trị không được vượt quá 500 ký tự.")]
        public string Treatment { get; set; } = string.Empty;

        [MaxLength(1000, ErrorMessage = "Đơn thuốc (Prescription) không được vượt quá 1000 ký tự.")]
        public string Prescription { get; set; } = string.Empty;

        public List<CreatePrescriptionDetailRequest> PrescriptionDetails { get; set; } = new();
        public List<CreateLabRequestRequest> LabRequests { get; set; } = new();
    }
}
