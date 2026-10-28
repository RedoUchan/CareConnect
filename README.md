# CareConnect - Hệ Thống Đặt Lịch Khám & Tư Vấn Y Tế Thông Minh

CareConnect là giải pháp quản lý y tế toàn diện, hỗ trợ đặt lịch khám bệnh trực tuyến, quản lý bệnh án, danh sách bác sĩ, và tư vấn y tế thông minh thông qua AI Chatbot (tích hợp RAG - Retrieval Augmented Generation).

## Tính năng nổi bật

- 📅 **Đặt lịch khám bệnh trực tuyến**: Lựa chọn chuyên khoa, bác sĩ, khung giờ khám linh hoạt.
- 👨‍⚕️ **Quản lý y tế & bác sĩ**: Quản lý lịch trực, thông tin bác sĩ, khoa phòng, hồ sơ bệnh nhân.
- 🤖 **AI Y tế thông minh (RAG + AI Assistant)**:
  - Tự động tra cứu cơ sở tri thức y khoa để giải đáp thắc mắc sức khỏe và hướng dẫn chuyên khoa phù hợp.
  - Quản lý và nạp tài liệu y tế (Knowledge Base).
- 📱 **Đa nền tảng**:
  - Giao diện Web Responsive hiện đại (tích hợp sẵn trong `wwwroot/`).
  - Ứng dụng di động Flutter (`mobile_client/`).
- 🔐 **Bảo mật & Phân quyền**: Xác thực JWT, phân quyền Quản trị viên (Admin), Bác sĩ (Doctor), Bệnh nhân (Patient).

## Công nghệ sử dụng

- **Backend**: ASP.NET Core (.NET 8.0), Entity Framework Core
- **Database**: SQLite (`hospital.db`)
- **Frontend Web**: HTML5, CSS3, JavaScript (Vanilla), Leaflet (bản đồ tuyến đường)
- **Mobile App**: Flutter / Dart
- **AI / NLP**: RAG engine, Google Gemini API

## Cấu trúc thư mục

```
web/
├── Controllers/       # API Controllers (Auth, Appointment, Doctor, Ai, KnowledgeBase...)
├── Data/              # DbContext & cấu hình cơ sở dữ liệu
├── DTOs/              # Data Transfer Objects
├── Models/            # Domain Models & Entities
├── Services/          # Nghiệp vụ (AiService, RagService...)
├── wwwroot/           # Giao diện Web SPA (HTML, CSS, JS, Assets)
├── mobile_client/     # Ứng dụng di động Flutter
├── hospital.db        # Cơ sở dữ liệu SQLite
└── Program.cs         # Cấu hình dịch vụ & pipeline ASP.NET Core
```

## Hướng dẫn cài đặt & Chạy ứng dụng

### 1. Yêu cầu hệ thống
- .NET 8.0 SDK
- Flutter SDK (cho ứng dụng di động)

### 2. Chạy Web Backend & Frontend
```bash
dotnet restore
dotnet build
dotnet run
```
Truy cập ứng dụng tại: `http://localhost:5000` hoặc cổng được chỉ định trong terminal.

### 3. Chạy Mobile Client (Tùy chọn)
```bash
cd mobile_client
flutter pub get
flutter run
```
