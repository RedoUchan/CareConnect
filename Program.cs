using System;
using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Scalar.AspNetCore;
using web.Data;
using web.Services;

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseSentry();

// Add services to the container.
builder.Services.AddControllers();

// Đăng ký dịch vụ CORS hỗ trợ di động và web client khác
builder.Services.AddCors(options =>
{
    options.AddPolicy("MobileCorsPolicy", policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

// Đăng ký AppDbContext sử dụng SQLite
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

// Đăng ký AuthService thông qua Dependency Injection
builder.Services.AddScoped<IAuthService, AuthService>();

// Đăng ký RAG Knowledge & Vector Engine Service (Cosine Similarity & Anti-Hallucination)
builder.Services.AddSingleton<IRagService, RagService>();

// Đăng ký HttpClient và Trợ lý AI Service
builder.Services.AddHttpClient<IAiService, AiService>();


// Đăng ký AppointmentService thông qua Dependency Injection
builder.Services.AddScoped<IAppointmentService, AppointmentService>();

// Đăng ký MedicalRecordService thông qua Dependency Injection
builder.Services.AddScoped<IMedicalRecordService, MedicalRecordService>();

// Đăng ký NotificationService thông qua Dependency Injection
builder.Services.AddScoped<INotificationService, NotificationService>();

// Cấu hình JWT Bearer Authentication
var jwtKey = builder.Configuration["Jwt:Key"];
if (string.IsNullOrEmpty(jwtKey) || jwtKey == "SuperSecretJWTKeyForHospitalSystem2026!")
{
    if (!builder.Environment.IsDevelopment())
    {
        throw new InvalidOperationException("CRITICAL SECURITY ERROR: Bạn phải cấu hình một JWT Secret Key an toàn trong môi trường Production. Không được sử dụng khóa mặc định của nhà phát triển.");
    }
    else
    {
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("=================================================================================");
        Console.WriteLine("[CẢNH BÁO BẢO MẬT] Đang sử dụng khóa JWT mặc định cho môi trường phát triển (Dev).");
        Console.WriteLine("Vui lòng thay đổi khóa này khi triển khai thực tế (Production).");
        Console.WriteLine("=================================================================================");
        Console.ResetColor();
        
        if (string.IsNullOrEmpty(jwtKey))
        {
            jwtKey = "SuperSecretJWTKeyForHospitalSystem2026!";
        }
    }
}
var key = Encoding.UTF8.GetBytes(jwtKey);

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.RequireHttpsMetadata = false; // Tắt yêu cầu HTTPS ở môi trường phát triển
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidateAudience = true,
        ValidAudience = builder.Configuration["Jwt:Audience"],
        ValidateLifetime = true,
        ClockSkew = TimeSpan.Zero // Loại bỏ độ lệch thời gian mặc định 5 phút
    };
});

// Cấu hình Swagger/OpenAPI để hỗ trợ kiểm thử JWT Token trực quan
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(options =>
{
    options.SwaggerDoc("v1", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "CareConnect High-Tech API Reference (Master)", 
        Version = "v1", 
        Description = "Toàn bộ danh sách API tích hợp của hệ thống phòng khám CareConnect." 
    });
    options.SwaggerDoc("auth", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "CareConnect Authentication & Profile API", 
        Version = "v1", 
        Description = "Các API phục vụ xác thực đăng nhập, đăng ký tài khoản, xem/sửa hồ sơ y tế cá nhân và đánh giá phản hồi bệnh nhân." 
    });
    options.SwaggerDoc("appointments", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "CareConnect Clinic & Appointment Booking API", 
        Version = "v1", 
        Description = "Các API cốt lõi quản lý thông tin chi nhánh phòng khám, danh sách ca trực bác sĩ, quy trình đặt lịch hẹn khám và hồ sơ bệnh án." 
    });
    options.SwaggerDoc("ai", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "CareConnect Intelligent AI Assistant API", 
        Version = "v1", 
        Description = "Các API phục vụ chatbot trợ lý thông minh, phân tích triệu chứng sơ bộ và tin tức y khoa cập nhật liên tục 24/7." 
    });
    options.SwaggerDoc("admin", new Microsoft.OpenApi.Models.OpenApiInfo 
    { 
        Title = "CareConnect Clinic Administration API", 
        Version = "v1", 
        Description = "Các API quản lý vận hành phòng khám chuyên dụng dành riêng cho Quản trị viên (Admin) và Lễ tân (Receptionist)." 
    });

    // Cấu hình quy tắc phân loại endpoint vào từng tài liệu tương ứng
    options.DocInclusionPredicate((docName, apiDesc) =>
    {
        if (docName == "v1") return true; // v1 chứa tất cả
        return apiDesc.GroupName == docName; // Các doc khác lọc theo GroupName
    });

    options.AddSecurityDefinition("Bearer", new Microsoft.OpenApi.Models.OpenApiSecurityScheme
    {
        Name = "Authorization",
        Type = Microsoft.OpenApi.Models.SecuritySchemeType.ApiKey,
        Scheme = "Bearer",
        BearerFormat = "JWT",
        In = Microsoft.OpenApi.Models.ParameterLocation.Header,
        Description = "Nhập theo định dạng: Bearer [your_jwt_token]"
    });

    options.AddSecurityRequirement(new Microsoft.OpenApi.Models.OpenApiSecurityRequirement
    {
        {
            new Microsoft.OpenApi.Models.OpenApiSecurityScheme
            {
                Reference = new Microsoft.OpenApi.Models.OpenApiReference
                {
                    Type = Microsoft.OpenApi.Models.ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            Array.Empty<string>()
        }
    });

    // Nạp file XML comment để hiển thị mô tả API trên Swagger
    var xmlFile = $"{System.Reflection.Assembly.GetExecutingAssembly().GetName().Name}.xml";
    var xmlPath = Path.Combine(AppContext.BaseDirectory, xmlFile);
    if (File.Exists(xmlPath))
    {
        options.IncludeXmlComments(xmlPath);
    }
});

