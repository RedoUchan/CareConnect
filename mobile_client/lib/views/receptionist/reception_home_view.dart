import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/branch_model.dart';
import '../login_view.dart';
import 'package:mobile_scanner/mobile_scanner.dart';

class ReceptionHomeView extends StatefulWidget {
  const ReceptionHomeView({Key? key}) : super(key: key);

  @override
  State<ReceptionHomeView> createState() => _ReceptionHomeViewState();
}

class _ReceptionHomeViewState extends State<ReceptionHomeView> with SingleTickerProviderStateMixin {
  final _apiService = ApiService();
  List<dynamic> _appointments = [];
  bool _isLoading = true;
  String _receptionName = "Lễ tân";

  // Form Lễ tân check-in đo sinh hiệu
  final _bpController = TextEditingController();
  final _tempController = TextEditingController();
  final _weightController = TextEditingController();
  final _hrController = TextEditingController();
  bool _isCheckingIn = false;

  // Form Walk-in State
  bool _isNewPatient = false;
  List<dynamic> _patients = [];
  List<dynamic> _doctors = [];
  List<BranchModel> _branches = [];
  int? _selectedPatientId;
  int? _selectedDoctorId;
  int? _selectedBranchId;
  DateTime _walkInDate = DateTime.now();
  List<String> _availableSlots = [];
  String? _selectedSlot;
  String _selectedPaymentMethod = "Cash";

  // Thông tin đăng ký bệnh nhân mới
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _symptomsController = TextEditingController();
  bool _isSubmittingWalkIn = false;

  // Tab 3: Quản lý Danh bạ Bệnh nhân
  List<dynamic> _patientList = [];
  bool _isLoadingPatientList = false;
  String _patientSearchQuery = "";

  // Tra cứu hàng đợi
  String _searchQuery = "";

  // Controllers cho chỉnh sửa hồ sơ bệnh nhân
  final _editNameController = TextEditingController();
  final _editPhoneController = TextEditingController();
  final _editEmailController = TextEditingController();
  final _editAddressController = TextEditingController();
  final _editDobController = TextEditingController();
  final _editInsuranceController = TextEditingController();
  final _editNationalIdController = TextEditingController();
  String _editGender = "Nam";
  String _editBloodType = "O";
  bool _isSavingPatientEdit = false;

  // Animation controller cho tia laser quét QR
  late AnimationController _scannerAnimationController;

