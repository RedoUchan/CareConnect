using System;

namespace web.Models
{
    public class PrescriptionDetail
    {
        public int PrescriptionDetailId { get; set; }

        public int MedicalRecordId { get; set; }
        public MedicalRecord MedicalRecord { get; set; } = null!;

        public int MedicineId { get; set; }
        public Medicine Medicine { get; set; } = null!;

        public int Quantity { get; set; }
        public string UsageInstruction { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
    }
}
