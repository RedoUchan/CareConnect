using System.Collections.Generic;
using System.Threading.Tasks;
using web.DTOs;
using web.Models;

namespace web.Services
{
    public interface IRagService
    {
        /// <summary>
        /// Tìm kiếm các đoạn tri thức tương đồng nhất theo Vector Cosine Similarity
        /// </summary>
        Task<List<KnowledgeSearchResult>> SearchAsync(string query, int topK = 3, double minScore = 0.25);

        /// <summary>
        /// Lấy toàn bộ các đoạn tri thức đã được đánh chỉ mục trong hệ thống
        /// </summary>
        IReadOnlyList<KnowledgeChunk> GetAllChunks();

        /// <summary>
        /// Lấy chi tiết một đoạn tri thức theo mã định danh (Id)
        /// </summary>
        KnowledgeChunk? GetChunkById(string id);
    }

    public class KnowledgeSearchResult
    {
        public KnowledgeChunk Chunk { get; set; } = new();
        public double Score { get; set; }
        public string Snippet { get; set; } = string.Empty;
    }
}