  @override
  void initState() {
    super.initState();
    _loadAppointments();
    _loadWalkInData();
    _loadPatientList();

    _scannerAnimationController = AnimationController(
      duration: const Duration(seconds: 2),
      vsync: this,
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _scannerAnimationController.dispose();
    super.dispose();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    try {
      final name = await _apiService.getUserName() ?? "Lễ tân";
      final appointments = await _apiService.getMyAppointments();
      setState(() {
        _receptionName = name;
        _appointments = appointments;
        _isLoading = false;
      });
    } catch (_) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadWalkInData() async {
    try {
      final pts = await _apiService.getPatients();
      final docs = await _apiService.getDoctors();
      final brs = await _apiService.getBranches();
      setState(() {
        _patients = pts;
        _doctors = docs;
        _branches = brs;
      });
    } catch (_) {}
  }

  Future<void> _loadPatientList() async {
    setState(() => _isLoadingPatientList = true);
    try {
      final pts = await _apiService.getPatients();
      setState(() {
        _patientList = pts;
        _isLoadingPatientList = false;
      });
    } catch (_) {
      setState(() => _isLoadingPatientList = false);
    }
  }

  Future<void> _fetchWalkInSlots() async {
    if (_selectedDoctorId == null) return;
    setState(() {
      _availableSlots = [];
      _selectedSlot = null;
    });

    try {
      final dateStr = "${_walkInDate.year}-${_walkInDate.month.toString().padLeft(2, '0')}-${_walkInDate.day.toString().padLeft(2, '0')}";
      final slots = await _apiService.getAvailableSlots(_selectedDoctorId!, dateStr);
      setState(() {
        _availableSlots = slots;
      });
    } catch (_) {}
  }

  Future<void> _handleLogout() async {
    await _apiService.logout();
    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (context) => const LoginView()),
      );
    }
  }

  // Mở Dialog đo sinh hiệu Check-in
  void _openCheckInDialog(dynamic app) {
    _bpController.text = "120/80";
    _tempController.text = "36.5";
    _weightController.text = "60";
    _hrController.text = "75";

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: Text("Đo Sinh Hiệu: ${app['patientName']}", style: const TextStyle(color: Colors.teal, fontSize: 16, fontWeight: FontWeight.bold)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: _bpController,
                  keyboardType: TextInputType.text, // Để nhập dạng "120/80"
                  decoration: const InputDecoration(labelText: "Huyết áp (mmHg)", hintText: "120/80"),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _tempController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true), // Số thập phân
                  decoration: const InputDecoration(labelText: "Nhiệt độ (°C)", hintText: "36.5"),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _weightController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true), // Số thập phân
                  decoration: const InputDecoration(labelText: "Cân nặng (kg)", hintText: "60"),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _hrController,
                  keyboardType: TextInputType.number, // Số nguyên
                  decoration: const InputDecoration(labelText: "Nhịp tim (bpm)", hintText: "75"),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text("Hủy")),
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
              onPressed: () => _submitCheckIn(app),
              child: const Text("Xác nhận Check-in", style: TextStyle(color: Colors.white)),
            ),
          ],
        );
      },
    );
  }

  Future<void> _submitCheckIn(dynamic app) async {
    final bp = _bpController.text.trim();
    final temp = _tempController.text.trim();
    final weight = _weightController.text.trim();
    final hr = _hrController.text.trim();

    setState(() => _isCheckingIn = true);

    final payload = {
      "status": "CheckedIn",
      "bloodPressure": bp,
      "temperature": temp,
      "weight": weight,
      "heartRate": hr
    };

    final success = await _apiService.updateAppointmentStatus(app['appointmentId'], payload);
    setState(() => _isCheckingIn = false);

    if (success) {
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Bệnh nhân đã Check-in & sẵn sàng khám!"), backgroundColor: Colors.green),
        );
        _loadAppointments();
      }
    }
  }

  Future<void> _cancelAppointment(dynamic app) async {
    final payload = {
      "status": "Cancelled",
      "bloodPressure": app['bloodPressure'],
      "temperature": app['temperature'],
      "weight": app['weight'],
      "heartRate": app['heartRate']
    };
    final success = await _apiService.updateAppointmentStatus(app['appointmentId'], payload);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Đã hủy lịch hẹn khám thành công!"), backgroundColor: Colors.grey),
      );
      _loadAppointments();
    }
  }

  // Mở Hộp thoại giả lập quét mã QR
  void _openQrScannerDialog() {
    final pendingApps = _appointments.where((a) => a['status'] == 'Confirmed' || a['status'] == 'Pending').toList();
    dynamic selectedMockScanApp;
    final idInputController = TextEditingController();
    bool isScanned = false;

    showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            
            void handleScanSuccess(dynamic app) {
              if (isScanned) return;
              isScanned = true;
              Navigator.pop(context); // Đóng camera
              _openCheckInDialog(app); // Mở đo sinh hiệu
            }

            void lookupAndCheckIn() {
              final inputId = idInputController.text.trim();
              if (inputId.isEmpty) return;

              final app = _appointments.firstWhere(
                (a) => a['appointmentId'].toString() == inputId,
                orElse: () => null,
              );

              if (app != null) {
                handleScanSuccess(app);
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Không tìm thấy mã lịch hẹn phù hợp trong hệ thống!"), backgroundColor: Colors.red),
                );
              }
            }

            return AlertDialog(
              title: Row(
                children: const [
                  Icon(Icons.qr_code_scanner, color: Colors.teal),
                  SizedBox(width: 8),
                  Text("Quét QR Check-in", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    // Container chứa camera quét thật
                    Container(
                      width: 260,
                      height: 180,
                      decoration: BoxDecoration(
                        color: Colors.black87,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Stack(
                          children: [
                            // Máy quét thật sử dụng camera
                            MobileScanner(
                              onDetect: (capture) {
                                final List<Barcode> barcodes = capture.barcodes;
                                for (final barcode in barcodes) {
                                  final String? rawValue = barcode.rawValue;
                                  if (rawValue != null && rawValue.isNotEmpty) {
                                    // Hỗ trợ quét cả link QR đầy đủ hoặc chỉ mã số ID
                                    // Ví dụ mã chứa: "https://api.qrserver.com/v1/...&data=3" hoặc chứa chỉ "3"
                                    String id = rawValue.trim();
                                    if (id.contains("data=")) {
                                      id = id.substring(id.indexOf("data=") + 5);
                                    }
                                    
                                    final app = _appointments.firstWhere(
                                      (a) => a['appointmentId'].toString() == id,
                                      orElse: () => null,
                                    );
                                    
                                    if (app != null) {
                                      handleScanSuccess(app);
                                      break;
                                    }
                                  }
                                }
                              },
                            ),
                            // Khung quét màu xanh lá
                            Center(
                              child: Container(
                                width: 120,
                                height: 120,
                                decoration: BoxDecoration(
                                  border: Border.all(color: Colors.green, width: 2),
                                  borderRadius: BorderRadius.circular(4),
                                ),
                              ),
                            ),
                            // Tia Laser di chuyển giả lập đè lên trên camera
                            AnimatedBuilder(
                              animation: _scannerAnimationController,
                              builder: (context, child) {
                                final laserPosition = _scannerAnimationController.value * 120 + 30;
                                return Positioned(
                                  top: laserPosition,
                                  left: 70,
                                  right: 70,
                                  child: Container(
                                    height: 2.5,
                                    decoration: BoxDecoration(
                                      color: Colors.red,
                                      boxShadow: [
                                        BoxShadow(color: Colors.red.withOpacity(0.8), blurRadius: 4, spreadRadius: 1)
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                            const Positioned(
                              bottom: 8,
                              left: 0,
                              right: 0,
                              child: Center(
                                child: Text(
                                  "Hướng mã QR của bệnh nhân vào khung",
                                  style: TextStyle(color: Colors.white70, fontSize: 10, fontWeight: FontWeight.bold),
                                ),
                              ),
                            )
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    const Text("LỰA CHỌN MÔ PHỎNG QUÉT NHANH:", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    // Dropdown chọn nhanh lịch để giả lập quét thành công
                    DropdownButtonFormField<dynamic>(
                      decoration: const InputDecoration(labelText: "Chọn nhanh bệnh nhân quét thử", border: OutlineInputBorder()),
                      value: selectedMockScanApp,
                      items: pendingApps.map((a) {
                        return DropdownMenuItem<dynamic>(
                          value: a,
                          child: Text("${a['patientName']} (Mã: #${a['appointmentId']})"),
                        );
                      }).toList(),
                      onChanged: (val) {
                        setModalState(() {
                          selectedMockScanApp = val;
                        });
                        if (val != null) {
                          handleScanSuccess(val);
                        }
                      },
                    ),
                    const SizedBox(height: 12),
                    const Text("HOẶC NHẬP MÃ SỐ LỊCH HẸN TRÊN MÃ QR:", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: idInputController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(hintText: "Nhập mã số (Ví dụ: 3)", border: OutlineInputBorder()),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                          onPressed: lookupAndCheckIn,
                          child: const Text("Tìm & Check-in", style: TextStyle(color: Colors.white)),
                        ),
                      ],
                    )
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.pop(context),
                  child: const Text("Đóng"),
                )
              ],
            );
          },
        );
      },
    );
  }

  // Gửi tiếp nhận Walk-in
  Future<void> _submitWalkIn() async {
    int? finalPatientId = _selectedPatientId;

    if (_isNewPatient) {
      final name = _fullNameController.text.trim();
      final email = _emailController.text.trim();
      final phone = _phoneController.text.trim();
      final address = _addressController.text.trim();

      if (name.isEmpty || email.isEmpty || phone.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Vui lòng điền đủ Họ tên, Email, SĐT để đăng ký bệnh nhân mới!")),
        );
        return;
      }

      setState(() => _isSubmittingWalkIn = true);
      final regPayload = {
        "fullName": name,
        "email": email,
        "phoneNumber": phone,
        "password": "123456",
        "address": address,
        "role": "Patient"
      };

      final regRes = await _apiService.registerNewPatient(regPayload);
      if (!regRes['success']) {
        setState(() => _isSubmittingWalkIn = false);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(regRes['message']), backgroundColor: Colors.red),
          );
        }
        return;
      }
      finalPatientId = regRes['userId'];
    }

    if (finalPatientId == null || _selectedDoctorId == null || _selectedSlot == null) {
      setState(() => _isSubmittingWalkIn = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng chọn bác sĩ và khung giờ khám!")),
      );
      return;
    }

    setState(() => _isSubmittingWalkIn = true);

    String? selectedBranchName;
    if (_selectedBranchId != null) {
      selectedBranchName = _branches.firstWhere((b) => b.branchId == _selectedBranchId).name;
    }

    final dateStr = "${_walkInDate.year}-${_walkInDate.month.toString().padLeft(2, '0')}-${_walkInDate.day.toString().padLeft(2, '0')}T00:00:00Z";
    final bookPayload = {
      "patientId": finalPatientId,
      "doctorId": _selectedDoctorId,
      "appointmentDate": dateStr,
      "timeSlot": _selectedSlot,
      "symptoms": _symptomsController.text.trim().isEmpty ? "Tiếp nhận bệnh nhân vãng lai (Walk-in)." : _symptomsController.text.trim(),
      "hospitalBranch": selectedBranchName ?? "CareConnect Quận 1",
      "paymentMethod": _selectedPaymentMethod,
    };

    final bookRes = await _apiService.bookAppointment(bookPayload);
    setState(() => _isSubmittingWalkIn = false);

    if (bookRes['success']) {
      final appointmentId = bookRes['data']['appointmentId'];
      final checkInPayload = {
        "status": "CheckedIn",
        "bloodPressure": "120/80",
        "temperature": "36.5",
        "weight": "60",
        "heartRate": "75"
      };
      await _apiService.updateAppointmentStatus(appointmentId, checkInPayload);

      if (mounted) {
        _showAdmissionTicketDialog(bookRes['data']);
        
        _fullNameController.clear();
        _emailController.clear();
        _phoneController.clear();
        _addressController.clear();
        _symptomsController.clear();
        setState(() {
          _selectedPatientId = null;
          _selectedSlot = null;
        });
        _loadAppointments();
        _loadWalkInData();
        _loadPatientList();
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(bookRes['message']), backgroundColor: Colors.red),
        );
      }
    }
  }

  void _showAdmissionTicketDialog(dynamic appData) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text("Phiếu Tiếp Nhận Bệnh Nhân", style: TextStyle(color: Colors.teal, fontWeight: FontWeight.bold)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text("Bệnh nhân: ${appData['patientName'] ?? 'Họ tên'}", style: const TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              Text("Bác sĩ khám: ${appData['doctorName'] ?? 'Bác sĩ'}"),
              Text("Khung giờ: ${appData['timeSlot'] ?? 'Giờ'}"),
              Text("Chi nhánh: ${appData['hospitalBranch'] ?? 'Quận 1'}"),
              const Divider(),
              const SizedBox(height: 6),
              const Center(
                child: Text(
                  "SỐ THỨ TỰ KHÁM",
                  style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
                ),
              ),
              Center(
                child: Text(
                  "STT: ${appData['appointmentId'] ?? '99'}",
                  style: const TextStyle(fontSize: 32, color: Colors.teal, fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          actions: [
            ElevatedButton(
              style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
              onPressed: () => Navigator.pop(context),
              child: const Text("Đóng & In Phiếu", style: TextStyle(color: Colors.white)),
            )
          ],
        );
      },
    );
  }

  // Chỉnh sửa hồ sơ bệnh nhân
  void _openEditPatientSheet(dynamic patient) {
    _editNameController.text = patient['fullName'] ?? '';
    _editPhoneController.text = patient['phoneNumber'] ?? '';
    _editEmailController.text = patient['email'] ?? '';
    _editAddressController.text = patient['address'] ?? '';
    _editInsuranceController.text = patient['insuranceCardNumber'] ?? '';
    _editNationalIdController.text = patient['nationalId'] ?? '';
    
    if (patient['dateOfBirth'] != null) {
      _editDobController.text = patient['dateOfBirth'].toString().split('T')[0];
    } else {
      _editDobController.clear();
    }

    _editGender = patient['gender'] ?? "Nam";
    _editBloodType = patient['bloodType'] ?? "O";
    _isSavingPatientEdit = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            Future<void> savePatientChanges() async {
              if (_editNameController.text.trim().isEmpty) {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text("Họ tên bắt buộc!")));
                return;
              }

              setModalState(() => _isSavingPatientEdit = true);

              final payload = {
                "fullName": _editNameController.text.trim(),
                "phoneNumber": _editPhoneController.text.trim(),
                "email": _editEmailController.text.trim(),
                "address": _editAddressController.text.trim(),
                "gender": _editGender,
                "bloodType": _editBloodType,
                "insuranceCardNumber": _editInsuranceController.text.trim(),
                "nationalId": _editNationalIdController.text.trim(),
                "dateOfBirth": _editDobController.text.trim().isEmpty ? null : "${_editDobController.text.trim()}T00:00:00Z"
              };

              final res = await _apiService.updateUser(patient['userId'], payload);
              setModalState(() => _isSavingPatientEdit = false);

              if (res['success']) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Đã lưu hồ sơ bệnh nhân!"), backgroundColor: Colors.green),
                );
                _loadPatientList();
                _loadWalkInData();
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(res['message']), backgroundColor: Colors.red),
                );
              }
            }

            return Padding(
              padding: EdgeInsets.only(
                left: 16.0,
                right: 16.0,
                top: 16.0,
                bottom: MediaQuery.of(context).viewInsets.bottom + 16.0,
              ),
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text("Sửa Hồ Sơ Bệnh Nhân", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal)),
                        IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                      ],
                    ),
                    const Divider(),
                    const SizedBox(height: 8),
                    TextField(controller: _editNameController, decoration: const InputDecoration(labelText: "Họ và Tên *", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _editPhoneController, decoration: const InputDecoration(labelText: "Số điện thoại", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _editEmailController, decoration: const InputDecoration(labelText: "Email (Tên đăng nhập)", border: OutlineInputBorder(), enabled: false)),
                    const SizedBox(height: 12),
                    TextField(controller: _editDobController, decoration: const InputDecoration(labelText: "Ngày sinh (YYYY-MM-DD)", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _editAddressController, decoration: const InputDecoration(labelText: "Địa chỉ", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            decoration: const InputDecoration(labelText: "Giới tính", border: OutlineInputBorder()),
                            value: _editGender,
                            items: const [
                              DropdownMenuItem(value: "Nam", child: Text("Nam")),
                              DropdownMenuItem(value: "Nữ", child: Text("Nữ")),
                              DropdownMenuItem(value: "Khác", child: Text("Khác")),
                            ],
                            onChanged: (val) {
                              setModalState(() => _editGender = val ?? "Nam");
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            decoration: const InputDecoration(labelText: "Nhóm máu", border: OutlineInputBorder()),
                            value: _editBloodType,
                            items: const ["A", "B", "O", "AB"].map((t) {
                              return DropdownMenuItem(value: t, child: Text(t));
                            }).toList(),
                            onChanged: (val) {
                              setModalState(() => _editBloodType = val ?? "O");
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _editInsuranceController, decoration: const InputDecoration(labelText: "Số bảo hiểm y tế", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _editNationalIdController, decoration: const InputDecoration(labelText: "Số CCCD", border: OutlineInputBorder())),
                    const SizedBox(height: 20),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                        onPressed: _isSavingPatientEdit ? null : savePatientChanges,
                        child: _isSavingPatientEdit
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text("Lưu Hồ Sơ Bệnh Nhân", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    )
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            "Lễ Tân: $_receptionName", 
            style: const TextStyle(color: Color(0xFF1E293B), fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: -0.5),
          ),
          backgroundColor: Colors.white,
          elevation: 0,
          shape: const Border(bottom: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
          actions: [
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: Color(0xFF64748B)),
              onPressed: _handleLogout,
            )
          ],
          bottom: const TabBar(
            labelColor: Color(0xFF0F766E),
            unselectedLabelColor: Color(0xFF64748B),
            indicatorColor: Color(0xFF0F766E),
            indicatorSize: TabBarIndicatorSize.label,
            tabs: [
              Tab(icon: Icon(Icons.queue_rounded), text: "Hàng Đợi"),
              Tab(icon: Icon(Icons.person_add_alt_1_rounded), text: "Tiếp Nhận"),
              Tab(icon: Icon(Icons.contact_phone_rounded), text: "Danh Bạ Bệnh Nhân"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildTodayQueueTab(),
            _buildWalkInTab(),
            _buildPatientListTab(),
          ],
        ),
      ),
    );
  }

  // --- TAB 1 LAYOUT: TODAY QUEUE ---
  Widget _buildTodayQueueTab() {
    if (_isLoading) return const Center(child: CircularProgressIndicator());

    final confirmedApps = _appointments.where((a) => a['status'] == 'Confirmed').toList();
    final checkedInApps = _appointments.where((a) => a['status'] == 'CheckedIn').toList();
    final othersApps = _appointments.where((a) => a['status'] != 'Confirmed' && a['status'] != 'CheckedIn').toList();

    // Lọc theo từ khóa tìm kiếm
    final filteredConfirmed = confirmedApps.where((a) {
      final name = (a['patientName'] ?? '').toString().toLowerCase();
      final doc = (a['doctorName'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || doc.contains(query);
    }).toList();

    final filteredCheckedIn = checkedInApps.where((a) {
      final name = (a['patientName'] ?? '').toString().toLowerCase();
      final doc = (a['doctorName'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || doc.contains(query);
    }).toList();

    final filteredOthers = othersApps.where((a) {
      final name = (a['patientName'] ?? '').toString().toLowerCase();
      final doc = (a['doctorName'] ?? '').toString().toLowerCase();
      final query = _searchQuery.toLowerCase();
      return name.contains(query) || doc.contains(query);
    }).toList();

    return RefreshIndicator(
      onRefresh: _loadAppointments,
      child: ListView(
        padding: const EdgeInsets.all(12),
        children: [
          // Tra cứu & Quét QR check-in
          Row(
            children: [
              Expanded(
                child: TextField(
                  decoration: InputDecoration(
                    hintText: "Tra cứu lịch hẹn (Tên BN, Bác sĩ...)",
                    prefixIcon: const Icon(Icons.search, color: Colors.teal),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                  ),
                  onChanged: (val) {
                    setState(() {
                      _searchQuery = val;
                    });
                  },
                ),
              ),
              const SizedBox(width: 10),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.teal,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 20),
                label: const Text("Quét QR Check-in", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                onPressed: _openQrScannerDialog,
              )
            ],
          ),
          const SizedBox(height: 16),
          _buildQueueSection("Bệnh nhân Đợi Đo Sinh Hiệu (Chưa Check-in)", filteredConfirmed, isPendingCheckIn: true),
          const SizedBox(height: 16),
          _buildQueueSection("Hàng đợi chờ Bác sĩ khám (Đã Check-in)", filteredCheckedIn, isPendingCheckIn: false),
          const SizedBox(height: 16),
          _buildQueueSection("Trạng thái khác (Đã khám / Đã hủy)", filteredOthers, isReadOnly: true),
        ],
      ),
    );
  }

  Widget _buildQueueSection(String title, List<dynamic> list, {bool isPendingCheckIn = false, bool isReadOnly = false}) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
          child: Text(
            title, 
            style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 14, color: Color(0xFF1E293B), letterSpacing: -0.3),
          ),
        ),
        list.isEmpty
            ? const Card(child: Padding(padding: EdgeInsets.all(16), child: Center(child: Text("Không có bệnh nhân.", style: TextStyle(color: Colors.grey, fontSize: 12)))))
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: list.length,
                itemBuilder: (context, index) {
                  final app = list[index];
                  return Card(
                    margin: const EdgeInsets.only(bottom: 8),
                    child: ListTile(
                      title: Row(
                        children: [
                          Text(app['patientName'], style: const TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(width: 8),
                          Text("(#${app['appointmentId']})", style: const TextStyle(color: Colors.grey, fontSize: 11)),
                        ],
                      ),
                      subtitle: Text("Giờ khám: ${app['timeSlot']} - BS: ${app['doctorName']}"),
                      trailing: isReadOnly
                          ? Text(app['status'] == 'Completed' ? 'Đã Khám' : 'Đã Hủy', style: TextStyle(color: app['status'] == 'Completed' ? Colors.green : Colors.red, fontWeight: FontWeight.bold, fontSize: 12))
                          : Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                if (isPendingCheckIn)
                                  ElevatedButton(
                                    style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4)),
                                    onPressed: () => _openCheckInDialog(app),
                                    child: const Text("Check-in", style: TextStyle(color: Colors.white, fontSize: 11)),
                                  ),
                                const SizedBox(width: 8),
                                TextButton(
                                  onPressed: () => _cancelAppointment(app),
                                  child: const Text("Hủy lịch", style: TextStyle(color: Colors.red, fontSize: 12)),
                                )
                              ],
                            ),
                    ),
                  );
                },
              )
      ],
    );
  }

  // --- TAB 2 LAYOUT: WALK-IN BOOKING ---
  Widget _buildWalkInTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Card(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                "Tiếp Nhận Bệnh Nhân (Walk-in)", 
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.5),
              ),
              const SizedBox(height: 16),
              // Lựa chọn: Bệnh nhân mới / Đã có tài khoản
              Row(
                children: [
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text("Bệnh nhân cũ")),
                      selected: !_isNewPatient,
                      selectedColor: const Color(0xFF0F766E),
                      labelStyle: TextStyle(color: !_isNewPatient ? Colors.white : Colors.black),
                      onSelected: (val) {
                        if (val) setState(() => _isNewPatient = false);
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ChoiceChip(
                      label: const Center(child: Text("Đăng ký mới")),
                      selected: _isNewPatient,
                      selectedColor: const Color(0xFF0F766E),
                      labelStyle: TextStyle(color: _isNewPatient ? Colors.white : Colors.black),
                      onSelected: (val) {
                        if (val) setState(() => _isNewPatient = true);
                      },
                    ),
                  )
                ],
              ),
              const SizedBox(height: 20),
              if (!_isNewPatient) ...[
                // Chọn Bệnh nhân cũ
                DropdownButtonFormField<int>(
                  isExpanded: true,
                  decoration: const InputDecoration(labelText: "Chọn Bệnh Nhân Đã Có Tài Khoản", border: OutlineInputBorder()),
                  value: _selectedPatientId,
                  items: _patients.map((p) {
                    return DropdownMenuItem<int>(
                      value: p['userId'],
                      child: Text(
                        "${p['fullName']} (SĐT: ${p['phoneNumber'] ?? 'Không có'})",
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                    );
                  }).toList(),
                  onChanged: (val) {
                    setState(() => _selectedPatientId = val);
                  },
                ),
              ] else ...[
                // Form đăng ký nhanh bệnh nhân mới
                TextField(controller: _fullNameController, decoration: const InputDecoration(labelText: "Họ và Tên Bệnh Nhân *", border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _emailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: "Email Đăng Ký *", border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _phoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: "Số Điện Thoại *", border: OutlineInputBorder())),
                const SizedBox(height: 12),
                TextField(controller: _addressController, decoration: const InputDecoration(labelText: "Địa Chỉ", border: OutlineInputBorder())),
              ],
              const Divider(height: 32),
              // Chọn Chi nhánh
              DropdownButtonFormField<int>(
                isExpanded: true,
                decoration: const InputDecoration(labelText: "Chọn Chi Nhánh Khám", border: OutlineInputBorder()),
                value: _selectedBranchId,
                items: _branches.map((b) {
                  return DropdownMenuItem<int>(
                    value: b.branchId,
                    child: Text(
                      b.name,
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() => _selectedBranchId = val);
                },
              ),
              const SizedBox(height: 12),
              // Chọn Bác sĩ
              DropdownButtonFormField<int>(
                isExpanded: true,
                decoration: const InputDecoration(labelText: "Chọn Bác Sĩ", border: OutlineInputBorder()),
                value: _selectedDoctorId,
                items: _doctors.map((d) {
                  return DropdownMenuItem<int>(
                    value: d['userId'],
                    child: Text(
                      "${d['fullName']} (${d['specialization']})",
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  );
                }).toList(),
                onChanged: (val) {
                  setState(() => _selectedDoctorId = val);
                  _fetchWalkInSlots();
                },
              ),
              const SizedBox(height: 12),
              // Chọn ca trực trống
              const Text("Khung giờ trống hôm nay:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
              const SizedBox(height: 8),
              _availableSlots.isEmpty
                  ? const Text("Vui lòng chọn bác sĩ hoặc bác sĩ đã hết ca trực.", style: TextStyle(color: Colors.orange, fontSize: 12))
                  : Wrap(
                      spacing: 8,
                      children: _availableSlots.map((slot) {
                        final isSelected = _selectedSlot == slot;
                        return ChoiceChip(
                          label: Text(slot),
                          selected: isSelected,
                          selectedColor: Colors.teal,
                          labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black),
                          onSelected: (val) {
                            setState(() {
                              _selectedSlot = val ? slot : null;
                            });
                          },
                        );
                      }).toList(),
                    ),
              const SizedBox(height: 16),
              // Triệu chứng
              TextField(
                controller: _symptomsController,
                decoration: const InputDecoration(labelText: "Lý do khám / Triệu chứng lâm sàng", border: OutlineInputBorder()),
              ),
              const SizedBox(height: 12),
              // Phương thức thanh toán
              DropdownButtonFormField<String>(
                decoration: const InputDecoration(labelText: "Phương thức thanh toán", border: OutlineInputBorder()),
                value: _selectedPaymentMethod,
                items: const [
                  DropdownMenuItem(value: "Cash", child: Text("Thanh toán tiền mặt")),
                  DropdownMenuItem(value: "VNPay", child: Text("VNPay Ví điện tử")),
                  DropdownMenuItem(value: "CreditCard", child: Text("Thẻ ngân hàng / Thẻ Visa")),
                ],
                onChanged: (val) {
                  setState(() => _selectedPaymentMethod = val ?? "Cash");
                },
              ),
              const SizedBox(height: 24),
              // Nút Tiếp nhận
              SizedBox(
                width: double.infinity,
                height: 48,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                  onPressed: _isSubmittingWalkIn ? null : _submitWalkIn,
                  child: _isSubmittingWalkIn
                      ? const CircularProgressIndicator(color: Colors.white)
                      : const Text("Xác Nhận Tiếp Nhận & In Phiếu", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  // --- TAB 3 LAYOUT: DANH BẠ QUẢN LÝ BỆNH NHÂN ---
  Widget _buildPatientListTab() {
    final filteredPatients = _patientList.where((p) {
      final query = _patientSearchQuery.toLowerCase();
      final name = (p['fullName'] ?? '').toString().toLowerCase();
      final phone = (p['phoneNumber'] ?? '').toString().toLowerCase();
      final email = (p['email'] ?? '').toString().toLowerCase();
      return name.contains(query) || phone.contains(query) || email.contains(query);
    }).toList();

    return Column(
      children: [
        // Thanh tìm kiếm bệnh nhân
        Padding(
          padding: const EdgeInsets.all(12.0),
          child: TextField(
            decoration: InputDecoration(
              hintText: "Tìm bệnh nhân theo tên, SĐT, email...",
              prefixIcon: const Icon(Icons.search, color: Colors.teal),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
            ),
            onChanged: (val) {
              setState(() {
                _patientSearchQuery = val;
              });
            },
          ),
        ),
        Expanded(
          child: _isLoadingPatientList
              ? const Center(child: CircularProgressIndicator())
              : filteredPatients.isEmpty
                  ? const Center(child: Text("Không tìm thấy bệnh nhân nào.", style: TextStyle(color: Colors.grey)))
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 12),
                      itemCount: filteredPatients.length,
                      itemBuilder: (context, index) {
                        final p = filteredPatients[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          child: ListTile(
                            leading: const CircleAvatar(
                              backgroundColor: Colors.teal,
                              child: Icon(Icons.person, color: Colors.white),
                            ),
                            title: Text(p['fullName'] ?? 'Bệnh nhân', style: const TextStyle(fontWeight: FontWeight.bold)),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const SizedBox(height: 4),
                                Text("SĐT: ${p['phoneNumber'] ?? 'Chưa cập nhật'}"),
                                Text("Email: ${p['email'] ?? ''}"),
                                if (p['insuranceCardNumber'] != null && p['insuranceCardNumber'].toString().isNotEmpty)
                                  Text("BHYT: ${p['insuranceCardNumber']}"),
                              ],
                            ),
                            trailing: IconButton(
                              icon: const Icon(Icons.edit_note, color: Colors.teal, size: 28),
                              onPressed: () => _openEditPatientSheet(p),
                            ),
                          ),
                        );
                      },
                    ),
        )
      ],
    );
  }
}
