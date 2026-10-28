using System.Threading.Tasks;

namespace web.Services
{
    public interface INotificationService
    {
        Task SendNotificationAsync(string? deviceToken, string title, string body);
    }
}
