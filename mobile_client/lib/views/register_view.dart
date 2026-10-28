import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'patient/patient_home_view.dart';

class RegisterView extends StatefulWidget {
  const RegisterView({Key? key}) : super(key: key);

  @override
  State<RegisterView> createState() => _RegisterViewState();
}

class _RegisterViewState extends State<RegisterView> {
  final _apiService = ApiService();
  
  int _currentStep = 1;
  bool _isLoading = false;

  // Controllers Step 1
  final _nameController = TextEditingController();
  final _usernameController = TextEditingController();
  final _nationalIdController = TextEditingController();
  final _phoneController = TextEditingController();
  DateTime? _selectedDob;

  // Controllers Step 2
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(
      context: context,
      initialDate: DateTime(1995, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
      builder: (context, child) {
        return Theme(
          data: Theme.of(context).copyWith(
            colorScheme: const ColorScheme.light(
              primary: Color(0xFF0F766E),
              onPrimary: Colors.white,
              onSurface: Color(0xFF1E293B),
            ),
          ),
          child: child!,
        );
      },
    );
    if (picked != null && picked != _selectedDob) {
      setState(() {
        _selectedDob = picked;
      });
    }
  }

  Future<void> _handleCheckInfo() async {
    final name = _nameController.text.trim();
    final username = _usernameController.text.trim();
    final nationalId = _nationalIdController.text.trim();
    final phone = _phoneController.text.trim();

    if (name.isEmpty || username.isEmpty || nationalId.isEmpty || phone.isEmpty || _selectedDob == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền đầy đủ thông tin hành chính và chọn Ngày sinh.")),
      );
      return;
    }

