import 'package:flutter/foundation.dart' show kIsWeb, defaultTargetPlatform;
import 'package:flutter/material.dart' show TargetPlatform;

class ApiConfig {
  // Đường dẫn Web/API cho điện thoại thật cắm cáp USB (sử dụng lệnh adb reverse)
  static const String _androidPhysicalUrl = "http://127.0.0.1:5164";
  // Đường dẫn Web/API cho máy ảo Android Emulator
  static const String _androidEmulatorUrl = "http://10.0.2.2:5164";
  static const String _defaultUrl = "http://localhost:5164";

  static String get webUrl {
    if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
      // Đang dùng điện thoại thật cắm cáp USB (đã cấu hình adb reverse)
      // Nếu chuyển sang dùng máy ảo, hãy đổi thành _androidEmulatorUrl;
      return _androidPhysicalUrl;
    }
    return _defaultUrl;
  }

  static String get baseUrl {
    return "$webUrl/api";
  }

  // Khóa Sentry DSN cho ứng dụng Flutter Mobile (thay thế bằng DSN thật của bạn)
  static const String sentryDsn = "https://examplePublicKey@o0.ingest.sentry.io/0";
}
