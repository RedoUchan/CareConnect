import 'package:flutter/material.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:sentry_flutter/sentry_flutter.dart';
import 'config/api_config.dart';
import 'views/login_view.dart';
import 'views/admin/admin_home_view.dart';
import 'views/doctor/doctor_home_view.dart';
import 'views/receptionist/reception_home_view.dart';
import 'views/patient/patient_home_view.dart';

void main() async {
  await SentryFlutter.init(
    (options) {
      options.dsn = ApiConfig.sentryDsn;
      // TracesSampleRate 1.0 nghĩa là thu thập 100% dữ liệu hiệu năng (cấu hình lại ở production nếu cần)
      options.tracesSampleRate = 1.0;
    },
    appRunner: () async {
      WidgetsFlutterBinding.ensureInitialized();
      
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: "jwt_token");
      final role = await storage.read(key: "user_role");
      
      Widget initialScreen;
      if (token != null && role != null) {
        if (role == 'Doctor') {
          initialScreen = const DoctorHomeView();
        } else if (role == 'Receptionist') {
          initialScreen = const ReceptionHomeView();
        } else if (role == 'Admin') {
          initialScreen = const AdminHomeView();
        } else {
          initialScreen = const PatientHomeView();
        }
      } else {
        initialScreen = const LoginView();
      }

      runApp(MyApp(initialScreen: initialScreen));
    },
  );
}

class MyApp extends StatelessWidget {
  final Widget initialScreen;
  const MyApp({super.key, required this.initialScreen});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CareConnect Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0F766E),
          primary: const Color(0xFF0F766E),
          secondary: const Color(0xFF0D9488),
          surface: Colors.white,
        ),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF8FAFC),
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: const Color(0xFFF8FAFC),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF0F766E), width: 2),
          ),
          labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
        ),
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            elevation: 0,
            shadowColor: Colors.transparent,
            backgroundColor: const Color(0xFF0F766E),
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ),
      home: initialScreen,
    );
  }
}

