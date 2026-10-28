namespace web.DTOs
{
    public class PrescriptionDetailDto
    {
        public int PrescriptionDetailId { get; set; }
        public int MedicineId { get; set; }
        public string MedicineName { get; set; } = string.Empty;
        public string ActiveIngredient { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public int Quantity { get; set; }
        public string UsageInstruction { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
    }
}
