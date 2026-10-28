using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using web.DTOs;
using web.Services;

namespace web.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [AllowAnonymous]
    [ApiExplorerSettings(GroupName = "ai")]
    public class AiController : ControllerBase
    {
        private readonly IAiService _aiService;
        private readonly IRagService _ragService;

        public AiController(IAiService aiService, IRagService ragService)
        {
            _aiService = aiService;
            _ragService = ragService;
        }

        // POST /api/ai/chat
        [HttpPost("chat")]
        public async Task<IActionResult> Chat([FromBody] AiChatRequest request)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            try
            {
                var response = await _aiService.GenerateResponseAsync(request.Message, request.History);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi xử lý phản hồi từ AI.", details = ex.Message });
            }
        }

        // POST /api/ai/analyze-symptoms
        [HttpPost("analyze-symptoms")]
        public async Task<IActionResult> AnalyzeSymptoms([FromBody] SymptomAnalysisRequest request)
        {
            if (request == null || string.IsNullOrEmpty(request.Symptoms))
            {
                return BadRequest(new { message = "Nội dung triệu chứng không được để trống." });
            }

            try
            {
                var response = await _aiService.AnalyzeSymptomsAsync(request.Symptoms);
                return Ok(response);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi phân tích triệu chứng từ AI.", details = ex.Message });
            }
        }

        // GET /api/ai/trending-news
        [HttpGet("trending-news")]
        public async Task<IActionResult> GetTrendingNews([FromQuery] bool force = false)
        {
            try
            {
                var news = await _aiService.GetTrendingNewsAsync(force);
                return Ok(news);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi tải tin tức y khoa.", details = ex.Message });
            }
        }

        /// <summary>
        /// Truy vấn tìm kiếm ngữ nghĩa theo Vector Cosine Similarity trong Kho dữ liệu y tế CareConnect
        /// </summary>
        // POST /api/ai/rag/search
        [HttpPost("rag/search")]
        public async Task<IActionResult> SearchKnowledge([FromBody] RagQueryRequest request)
        {
            if (request == null || string.IsNullOrWhiteSpace(request.Query))
            {
                return BadRequest(new { message = "Nội dung truy vấn không được để trống." });
            }

            try
            {
                var results = await _ragService.SearchAsync(request.Query, request.TopK, request.MinScore);
                return Ok(new
                {
                    query = request.Query,
                    matchCount = results.Count,
                    results = results.Select(r => new
                    {
                        score = r.Score,
                        title = r.Chunk.Title,
                        category = r.Chunk.Category,
                        sourceDocument = r.Chunk.SourceDocument,
                        snippet = r.Snippet,
                        fullContent = r.Chunk.Content
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi truy vấn Vector RAG.", details = ex.Message });
            }
        }

        /// <summary>
        /// Lấy toàn bộ danh sách các đoạn tri thức (Knowledge Chunks) đã nạp trong kho CareConnect
        /// </summary>
        // GET /api/ai/rag/knowledge-base
        [HttpGet("rag/knowledge-base")]
        public IActionResult GetKnowledgeBase()
        {
            try
            {
                var chunks = _ragService.GetAllChunks();
                return Ok(new
                {
                    totalChunks = chunks.Count,
                    chunks = chunks.Select(c => new
                    {
                        id = c.Id,
                        title = c.Title,
                        category = c.Category,
                        sourceDocument = c.SourceDocument,
                        keywords = c.Keywords,
                        contentLength = c.Content.Length,
                        preview = c.Content.Length > 160 ? c.Content.Substring(0, 160) + "..." : c.Content,
                        content = c.Content
                    })
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi lấy dữ liệu tri thức.", details = ex.Message });
            }
        }

        /// <summary>
        /// Lấy chi tiết một đoạn tri thức theo mã định danh (Id)
        /// </summary>
        // GET /api/ai/rag/chunk/{id}
        [HttpGet("rag/chunk/{id}")]
        public IActionResult GetKnowledgeChunkById(string id)
        {
            try
            {
                var chunk = _ragService.GetChunkById(id);
                if (chunk == null)
                {
                    return NotFound(new { message = $"Không tìm thấy tài liệu tri thức với mã: {id}" });
                }

                return Ok(new
                {
                    id = chunk.Id,
                    title = chunk.Title,
                    category = chunk.Category,
                    sourceDocument = chunk.SourceDocument,
                    keywords = chunk.Keywords,
                    content = chunk.Content
                });
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Lỗi truy xuất tài liệu tri thức.", details = ex.Message });
            }
        }
    }

    public class SymptomAnalysisRequest
    {
        public string Symptoms { get; set; } = string.Empty;
    }
}

