namespace web.DTOs
{
    public class MedicineDto
    {
        public int MedicineId { get; set; }
        public string Name { get; set; } = string.Empty;
        public string ActiveIngredient { get; set; } = string.Empty;
        public string Unit { get; set; } = string.Empty;
        public decimal UnitPrice { get; set; }
        public int StockQuantity { get; set; }
        public string UsageInstruction { get; set; } = string.Empty;
    }
}