var app = builder.Build();

// Tự động khởi tạo Database và Seed dữ liệu khi ứng dụng chạy
using (var scope = app.Services.CreateScope())
{
    var services = scope.ServiceProvider;
    try
    {
        var context = services.GetRequiredService<AppDbContext>();
        context.Database.EnsureCreated(); // Tạo file db SQLite và chạy Seed dữ liệu

        // Sinh lịch trực động cho 14 ngày tới để luôn sẵn sàng cho việc kiểm thử đặt lịch
        var doctors = context.Users.Where(u => u.Role == "Doctor").ToList();
        var today = DateTime.Today;
        var standardSlots = new[] { "08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00", "14:00 - 15:00", "15:00 - 16:00" };
        
        var existingSchedules = context.DoctorSchedules
            .Where(s => s.AvailableDate >= today)
            .ToList();
            
        bool hasNewSchedules = false;
        for (int i = 0; i < 14; i++)
        {
            var date = today.AddDays(i);
            foreach (var doc in doctors)
            {
                foreach (var slot in standardSlots)
                {
                    bool exists = existingSchedules.Any(s => s.DoctorId == doc.UserId 
                        && s.AvailableDate.Date == date.Date 
                        && s.TimeSlot == slot);
                    if (!exists)
                    {
                        context.DoctorSchedules.Add(new web.Models.DoctorSchedule
                        {
                            DoctorId = doc.UserId,
                            AvailableDate = date,
                            TimeSlot = slot
                        });
                        hasNewSchedules = true;
                    }
                }
            }
        }
        if (hasNewSchedules)
        {
            context.SaveChanges();
        }
    }
    catch (Exception ex)
    {
        var logger = services.GetRequiredService<ILogger<Program>>();
        logger.LogError(ex, "Đã xảy ra lỗi trong quá trình khởi tạo và seed Database.");
    }
}

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();

    // Cấu hình giao diện Scalar API hiện đại
    app.MapScalarApiReference(options =>
    {
        options
            .WithTitle("CareConnect High-Tech API Reference")
            .WithTheme(ScalarTheme.DeepSpace) // Chủ đề không gian vũ trụ chuyên nghiệp
            .WithLayout(ScalarLayout.Modern)  // Bố cục Modern chia trang riêng biệt, loại bỏ cuộn dài bất tiện
            .WithOpenApiRoutePattern("/swagger/{documentName}/swagger.json"); // Trỏ đúng đường dẫn JSON của Swagger

        // Sử dụng thuộc tính CustomCss để làm cho header thanh công cụ cố định (sticky) khi cuộn trang
        options.CustomCss = @"
            .references-header {
                position: sticky !important;
                top: 0 !important;
                z-index: 1000 !important;
                background: #09090b !important; /* Đồng bộ nền tối DeepSpace */
                border-bottom: 1px solid #27272a !important;
            }
        ";
    });
}

if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}

// Kích hoạt CORS Middleware hỗ trợ di động và web client khác
app.UseCors("MobileCorsPolicy");

app.UseDefaultFiles();
app.UseStaticFiles(new StaticFileOptions
{
    OnPrepareResponse = ctx =>
    {
        ctx.Context.Response.Headers["Cache-Control"] = "no-cache, no-store, must-revalidate";
        ctx.Context.Response.Headers["Pragma"] = "no-cache";
        ctx.Context.Response.Headers["Expires"] = "0";

        var contentType = ctx.Context.Response.ContentType;
        if (!string.IsNullOrEmpty(contentType))
        {
            if (contentType.StartsWith("text/html") ||
                contentType.StartsWith("text/css") ||
                contentType.StartsWith("application/javascript") ||
                contentType.StartsWith("text/javascript"))
            {
                if (!contentType.Contains("charset"))
                {
                    ctx.Context.Response.ContentType = contentType + "; charset=utf-8";
                }
            }
        }
    }
});

// LƯU Ý QUAN TRỌNG: UseAuthentication PHẢI được gọi TRƯỚC UseAuthorization
app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();

app.Run();
