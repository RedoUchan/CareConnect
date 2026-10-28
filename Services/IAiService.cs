using System.Collections.Generic;
using System.Threading.Tasks;
using web.DTOs;

namespace web.Services
{
    public interface IAiService
    {
        Task<AiChatResponse> GenerateResponseAsync(string userMessage, List<string> history);
        Task<AiChatResponse> AnalyzeSymptomsAsync(string symptoms);
        Task<List<NewsArticleDto>> GetTrendingNewsAsync(bool forceRefresh = false);
    }
}
