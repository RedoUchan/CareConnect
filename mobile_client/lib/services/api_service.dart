import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../models/branch_model.dart';
import '../models/record_model.dart';

class ApiService {
  final _storage = const FlutterSecureStorage();

  // Helper lấy JWT Token bảo mật từ vùng lưu trữ Keychain/Keystore
  Future<String?> _getToken() async {
    return await _storage.read(key: "jwt_token");
  }

  // Lấy tên người dùng đã lưu trữ
  Future<String?> getUserName() async {
    return await _storage.read(key: "user_name");
  }

  // Lấy vai trò người dùng đã lưu trữ
  Future<String?> getUserRole() async {
    return await _storage.read(key: "user_role");
  }

  // Đăng nhập
  Future<Map<String, dynamic>> login(String email, String password) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/auth/login"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"email": email, "password": password}),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        await _storage.write(key: "jwt_token", value: data['token']);
        await _storage.write(key: "user_id", value: data['userId'].toString());
        await _storage.write(key: "user_name", value: data['fullName']);
        await _storage.write(key: "user_role", value: data['role']);
        return {"success": true, "role": data['role'], "message": "Đăng nhập thành công"};
      } else {
        return {"success": false, "message": data['message'] ?? "Tài khoản hoặc mật khẩu không chính xác."};
      }
    } catch (e) {
      return {"success": false, "message": "Không thể kết nối tới máy chủ CareConnect."};
    }
  }

  // Xác minh thông tin công dân Bước 1
  Future<Map<String, dynamic>> verifyCitizen({
    required String fullName,
    required String nationalId,
    required String phoneNumber,
    required String dateOfBirth,
  }) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/auth/verify-citizen"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "fullName": fullName,
          "nationalId": nationalId,
          "phoneNumber": phoneNumber,
          "dateOfBirth": dateOfBirth,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Xác minh thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Xác minh thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Không thể kết nối tới máy chủ CareConnect."};
    }
  }

  // Đăng ký tài khoản Bệnh nhân mới
  Future<Map<String, dynamic>> register({
    required String fullName,
    required String username,
    required String email,
    required String password,
    String? phoneNumber,
    String? nationalId,
    String? dateOfBirth,
  }) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/auth/register"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "fullName": fullName,
          "username": username,
          "email": email,
          "password": password,
          "role": "Patient",
          "phoneNumber": phoneNumber,
          "nationalId": nationalId,
          "dateOfBirth": dateOfBirth,
        }),
      ).timeout(const Duration(seconds: 10));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Đăng ký tài khoản thành công! Vui lòng đăng nhập."};
      } else {
        return {"success": false, "message": data['message'] ?? "Đăng ký tài khoản thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Không thể kết nối tới máy chủ CareConnect."};
    }
  }

  // Đăng xuất và xóa sạch bộ nhớ cache bảo mật
  Future<void> logout() async {
    await _storage.deleteAll();
  }

  // Đăng ký Device Token lên máy chủ phục vụ Push Notification
  Future<bool> registerDeviceToken(String deviceToken) async {
    final userIdStr = await _storage.read(key: "user_id");
    if (userIdStr == null) return false;

    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/auth/register-device-token"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "userId": int.parse(userIdStr),
          "deviceToken": deviceToken,
        }),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Tải danh sách Bệnh án Bệnh nhân từ API bệnh án cá nhân
  Future<List<RecordModel>> getMedicalRecords() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/medicalrecords/my-records"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      final List<dynamic> recordsJson = jsonDecode(response.body);
      return recordsJson.map((json) => RecordModel.fromJson(json)).toList();
    } else {
      throw Exception("Không thể tải hồ sơ bệnh án cá nhân.");
    }
  }

  // Tải thông tin Hồ sơ cá nhân đầy đủ của tài khoản hiện tại
  Future<Map<String, dynamic>> getProfile() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/auth/profile"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception("Không thể tải thông tin hồ sơ.");
    }
  }

  // Cập nhật thông tin Hồ sơ cá nhân
  Future<Map<String, dynamic>> updateProfile(Map<String, dynamic> profileData) async {
    final token = await _getToken();
    try {
      final response = await http.put(
        Uri.parse("${ApiConfig.baseUrl}/auth/profile"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(profileData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Cập nhật thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Cập nhật hồ sơ thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi cập nhật hồ sơ."};
    }
  }

  // Tải danh sách các chi nhánh kèm tọa độ GPS
  Future<List<BranchModel>> getBranches() async {
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/branches"),
      headers: {"Content-Type": "application/json"},
    );

    if (response.statusCode == 200) {
      final List<dynamic> branchesJson = jsonDecode(response.body);
      return branchesJson.map((json) => BranchModel.fromJson(json)).toList();
    } else {
      throw Exception("Không thể kết nối danh sách chi nhánh.");
    }
  }

  // Tải danh sách Bác sĩ
  Future<List<dynamic>> getDoctors() async {
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/auth/doctors"),
      headers: {"Content-Type": "application/json"},
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception("Không thể tải danh sách bác sĩ.");
    }
  }

  // Tải danh sách ca khám trống của bác sĩ theo ngày
  Future<List<String>> getAvailableSlots(int doctorId, String dateString) async {
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/schedule/doctor/$doctorId/date/$dateString"),
      headers: {"Content-Type": "application/json"},
    );

    if (response.statusCode == 200) {
      final List<dynamic> slots = jsonDecode(response.body);
      return slots.cast<String>();
    } else {
      throw Exception("Không thể tải danh sách ca khám.");
    }
  }

  // Đặt lịch khám mới
  Future<Map<String, dynamic>> bookAppointment(Map<String, dynamic> appointmentData) async {
    final token = await _getToken();
    print("--- [BOOKING REQUEST] ---");
    print("Payload: ${jsonEncode(appointmentData)}");
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/appointments"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(appointmentData),
      );

      print("Response Code: ${response.statusCode}");
      print("Response Body: ${response.body}");

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {"success": true, "data": data};
      } else {
        String errMsg = data['message'] ?? "";
        if (errMsg.isEmpty && data['errors'] != null) {
          errMsg = (data['errors'] as Map).values.map((v) => (v as List).join(", ")).join("; ");
        }
        if (errMsg.isEmpty) errMsg = "Đặt lịch thất bại (Lỗi ${response.statusCode}).";
        return {"success": false, "message": errMsg};
      }
    } catch (e) {
      print("Booking Exception: $e");
      return {"success": false, "message": "Lỗi kết nối tới máy chủ khi đặt lịch."};
    }
  }

  // Đổi lịch hẹn khám mới
  Future<Map<String, dynamic>> rescheduleAppointment(int appointmentId, Map<String, dynamic> rescheduleData) async {
    final token = await _getToken();
    try {
      final response = await http.put(
        Uri.parse("${ApiConfig.baseUrl}/appointments/$appointmentId/reschedule"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(rescheduleData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Đổi lịch thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Đổi lịch thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi đổi lịch."};
    }
  }

  // Sàng lọc triệu chứng bằng AI
  Future<String> analyzeSymptoms(String symptoms) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/ai/analyze-symptoms"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({"symptoms": symptoms}),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as String;
      } else {
        final data = jsonDecode(response.body);
        return data['message'] ?? "Lỗi từ trợ lý AI.";
      }
    } catch (e) {
      return "Không thể kết nối đến Trợ lý AI.";
    }
  }

  // Hội thoại AI thông minh (Conversational AI Chat Assistant)
  Future<Map<String, dynamic>> chatAi(String message, List<String> history) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/ai/chat"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode({
          "message": message,
          "history": history,
        }),
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception("Lỗi phản hồi từ AI.");
      }
    } catch (e) {
      return {
        "response": "Không thể kết nối đến Trợ lý AI CareConnect. Vui lòng kiểm tra lại mạng.",
        "quickReplies": <String>[]
      };
    }
  }

  // Tải tin tức y học nổi bật
  Future<List<dynamic>> getTrendingNews() async {
    try {
      final response = await http.get(
        Uri.parse("${ApiConfig.baseUrl}/ai/trending-news"),
        headers: {"Content-Type": "application/json"},
      );

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      } else {
        throw Exception("Lỗi tải tin tức.");
      }
    } catch (e) {
      return [];
    }
  }

  // Tải danh sách lịch khám của người dùng hiện tại (cho Bác sĩ, Lễ tân)
  Future<List<dynamic>> getMyAppointments() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/appointments/my-appointments"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception("Không thể tải danh sách cuộc hẹn.");
    }
  }

  // Tải danh sách tất cả các bệnh nhân (dành cho Lễ tân, Admin)
  Future<List<dynamic>> getPatients() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/admin/patients"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception("Không thể tải danh sách bệnh nhân.");
    }
  }

  // Lấy chi tiết thông tin người dùng từ phía quản trị viên
  Future<Map<String, dynamic>> getUserDetail(int userId) async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/admin/users/$userId"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    } else {
      throw Exception("Không thể tải thông tin chi tiết người dùng.");
    }
  }

  // Cập nhật thông tin người dùng (cho Lễ tân/Admin)
  Future<Map<String, dynamic>> updateUser(int id, Map<String, dynamic> userData) async {
    final token = await _getToken();
    try {
      final response = await http.put(
        Uri.parse("${ApiConfig.baseUrl}/admin/users/$id"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(userData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Cập nhật thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Cập nhật thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi cập nhật tài khoản."};
    }
  }

  // Cập nhật trạng thái cuộc hẹn kèm sinh hiệu
  Future<bool> updateAppointmentStatus(int appointmentId, Map<String, dynamic> statusData) async {
    final token = await _getToken();
    try {
      final response = await http.put(
        Uri.parse("${ApiConfig.baseUrl}/appointments/$appointmentId/status"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(statusData),
      );
      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Đăng ký bệnh nhân mới (Dùng cho Lễ tân tiếp đón walk-in đăng ký nhanh)
  Future<Map<String, dynamic>> registerNewPatient(Map<String, dynamic> patientData) async {
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/auth/register"),
        headers: {"Content-Type": "application/json"},
        body: jsonEncode(patientData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "userId": data['userId']};
      } else {
        return {"success": false, "message": data['message'] ?? "Lỗi đăng ký bệnh nhân mới."};
      }
    } catch (e) {
      return {"success": false, "message": "Không thể kết nối đến máy chủ."};
    }
  }

  // Tạo bệnh án mới (chỉ dành cho Bác sĩ)
  Future<Map<String, dynamic>> createMedicalRecord(Map<String, dynamic> recordData) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/medicalrecords"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(recordData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {"success": true, "data": data};
      } else {
        return {"success": false, "message": data['message'] ?? "Lỗi tạo bệnh án."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi gửi bệnh án."};
    }
  }

  // Đăng ký tài khoản nhân viên mới (chỉ dành cho Admin)
  Future<Map<String, dynamic>> registerEmployee(Map<String, dynamic> employeeData) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/admin/users"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(employeeData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 201 || response.statusCode == 200) {
        return {"success": true, "message": "Tạo tài khoản nhân viên thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Lỗi tạo tài khoản."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi tạo tài khoản nhân viên."};
    }
  }

  // Cấu hình ca trực rảnh của bác sĩ
  Future<Map<String, dynamic>> setSchedule(Map<String, dynamic> scheduleData) async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/schedule"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
        body: jsonEncode(scheduleData),
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Cập nhật lịch trực thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Cập nhật lịch trực thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối tới máy chủ."};
    }
  }

  // Lấy lịch trực của chính bác sĩ
  Future<List<dynamic>> getMySchedule() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/schedule/my-schedule"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception("Không thể tải lịch trực của tôi.");
    }
  }

  // Lấy danh sách toàn bộ nhân sự (Admin)
  Future<List<dynamic>> getStaff() async {
    final token = await _getToken();
    final response = await http.get(
      Uri.parse("${ApiConfig.baseUrl}/admin/staff"),
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer $token",
      },
    );

    if (response.statusCode == 200) {
      return jsonDecode(response.body) as List<dynamic>;
    } else {
      throw Exception("Không thể tải danh sách nhân viên.");
    }
  }

  // Xóa tài khoản nhân viên/người dùng (Admin)
  Future<Map<String, dynamic>> deleteUser(int userId) async {
    final token = await _getToken();
    try {
      final response = await http.delete(
        Uri.parse("${ApiConfig.baseUrl}/admin/users/$userId"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Xóa tài khoản thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Xóa tài khoản thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi xóa tài khoản."};
    }
  }

  // Đặt lại dữ liệu hệ thống (Admin)
  Future<Map<String, dynamic>> resetDatabase() async {
    final token = await _getToken();
    try {
      final response = await http.post(
        Uri.parse("${ApiConfig.baseUrl}/admin/reset-db"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      final data = jsonDecode(response.body);
      if (response.statusCode == 200) {
        return {"success": true, "message": data['message'] ?? "Đặt lại dữ liệu thành công."};
      } else {
        return {"success": false, "message": data['message'] ?? "Đặt lại dữ liệu thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi đặt lại cơ sở dữ liệu."};
    }
  }

  // Lấy dữ liệu tổng hợp Dashboard (Admin)
  Future<Map<String, dynamic>> getAdminOverview() async {
    final token = await _getToken();
    try {
      final response = await http.get(
        Uri.parse("${ApiConfig.baseUrl}/admin/overview"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      );
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {}
    return {};
  }

  // Thanh toán tiền thuốc đơn thuốc
  Future<Map<String, dynamic>> payPrescription(int recordId) async {
    final token = await _getToken();
    try {
      final response = await http.put(
        Uri.parse("${ApiConfig.baseUrl}/medicalrecords/$recordId/pay"),
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer $token",
        },
      );

      if (response.statusCode == 200) {
        return {"success": true, "message": "Thanh toán đơn thuốc thành công."};
      } else {
        final data = jsonDecode(response.body);
        return {"success": false, "message": data['message'] ?? "Thanh toán đơn thuốc thất bại."};
      }
    } catch (e) {
      return {"success": false, "message": "Lỗi kết nối khi thanh toán đơn thuốc."};
    }
  }
}
