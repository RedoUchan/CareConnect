using System;
using Microsoft.EntityFrameworkCore;
using web.Models;

namespace web.Data
{
    public class AppDbContext : DbContext
    {
        public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
        {
        }

        public DbSet<User> Users => Set<User>();
        public DbSet<Appointment> Appointments => Set<Appointment>();
        public DbSet<MedicalRecord> MedicalRecords => Set<MedicalRecord>();
        public DbSet<DoctorSchedule> DoctorSchedules => Set<DoctorSchedule>();
        public DbSet<Testimonial> Testimonials => Set<Testimonial>();
        public DbSet<Branch> Branches => Set<Branch>();
        public DbSet<Medicine> Medicines => Set<Medicine>();
        public DbSet<PrescriptionDetail> PrescriptionDetails => Set<PrescriptionDetail>();
        public DbSet<LabRequest> LabRequests => Set<LabRequest>();

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Cấu hình bảng Users
            modelBuilder.Entity<User>(entity =>
            {
                entity.HasKey(e => e.UserId);
                entity.HasIndex(e => e.Email).IsUnique();
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Username).HasMaxLength(100);
                entity.Property(e => e.Email).IsRequired().HasMaxLength(150);
                entity.Property(e => e.PasswordHash).IsRequired().HasMaxLength(255);
                entity.Property(e => e.Role).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ServiceTier).IsRequired().HasMaxLength(50).HasDefaultValue("Standard");
                entity.Property(e => e.PriorityReason).HasMaxLength(150);
                entity.Property(e => e.PatientType).HasMaxLength(50);
            });

            // Cấu hình bảng Appointments
            modelBuilder.Entity<Appointment>(entity =>
            {
                entity.HasKey(e => e.AppointmentId);
                entity.Property(e => e.TimeSlot).IsRequired().HasMaxLength(50);
                entity.Property(e => e.Symptoms).HasMaxLength(500);
                entity.Property(e => e.Status).IsRequired().HasMaxLength(50);
                entity.Property(e => e.ServiceTier).IsRequired().HasMaxLength(50).HasDefaultValue("Standard");
                entity.Property(e => e.PriorityReason).HasMaxLength(150);
                entity.Property(e => e.CalculatedFee).HasColumnType("decimal(18,2)").HasDefaultValue(0);
                entity.Property(e => e.AiChatHistory).HasMaxLength(4000);
                
                // Quan hệ 1-N giữa User (Patient) và Appointment
                entity.HasOne(a => a.Patient)
                    .WithMany()
                    .HasForeignKey(a => a.PatientId)
                    .OnDelete(DeleteBehavior.Restrict); // Tránh cascade delete vòng lặp

                // Quan hệ 1-N giữa User (Doctor) và Appointment
                entity.HasOne(a => a.Doctor)
                    .WithMany()
                    .HasForeignKey(a => a.DoctorId)
                    .OnDelete(DeleteBehavior.Restrict); // Tránh cascade delete vòng lặp
            });

            // Cấu hình bảng MedicalRecords
            modelBuilder.Entity<MedicalRecord>(entity =>
            {
                entity.HasKey(e => e.MedicalRecordId);
                entity.Property(e => e.Diagnosis).IsRequired().HasMaxLength(250);
                entity.Property(e => e.Treatment).IsRequired().HasMaxLength(500);
                entity.Property(e => e.Prescription).HasMaxLength(1000);

                // Quan hệ 1-N với Patient
                entity.HasOne(m => m.Patient)
                    .WithMany()
                    .HasForeignKey(m => m.PatientId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Quan hệ 1-N với Doctor
                entity.HasOne(m => m.Doctor)
                    .WithMany()
                    .HasForeignKey(m => m.DoctorId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Quan hệ với Appointment
                entity.HasOne(m => m.Appointment)
                    .WithMany()
                    .HasForeignKey(m => m.AppointmentId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Cấu hình bảng Medicines
            modelBuilder.Entity<Medicine>(entity =>
            {
                entity.HasKey(e => e.MedicineId);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
                entity.Property(e => e.ActiveIngredient).HasMaxLength(150);
                entity.Property(e => e.Unit).HasMaxLength(50);
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");
            });

            // Cấu hình bảng PrescriptionDetails
            modelBuilder.Entity<PrescriptionDetail>(entity =>
            {
                entity.HasKey(e => e.PrescriptionDetailId);
                entity.Property(e => e.UsageInstruction).HasMaxLength(200);
                entity.Property(e => e.UnitPrice).HasColumnType("decimal(18,2)");

                entity.HasOne(pd => pd.MedicalRecord)
                    .WithMany(m => m.PrescriptionDetails)
                    .HasForeignKey(pd => pd.MedicalRecordId)
                    .OnDelete(DeleteBehavior.Cascade);

                entity.HasOne(pd => pd.Medicine)
                    .WithMany()
                    .HasForeignKey(pd => pd.MedicineId)
                    .OnDelete(DeleteBehavior.Restrict);
            });

            // Cấu hình bảng LabRequests
            modelBuilder.Entity<LabRequest>(entity =>
            {
                entity.HasKey(e => e.LabRequestId);
                entity.Property(e => e.LabType).IsRequired().HasMaxLength(100);
                entity.Property(e => e.Fee).HasColumnType("decimal(18,2)");
                entity.Property(e => e.Status).HasMaxLength(50);
                entity.Property(e => e.Results).HasMaxLength(1000);

                entity.HasOne(lr => lr.MedicalRecord)
                    .WithMany(m => m.LabRequests)
                    .HasForeignKey(lr => lr.MedicalRecordId)
                    .OnDelete(DeleteBehavior.Cascade);
            });

            // Cấu hình bảng Testimonials
            modelBuilder.Entity<Testimonial>(entity =>
            {
                entity.HasKey(e => e.TestimonialId);
                entity.Property(e => e.FullName).IsRequired().HasMaxLength(100);
                entity.Property(e => e.RoleOrJob).HasMaxLength(150);
                entity.Property(e => e.Comment).IsRequired().HasMaxLength(1000);
                
                // Quan hệ với User (nếu có)
                entity.HasOne(t => t.User)
                    .WithMany()
                    .HasForeignKey(t => t.UserId)
                    .OnDelete(DeleteBehavior.SetNull);
            });

            // Cấu hình bảng Branches
            modelBuilder.Entity<Branch>(entity =>
            {
                entity.HasKey(e => e.BranchId);
                entity.Property(e => e.Name).IsRequired().HasMaxLength(150);
                entity.Property(e => e.Address).IsRequired().HasMaxLength(250);
            });

            // Seed dữ liệu cho Branches
            modelBuilder.Entity<Branch>().HasData(
                new Branch
                {
                    BranchId = 1,
                    Name = "CareConnect Quận 1",
                    Address = "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
                    Latitude = 10.7769,
                    Longitude = 106.7009
                },
                new Branch
                {
                    BranchId = 2,
                    Name = "CareConnect Quận 3",
                    Address = "456 Đường Nguyễn Đình Chiểu, Quận 3, TP. Hồ Chí Minh",
                    Latitude = 10.7818,
                    Longitude = 106.6836
                },
                new Branch
                {
                    BranchId = 3,
                    Name = "CareConnect Thủ Đức",
                    Address = "789 Đường Võ Văn Ngân, Thủ Đức, TP. Hồ Chí Minh",
                    Latitude = 10.8504,
                    Longitude = 106.7719
                },
                new Branch
                {
                    BranchId = 4,
                    Name = "CareConnect Thái Nguyên",
                    Address = "Số 19 Đường Cách Mạng Tháng 8, TP. Thái Nguyên, Tỉnh Thái Nguyên",
                    Latitude = 21.5939,
                    Longitude = 105.8442
                }
            );

            // Seed dữ liệu mẫu cho Users với mật khẩu "123456" đã băm bằng BCrypt
            string defaultHash = BCrypt.Net.BCrypt.HashPassword("123456");

            modelBuilder.Entity<User>().HasData(
                new User
                {
                    UserId = 1,
                    FullName = "System Admin",
                    Username = "admin",
                    Email = "admin@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Admin"
                },
                new User
                {
                    UserId = 2,
                    FullName = "Dr. John Doe",
                    Username = "doctor",
                    Email = "doctor@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Nội khoa tổng quát",
                    PhoneNumber = "0901234567",
                    HospitalBranch = "CareConnect Quận 1"
                },
                new User
                {
                    UserId = 3,
                    FullName = "Patient Alice",
                    Username = "patient",
                    Email = "patient@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Patient",
                    PhoneNumber = "0987654321",
                    DateOfBirth = new DateTime(1995, 6, 15, 0, 0, 0, DateTimeKind.Utc),
                    Address = "123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh",
                    Gender = "Nữ",
                    BloodType = "A"
                },
                new User
                {
                    UserId = 4,
                    FullName = "Dr. Sarah Connor",
                    Email = "sarah@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Nhi khoa",
                    PhoneNumber = "0911222333",
                    HospitalBranch = "CareConnect Quận 3"
                },
                new User
                {
                    UserId = 5,
                    FullName = "Dr. Bruce Wayne",
                    Email = "bruce@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Tim mạch",
                    PhoneNumber = "0922333444",
                    HospitalBranch = "CareConnect Thủ Đức"
                },
                new User
                {
                    UserId = 6,
                    FullName = "Dr. James Carter",
                    Email = "james@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Da liễu",
                    PhoneNumber = "0933444555",
                    HospitalBranch = "CareConnect Quận 1"
                },
                new User
                {
                    UserId = 7,
                    FullName = "Dr. Helen Keller",
                    Email = "helen@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Mắt",
                    PhoneNumber = "0944555666",
                    HospitalBranch = "CareConnect Quận 3"
                },
                new User
                {
                    UserId = 8,
                    FullName = "Dr. Richard Harris",
                    Email = "richard@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Răng hàm mặt",
                    PhoneNumber = "0955666777",
                    HospitalBranch = "CareConnect Thủ Đức"
                },
                new User
                {
                    UserId = 9,
                    FullName = "Dr. Mary Jane",
                    Email = "mary@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Sản phụ khoa",
                    PhoneNumber = "0966777888",
                    HospitalBranch = "CareConnect Quận 1"
                },
                new User
                {
                    UserId = 10,
                    FullName = "Dr. Peter Parker",
                    Email = "peter@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Tai mũi họng",
                    PhoneNumber = "0977888999",
                    HospitalBranch = "CareConnect Quận 3"
                },
                new User
                {
                    UserId = 11,
                    FullName = "Dr. Tony Stark",
                    Email = "tony@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Xương khớp",
                    PhoneNumber = "0988999000",
                    HospitalBranch = "CareConnect Thủ Đức"
                },
                new User
                {
                    UserId = 12,
                    FullName = "Dr. Stephen Strange",
                    Email = "stephen@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Tiêu hóa",
                    PhoneNumber = "0999000111",
                    HospitalBranch = "CareConnect Quận 1"
                },
                new User
                {
                    UserId = 13,
                    FullName = "Dr. Charles Xavier",
                    Email = "charles@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Thần kinh",
                    PhoneNumber = "0900111222",
                    HospitalBranch = "CareConnect Quận 3"
                },
                new User
                {
                    UserId = 14,
                    FullName = "Dr. Reed Richards",
                    Email = "reed@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Doctor",
                    Specialization = "Ung bướu",
                    PhoneNumber = "0911333555",
                    HospitalBranch = "CareConnect Thủ Đức"
                },
                new User
                {
                    UserId = 15,
                    FullName = "Nguyễn Thị Lễ Tân",
                    Username = "receptionist",
                    Email = "reception@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Receptionist",
                    PhoneNumber = "0901122334",
                    HospitalBranch = "CareConnect Quận 1",
                    Gender = "Nữ"
                },
                new User
                {
                    UserId = 16,
                    FullName = "Trần Thanh Kế Toán",
                    Username = "finance",
                    Email = "finance@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Finance",
                    PhoneNumber = "0909876543",
                    HospitalBranch = "CareConnect Quận 1",
                    Gender = "Nam"
                },
                new User
                {
                    UserId = 17,
                    FullName = "Phạm Minh Dược Sĩ",
                    Username = "pharmacist",
                    Email = "pharmacist@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "Pharmacist",
                    PhoneNumber = "0902233445",
                    HospitalBranch = "CareConnect Quận 1",
                    Gender = "Nam"
                },
                new User
                {
                    UserId = 18,
                    FullName = "Lê Thị Kỹ Thuật",
                    Username = "labtech",
                    Email = "labtech@hospital.com",
                    PasswordHash = defaultHash,
                    Role = "LabTechnician",
                    PhoneNumber = "0903344556",
                    HospitalBranch = "CareConnect Quận 1",
                    Gender = "Nữ"
                }
            );

            // Seed dữ liệu mẫu cho Appointments
            modelBuilder.Entity<Appointment>().HasData(
                new Appointment
                {
                    AppointmentId = 1,
                    PatientId = 3, // Patient Alice
                    DoctorId = 2,  // Dr. John Doe
                    AppointmentDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc),
                    TimeSlot = "10:00 - 11:00",
                    Symptoms = "Đau đầu và chóng mặt kéo dài từ tuần trước.",
                    Status = "Completed", // Đặt là Completed vì đã được khám và ra bệnh án số 1
                    HospitalBranch = "CareConnect Quận 1",
                    BloodPressure = "120/80",
                    Temperature = "36.5",
                    Weight = "52.0",
                    HeartRate = "75",
                    CreatedAt = new DateTime(2026, 6, 23, 8, 0, 0, DateTimeKind.Utc)
                },
                new Appointment
                {
                    AppointmentId = 101,
                    PatientId = 3, // Patient Alice
                    DoctorId = 2,  // Dr. John Doe
                    AppointmentDate = new DateTime(2026, 3, 20, 0, 0, 0, DateTimeKind.Utc),
                    TimeSlot = "09:00 - 10:00",
                    Symptoms = "Khám sức khỏe định kỳ và kiểm tra cân nặng.",
                    Status = "Completed",
                    HospitalBranch = "CareConnect Quận 1",
                    BloodPressure = "115/75",
                    Temperature = "36.4",
                    Weight = "53.2",
                    HeartRate = "72",
                    CreatedAt = new DateTime(2026, 3, 19, 8, 0, 0, DateTimeKind.Utc)
                },
                new Appointment
                {
                    AppointmentId = 102,
                    PatientId = 3, // Patient Alice
                    DoctorId = 2,  // Dr. John Doe
                    AppointmentDate = new DateTime(2026, 4, 15, 0, 0, 0, DateTimeKind.Utc),
                    TimeSlot = "14:00 - 15:00",
                    Symptoms = "Đau họng nhẹ và ho nhẹ.",
                    Status = "Completed",
                    HospitalBranch = "CareConnect Quận 1",
                    BloodPressure = "118/79",
                    Temperature = "37.2",
                    Weight = "52.8",
                    HeartRate = "80",
                    CreatedAt = new DateTime(2026, 4, 14, 8, 0, 0, DateTimeKind.Utc)
                },
                new Appointment
                {
                    AppointmentId = 103,
                    PatientId = 3, // Patient Alice
                    DoctorId = 2,  // Dr. John Doe
                    AppointmentDate = new DateTime(2026, 5, 20, 0, 0, 0, DateTimeKind.Utc),
                    TimeSlot = "10:00 - 11:00",
                    Symptoms = "Ho khan và cảm giác mệt mỏi.",
                    Status = "Completed",
                    HospitalBranch = "CareConnect Quận 1",
                    BloodPressure = "122/82",
                    Temperature = "36.8",
                    Weight = "51.9",
                    HeartRate = "78",
                    CreatedAt = new DateTime(2026, 5, 19, 8, 0, 0, DateTimeKind.Utc)
                }
            );

            // Seed dữ liệu mẫu cho MedicalRecords
            modelBuilder.Entity<MedicalRecord>().HasData(
                new MedicalRecord
                {
                    MedicalRecordId = 1,
                    PatientId = 3, // Patient Alice
                    DoctorId = 2,  // Dr. John Doe
                    AppointmentId = 1,
                    Diagnosis = "Cảm cúm thông thường và suy nhược cơ thể nhẹ.",
                    Treatment = "Nghỉ ngơi điều độ, ăn nhiều rau xanh, bổ sung nước ấm.",
                    Prescription = "Paracetamol 500mg x 10 viên (uống khi sốt > 38.5 độ); Vitamin C 1000mg x 10 viên (sáng 1 viên sau ăn).",
                    RecordDate = new DateTime(2026, 6, 24, 11, 0, 0, DateTimeKind.Utc),
                    CreatedAt = new DateTime(2026, 6, 24, 11, 0, 0, DateTimeKind.Utc)
                }
            );

            // Cấu hình bảng DoctorSchedules
            modelBuilder.Entity<DoctorSchedule>(entity =>
            {
                entity.HasKey(e => e.DoctorScheduleId);
                entity.Property(e => e.TimeSlot).IsRequired().HasMaxLength(50);
                
                // Quan hệ với Doctor (User)
                entity.HasOne(s => s.Doctor)
                    .WithMany()
                    .HasForeignKey(s => s.DoctorId)
                    .OnDelete(DeleteBehavior.Restrict);

                // Thêm Unique Constraint để tránh trùng lặp khung giờ cho cùng một bác sĩ trên cùng một ngày
                entity.HasIndex(e => new { e.DoctorId, e.AvailableDate, e.TimeSlot }).IsUnique();
            });

            // Seed dữ liệu mẫu cho DoctorSchedules
            modelBuilder.Entity<DoctorSchedule>().HasData(
                // Dr. John Doe (ID 2)
                new DoctorSchedule { DoctorScheduleId = 1, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "08:00 - 09:00" },
                new DoctorSchedule { DoctorScheduleId = 2, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },
                new DoctorSchedule { DoctorScheduleId = 3, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },
                new DoctorSchedule { DoctorScheduleId = 4, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "11:00 - 12:00" },
                
                // Dr. Sarah Connor (ID 4)
                new DoctorSchedule { DoctorScheduleId = 5, DoctorId = 4, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "14:00 - 15:00" },
                new DoctorSchedule { DoctorScheduleId = 6, DoctorId = 4, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "15:00 - 16:00" },
                
                // Dr. Bruce Wayne (ID 5)
                new DoctorSchedule { DoctorScheduleId = 7, DoctorId = 5, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },
                new DoctorSchedule { DoctorScheduleId = 8, DoctorId = 5, AvailableDate = new DateTime(2026, 6, 24, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },

                // June 25th (Tomorrow) schedules for all doctors to ensure each specialty is interactable
                new DoctorSchedule { DoctorScheduleId = 9, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "08:00 - 09:00" },
                new DoctorSchedule { DoctorScheduleId = 10, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },
                new DoctorSchedule { DoctorScheduleId = 11, DoctorId = 2, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },

                new DoctorSchedule { DoctorScheduleId = 12, DoctorId = 4, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "14:00 - 15:00" },
                new DoctorSchedule { DoctorScheduleId = 13, DoctorId = 4, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "15:00 - 16:00" },

                new DoctorSchedule { DoctorScheduleId = 14, DoctorId = 5, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },
                new DoctorSchedule { DoctorScheduleId = 15, DoctorId = 5, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },

                new DoctorSchedule { DoctorScheduleId = 16, DoctorId = 6, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "08:00 - 09:00" },
                new DoctorSchedule { DoctorScheduleId = 17, DoctorId = 6, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },

                new DoctorSchedule { DoctorScheduleId = 18, DoctorId = 7, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },
                new DoctorSchedule { DoctorScheduleId = 19, DoctorId = 7, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "11:00 - 12:00" },

                new DoctorSchedule { DoctorScheduleId = 20, DoctorId = 8, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "14:00 - 15:00" },
                new DoctorSchedule { DoctorScheduleId = 21, DoctorId = 8, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "15:00 - 16:00" },

                new DoctorSchedule { DoctorScheduleId = 22, DoctorId = 9, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "08:00 - 09:00" },
                new DoctorSchedule { DoctorScheduleId = 23, DoctorId = 9, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },

                new DoctorSchedule { DoctorScheduleId = 24, DoctorId = 10, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },
                new DoctorSchedule { DoctorScheduleId = 25, DoctorId = 10, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "11:00 - 12:00" },

                new DoctorSchedule { DoctorScheduleId = 26, DoctorId = 11, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "14:00 - 15:00" },
                new DoctorSchedule { DoctorScheduleId = 27, DoctorId = 11, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "15:00 - 16:00" },

                new DoctorSchedule { DoctorScheduleId = 28, DoctorId = 12, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "08:00 - 09:00" },
                new DoctorSchedule { DoctorScheduleId = 29, DoctorId = 12, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "09:00 - 10:00" },

                new DoctorSchedule { DoctorScheduleId = 30, DoctorId = 13, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "10:00 - 11:00" },
                new DoctorSchedule { DoctorScheduleId = 31, DoctorId = 13, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "11:00 - 12:00" },

                new DoctorSchedule { DoctorScheduleId = 32, DoctorId = 14, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "14:00 - 15:00" },
                new DoctorSchedule { DoctorScheduleId = 33, DoctorId = 14, AvailableDate = new DateTime(2026, 6, 25, 0, 0, 0, DateTimeKind.Utc), TimeSlot = "15:00 - 16:00" }
            );

            // Seed dữ liệu mẫu cho Testimonials
            modelBuilder.Entity<Testimonial>().HasData(
                new Testimonial
                {
                    TestimonialId = 1,
                    FullName = "Nguyễn Thị Lan",
                    RoleOrJob = "Kế toán tại TP.HCM",
                    Rating = 5,
                    Comment = "Đặt lịch khám rất nhanh, không cần xếp hàng chờ đợi. Bác sĩ tư vấn tận tình, kết quả khám được lưu rõ ràng. Tôi đã giới thiệu cho cả gia đình dùng CareConnect!",
                    CreatedAt = DateTime.Parse("2026-06-15T00:00:00Z").ToUniversalTime()
                },
                new Testimonial
                {
                    TestimonialId = 2,
                    FullName = "Trần Văn Minh",
                    RoleOrJob = "Kỹ sư xây dựng, Hà Nội",
                    Rating = 5,
                    Comment = "Tính năng AI sàng lọc triệu chứng cực kỳ hữu ích — giúp tôi nhận ra dấu hiệu bất thường của tim và đặt lịch khám ngay. Bác sĩ xác nhận đúng cần theo dõi, rất may mắn phát hiện sớm!",
                    CreatedAt = DateTime.Parse("2026-06-20T00:00:00Z").ToUniversalTime()
                },
                new Testimonial
                {
                    TestimonialId = 3,
                    FullName = "Phạm Thị Hoa",
                    RoleOrJob = "Phụ huynh, Thái Nguyên",
                    Rating = 5,
                    Comment = "Tôi đặt khám cho bé qua CareConnect, hệ thống tự động tìm bác sĩ Nhi phù hợp và gợi ý khung giờ. Giao diện đẹp, dễ dùng ngay cả khi không rành công nghệ.",
                    CreatedAt = DateTime.Parse("2026-06-23T00:00:00Z").ToUniversalTime()
                }
            );

            // Seed dữ liệu mẫu cho Medicines
            modelBuilder.Entity<Medicine>().HasData(
                new Medicine { MedicineId = 1, Name = "Paracetamol 500mg", ActiveIngredient = "Acetaminophen", Unit = "Viên", UnitPrice = 1500, StockQuantity = 500, UsageInstruction = "Uống 1 viên khi sốt > 38.5 độ C, cách nhau ít nhất 4-6 tiếng." },
                new Medicine { MedicineId = 2, Name = "Amoxicillin 500mg", ActiveIngredient = "Amoxicillin", Unit = "Viên", UnitPrice = 3000, StockQuantity = 200, UsageInstruction = "Uống 1 viên/lần, ngày 2 lần sau khi ăn (sáng/tối)." },
                new Medicine { MedicineId = 3, Name = "Ibuprofen 400mg", ActiveIngredient = "Ibuprofen", Unit = "Viên", UnitPrice = 2500, StockQuantity = 300, UsageInstruction = "Uống 1 viên sau ăn khi đau nhức xương khớp hoặc đau răng." },
                new Medicine { MedicineId = 4, Name = "Decolgen Forte", ActiveIngredient = "Acetaminophen + Chlorpheniramine", Unit = "Viên", UnitPrice = 2000, StockQuantity = 400, UsageInstruction = "Uống 1 viên/lần, ngày 3 lần sau ăn để giảm nghẹt mũi, hắt hơi." },
                new Medicine { MedicineId = 5, Name = "Vitamin C 1000mg", ActiveIngredient = "Ascorbic Acid", Unit = "Viên sủi", UnitPrice = 5000, StockQuantity = 150, UsageInstruction = "Hòa tan 1 viên vào 200ml nước đun sôi để nguội, uống vào buổi sáng sau ăn." }
            );
        }
    }
}