    if (!RegExp(r'^[a-zA-Z0-9_.]+$').hasMatch(username)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Tên đăng nhập chỉ chứa chữ cái, số, dấu chấm (.) và gạch dưới (_).")),
      );
      return;
    }

    if (username.length < 3) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Tên đăng nhập phải có ít nhất 3 ký tự.")),
      );
      return;
    }

    if (nationalId.length != 9 && nationalId.length != 12) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Số CCCD/CMND phải gồm 9 hoặc 12 chữ số.")),
      );
      return;
    }

    // Đối soát cấu trúc thẻ CCCD 12 số gắn chip theo quy tắc của Bộ Công An
    if (nationalId.length == 12) {
      // 1. Kiểm tra 3 số đầu
      final provinceCode = nationalId.substring(0, 3);
      const validProvinces = [
        "001", "002", "004", "006", "008", "010", "011", "012", "014", "015",
        "017", "019", "020", "022", "024", "025", "026", "027", "030", "031",
        "033", "034", "035", "036", "037", "038", "040", "042", "044", "045",
        "046", "048", "049", "051", "052", "054", "056", "058", "060", "062",
        "064", "066", "067", "068", "070", "072", "074", "075", "077", "079",
        "080", "082", "083", "084", "086", "087", "089", "091", "092", "093",
        "094", "095", "096"
      ];
      if (!validProvinces.contains(provinceCode)) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Không xác thực được thông tin. Vui lòng kiểm tra lại!")),
        );
        return;
      }

      final dobYear = _selectedDob!.year;
      // 2. Kiểm tra số thứ 4
      final centuryDigit = int.tryParse(nationalId[3]) ?? -1;
      int expected1 = -1, expected2 = -1;
      if (dobYear >= 1900 && dobYear <= 1999) {
        expected1 = 0; expected2 = 1;
      } else if (dobYear >= 2000 && dobYear <= 2099) {
        expected1 = 2; expected2 = 3;
      } else if (dobYear >= 2100 && dobYear <= 2199) {
        expected1 = 4; expected2 = 5;
      } else if (dobYear >= 2200 && dobYear <= 2299) {
        expected1 = 6; expected2 = 7;
      } else if (dobYear >= 1800 && dobYear <= 1899) {
        expected1 = 8; expected2 = 9;
      }

      if (centuryDigit != expected1 && centuryDigit != expected2) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Không xác thực được thông tin. Vui lòng kiểm tra lại!")),
        );
        return;
      }

      // 3. Kiểm tra số thứ 5 và 6
      final yearDigits = (dobYear % 100).toString().padLeft(2, '0');
      final cccdYearDigits = nationalId.substring(4, 6);
      if (cccdYearDigits != yearDigits) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Không xác thực được thông tin. Vui lòng kiểm tra lại!")),
        );
        return;
      }
    }

    setState(() => _isLoading = true);

    // Gọi API verify-citizen
    final dobStr = "${_selectedDob!.year}-${_selectedDob!.month.toString().padLeft(2, '0')}-${_selectedDob!.day.toString().padLeft(2, '0')}";
    final result = await _apiService.verifyCitizen(
      fullName: name,
      nationalId: nationalId,
      phoneNumber: phone,
      dateOfBirth: dobStr,
    );

    setState(() => _isLoading = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.teal),
      );
      setState(() {
        _currentStep = 2;
      });
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _handleRegister() async {
    final name = _nameController.text.trim();
    final username = _usernameController.text.trim();
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    final phone = _phoneController.text.trim();
    final nationalId = _nationalIdController.text.trim();

    if (password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền Mật khẩu.")),
      );
      return;
    }

    if (password.length < 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Mật khẩu phải có ít nhất 6 ký tự.")),
      );
      return;
    }

    setState(() => _isLoading = true);
    
    final dobStr = _selectedDob != null
        ? "${_selectedDob!.year}-${_selectedDob!.month.toString().padLeft(2, '0')}-${_selectedDob!.day.toString().padLeft(2, '0')}"
        : null;

    final result = await _apiService.register(
      fullName: name,
      username: username,
      email: email,
      password: password,
      phoneNumber: phone.isEmpty ? null : phone,
      nationalId: nationalId.isEmpty ? null : nationalId,
      dateOfBirth: dobStr,
    );

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Đăng ký thành công! Đang tự động đăng nhập..."), backgroundColor: Colors.teal),
      );
      
      // Tự động đăng nhập
      final loginResult = await _apiService.login(username, password);
      setState(() => _isLoading = false);

      if (loginResult['success']) {
        await _apiService.registerDeviceToken("fcm_simulator_token_patient_12345");

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text("Đăng nhập thành công!"), backgroundColor: Colors.teal),
          );
          
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (context) => const PatientHomeView()),
            (route) => false,
          );
        }
      } else {
        if (mounted) {
          Navigator.pop(context);
        }
      }
    } else {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(result['message']),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final dobText = _selectedDob == null
        ? "Chọn ngày sinh"
        : "${_selectedDob!.day.toString().padLeft(2, '0')}/${_selectedDob!.month.toString().padLeft(2, '0')}/${_selectedDob!.year}";

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Color(0xFF1E293B)),
          onPressed: () {
            if (_currentStep == 2) {
              setState(() => _currentStep = 1);
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: Stack(
        children: [
          // Background circles
          Positioned(
            top: -100,
            left: -100,
            child: Container(
              width: 300,
              height: 300,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF0F766E).withOpacity(0.05),
              ),
            ),
          ),
          Positioned(
            bottom: -50,
            right: -50,
            child: Container(
              width: 250,
              height: 250,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                color: const Color(0xFF0D9488).withOpacity(0.04),
              ),
            ),
          ),
          Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28.0),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  // App Logo
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: const Color(0xFFE6F4F1),
                      shape: BoxShape.circle,
                      border: Border.all(color: const Color(0xFF0D9488).withOpacity(0.1), width: 1.5),
                    ),
                    child: Icon(
                      _currentStep == 1 ? Icons.assignment_ind_rounded : Icons.lock_outline_rounded,
                      size: 48,
                      color: const Color(0xFF0F766E),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(
                    _currentStep == 1 ? "Bước 1: Kiểm Tra Thông Tin" : "Bước 2: Tạo Tài Khoản",
                    style: const TextStyle(
                      fontSize: 22,
                      fontWeight: FontWeight.w800,
                      color: Color(0xFF1E293B),
                      letterSpacing: -0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _currentStep == 1 
                        ? "Điền thông tin hành chính để đối soát hồ sơ" 
                        : "Thiết lập thông tin đăng nhập tài khoản của bạn",
                    style: const TextStyle(fontSize: 12.5, color: Color(0xFF64748B), fontWeight: FontWeight.w500),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 20),
                  
                  // Progress Steps indicator
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: const Color(0xFF0F766E),
                          border: Border.all(color: const Color(0xFF0D9488)),
                        ),
                        child: const Center(child: Text("1", style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold))),
                      ),
                      Container(
                        width: 60,
                        height: 2,
                        color: _currentStep == 2 ? const Color(0xFF0F766E) : const Color(0xFFCBD5E1),
                      ),
                      Container(
                        width: 24,
                        height: 24,
                        decoration: BoxDecoration(
                          shape: BoxShape.circle,
                          color: _currentStep == 2 ? const Color(0xFF0F766E) : const Color(0xFFE2E8F0),
                          border: Border.all(color: _currentStep == 2 ? const Color(0xFF0D9488) : const Color(0xFFCBD5E1)),
                        ),
                        child: Center(
                          child: Text(
                            "2",
                            style: TextStyle(
                              color: _currentStep == 2 ? Colors.white : const Color(0xFF64748B),
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // Form Container
                  Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: const Color(0xFFE2E8F0), width: 1),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF1E293B).withOpacity(0.04),
                          blurRadius: 24,
                          offset: const Offset(0, 8),
                        ),
                      ],
                    ),
                    padding: const EdgeInsets.all(24.0),
                    child: _currentStep == 1 
                        ? _buildStep1()
                        : _buildStep2(dobText),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStep1() {
    return Column(
      children: [
        TextField(
          controller: _nameController,
          decoration: const InputDecoration(
            labelText: "Họ và tên *",
            prefixIcon: Icon(Icons.person_outline_rounded, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _usernameController,
          decoration: const InputDecoration(
            labelText: "Tên đăng nhập *",
            prefixIcon: Icon(Icons.account_circle_outlined, size: 20),
            hintText: "Chỉ chứa chữ cái, số, dấu . hoặc _",
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _nationalIdController,
          keyboardType: TextInputType.number,
          decoration: const InputDecoration(
            labelText: "Số CCCD/CMND *",
            prefixIcon: Icon(Icons.badge_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(
            labelText: "Số điện thoại *",
            prefixIcon: Icon(Icons.phone_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        // Date of birth picker button
        InkWell(
          onTap: () => _selectDate(context),
          borderRadius: BorderRadius.circular(8),
          child: InputDecorator(
            decoration: const InputDecoration(
              labelText: "Ngày sinh *",
              prefixIcon: Icon(Icons.calendar_today_outlined, size: 18),
            ),
            child: Text(
              _selectedDob == null
                  ? "Chọn ngày sinh"
                  : "${_selectedDob!.day.toString().padLeft(2, '0')}/${_selectedDob!.month.toString().padLeft(2, '0')}/${_selectedDob!.year}",
              style: TextStyle(
                color: _selectedDob == null ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                fontSize: 15,
              ),
            ),
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0F766E),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            onPressed: _isLoading ? null : _handleCheckInfo,
            child: _isLoading
                ? const CircularProgressIndicator(color: Colors.white)
                : const Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text("Kiểm tra thông tin", style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
                      SizedBox(width: 8),
                      Icon(Icons.arrow_forward_rounded, size: 18, color: Colors.white),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildStep2(String dobText) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Summary Card of Step 1
        Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFFE2E8F0)),
          ),
          padding: const EdgeInsets.all(14),
          margin: const EdgeInsets.only(bottom: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Row(
                children: [
                  Icon(Icons.check_circle, color: Color(0xFF0F766E), size: 16),
                  SizedBox(width: 6),
                  Text("Thông tin hành chính đã xác nhận:", style: TextStyle(fontSize: 12.5, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                ],
              ),
              const Divider(height: 16, color: Color(0xFFCBD5E1)),
              _buildSummaryRow("Họ tên:", _nameController.text),
              const SizedBox(height: 4),
              _buildSummaryRow("Tên đăng nhập:", _usernameController.text),
              const SizedBox(height: 4),
              _buildSummaryRow("CCCD/CMND:", _nationalIdController.text),
              const SizedBox(height: 4),
              _buildSummaryRow("Số điện thoại:", _phoneController.text),
              const SizedBox(height: 4),
              _buildSummaryRow("Ngày sinh:", dobText),
            ],
          ),
        ),
        
        TextField(
          controller: _emailController,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: "Email đăng nhập (tùy chọn)",
            prefixIcon: Icon(Icons.email_outlined, size: 20),
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _passwordController,
          obscureText: true,
          decoration: const InputDecoration(
            labelText: "Mật khẩu *",
            prefixIcon: Icon(Icons.lock_outline, size: 20),
          ),
        ),
        const SizedBox(height: 24),
        
        Row(
          children: [
            Expanded(
              child: SizedBox(
                height: 50,
                child: OutlinedButton(
                  style: OutlinedButton.styleFrom(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    side: const BorderSide(color: Color(0xFFCBD5E1)),
                  ),
                  onPressed: () => setState(() => _currentStep = 1),
                  child: const Text("Quay lại", style: TextStyle(fontSize: 15, color: Color(0xFF64748B), fontWeight: FontWeight.bold)),
                ),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              flex: 2,
              child: SizedBox(
                height: 50,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0F766E),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: _isLoading ? null : _handleRegister,
                  child: _isLoading
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("Đăng Ký", style: TextStyle(fontSize: 15, color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 100,
          child: Text(label, style: const TextStyle(fontSize: 12, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
        ),
        Expanded(
          child: Text(value, style: const TextStyle(fontSize: 12, color: Color(0xFF1E293B), fontWeight: FontWeight.bold)),
        ),
      ],
    );
  }
}
