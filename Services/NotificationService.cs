using System;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;

namespace web.Services
{
    public class NotificationService : INotificationService
    {
        private readonly ILogger<NotificationService> _logger;

        public NotificationService(ILogger<NotificationService> logger)
        {
            _logger = logger;
        }

        public Task SendNotificationAsync(string? deviceToken, string title, string body)
        {
            if (string.IsNullOrEmpty(deviceToken))
            {
                _logger.LogWarning("Không thể gửi thông báo đẩy: Device Token trống.");
                return Task.CompletedTask;
            }

            // Ghi nhận thông báo đẩy FCM mô phỏng ra Console/Logger
            _logger.LogInformation("--- PUSH NOTIFICATION SIMULATOR ---");
            _logger.LogInformation("Device Token: {Token}", deviceToken);
            _logger.LogInformation("Title       : {Title}", title);
            _logger.LogInformation("Body        : {Body}", body);
            _logger.LogInformation("-----------------------------------");

            // LƯU Ý CHO ĐỒ ÁN TỐT NGHIỆP:
            // Để triển khai thực tế trên môi trường Production, bạn tích hợp FirebaseAdmin SDK:
            // 1. Thêm gói NuGet: FirebaseAdmin
            // 2. Nạp credential từ file JSON: FirebaseApp.Create(new AppOptions() { Credential = GoogleCredential.FromFile("path/to/firebase-sdk.json") });
            // 3. Gửi tin nhắn thực tế:
            //    var message = new FirebaseAdmin.Messaging.Message() {
            //        Token = deviceToken,
            //        Notification = new FirebaseAdmin.Messaging.Notification() { Title = title, Body = body }
            //    };
            //    await FirebaseAdmin.Messaging.FirebaseMessaging.DefaultInstance.SendAsync(message);

            return Task.CompletedTask;
        }
    }
}
