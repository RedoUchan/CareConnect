import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:http/http.dart' as http;
import 'package:latlong2/latlong.dart';
import '../../services/api_service.dart';
import '../../models/record_model.dart';
import '../../models/branch_model.dart';
import '../login_view.dart';
import '../branch_view.dart';
import '../widgets/pulsing_skeleton.dart';
import '../widgets/patient_news_tab.dart';
import '../widgets/patient_ai_chat_tab.dart';

class PatientHomeView extends StatefulWidget {
  const PatientHomeView({Key? key}) : super(key: key);

  @override
  State<PatientHomeView> createState() => _PatientHomeViewState();
}

class _PatientHomeViewState extends State<PatientHomeView> {
  int _currentIndex = 0;
  final _apiService = ApiService();

  // Tab 0: Dashboard Data
  List<RecordModel> _records = [];
  List<dynamic> _appointments = [];
  bool _isLoadingRecords = true;
  String _patientName = "Bệnh nhân";

  // Tab 1: Booking Form State
  List<dynamic> _doctors = [];
  List<BranchModel> _branches = [];
  int? _selectedDoctorId;
  int? _selectedBranchId;
  DateTime _selectedDate = DateTime.now();
  List<String> _availableSlots = [];
  String? _selectedSlot;
  final _symptomsController = TextEditingController();
  String _selectedPaymentMethod = "Cash";
  bool _isBooking = false;
  bool _isLoadingBookingData = true;
  bool _isLoadingSlots = false;

  // Tab 1.5: GPS Branch Finder (Embedded inside Booking for convenience)
  List<BranchModel> _gpsBranches = [];
  bool _isLoadingGpsBranches = true;
  String _gpsStatus = "Đang tìm chi nhánh gần nhất...";
  String _locationMethod = "None";

  // Tab 2: Conversational AI Chatbot
  final List<Map<String, dynamic>> _chatMessages = [
    {
      "sender": "ai",
      "text": "Xin chào! Tôi là Trợ lý Sức khỏe AI CareConnect. Hãy mô tả triệu chứng của bạn để tôi tư vấn chuyên sâu nhé!",
      "suggestedSpecialty": null,
      "quickReplies": <String>["Tôi bị đau đầu", "Tôi bị sốt và ho", "Tư vấn dinh dưỡng"]
    }
  ];
  final List<String> _chatHistory = []; // Định dạng ["User: ...", "AI: ..."]
  final _chatController = TextEditingController();
  bool _isAiTyping = false;
  List<String> _currentQuickReplies = ["Tôi bị đau đầu", "Tôi bị sốt và ho", "Tư vấn dinh dưỡng"];

  // Tab 3: Tin Tức Y Học (News Feed)
  List<dynamic> _newsArticles = [];
  bool _isLoadingNews = true;

  // Tab 4: Hồ Sơ Cá Nhân (Profile Edit)
  bool _isLoadingProfile = true;
  bool _isSavingProfile = false;
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _dobController = TextEditingController();
  final _addressController = TextEditingController();
  final _insuranceController = TextEditingController();
  final _nationalIdController = TextEditingController();
  String _selectedGender = "Nam";
  String _selectedBloodType = "O";

  // Reschedule Dialog State
  DateTime _rescheduleDate = DateTime.now();
  List<String> _rescheduleAvailableSlots = [];
  String? _selectedRescheduleSlot;
  bool _isLoadingRescheduleSlots = false;
  bool _isSavingReschedule = false;

  @override
  void initState() {
    super.initState();
    _loadDashboardData();
    _loadNewsData();
    _loadProfileAndDistanceData();
  }

  Future<void> _loadProfileAndDistanceData() async {
    await _loadProfileData();
    await Future.wait([
      _loadBookingData(),
      _loadGpsBranchesData(),
    ]);
  }

  // --- DATA LOADERS ---
  Future<void> _loadDashboardData() async {
    setState(() => _isLoadingRecords = true);
    try {
      final records = await _apiService.getMedicalRecords();
      final appointments = await _apiService.getMyAppointments();
      final userName = await _apiService.getUserName() ?? "Bệnh nhân";
      setState(() {
        _records = records;
        _appointments = appointments;
        _patientName = userName;
        _isLoadingRecords = false;
      });
    } catch (_) {
      setState(() => _isLoadingRecords = false);
    }
  }

  Future<void> _loadBookingData() async {
    setState(() => _isLoadingBookingData = true);
    try {
      final docs = await _apiService.getDoctors();
      
      // Định vị vị trí bệnh nhân
      final loc = await _getUserLocation();
      LatLng referenceLatLng = loc ?? const LatLng(21.5939, 105.8442); // Mặc định Thái Nguyên nếu hoàn toàn không có định vị
      
      // Truy vấn danh sách bệnh viện/phòng khám thật gần vị trí này từ OSM
      final brs = await _fetchRealNearbyHospitals(referenceLatLng.latitude, referenceLatLng.longitude);
      
      for (var b in brs) {
        double distance = Geolocator.distanceBetween(
          referenceLatLng.latitude,
          referenceLatLng.longitude,
          b.latitude,
          b.longitude,
        );
        b.distanceInKm = distance / 1000.0;
      }
      brs.sort((a, b) => (a.distanceInKm ?? double.maxFinite).compareTo(b.distanceInKm ?? double.maxFinite));

      setState(() {
        _doctors = docs;
        _branches = brs;
        if (brs.isNotEmpty) {
          _selectedBranchId = brs.first.branchId;
        }
        _isLoadingBookingData = false;
      });
    } catch (_) {
      setState(() => _isLoadingBookingData = false);
    }
  }

  Future<void> _loadNewsData() async {
    setState(() => _isLoadingNews = true);
    try {
      final news = await _apiService.getTrendingNews();
      setState(() {
        _newsArticles = news;
        _isLoadingNews = false;
      });
    } catch (_) {
      setState(() => _isLoadingNews = false);
    }
  }

  Future<void> _loadProfileData() async {
    setState(() => _isLoadingProfile = true);
    try {
      final profile = await _apiService.getProfile();
      setState(() {
        _fullNameController.text = profile['fullName'] ?? '';
        _phoneController.text = profile['phoneNumber'] ?? '';
        _emailController.text = profile['email'] ?? '';
        _addressController.text = profile['address'] ?? '';
        _insuranceController.text = profile['insuranceCardNumber'] ?? '';
        _nationalIdController.text = profile['nationalId'] ?? '';
        
        if (profile['dateOfBirth'] != null) {
          _dobController.text = profile['dateOfBirth'].toString().split('T')[0];
        }

        if (profile['gender'] != null) {
          _selectedGender = profile['gender'];
        }
        if (profile['bloodType'] != null) {
          _selectedBloodType = profile['bloodType'];
        }

        _isLoadingProfile = false;
      });
    } catch (_) {
      setState(() => _isLoadingProfile = false);
    }
  }

  // --- ACTIONS ---
  Future<void> _fetchSlots() async {
    if (_selectedDoctorId == null) return;
    setState(() {
      _isLoadingSlots = true;
      _availableSlots = [];
      _selectedSlot = null;
    });

    try {
      final dateStr = "${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}";
      final slots = await _apiService.getAvailableSlots(_selectedDoctorId!, dateStr);
      setState(() {
        _availableSlots = slots;
        _isLoadingSlots = false;
      });
    } catch (_) {
      setState(() => _isLoadingSlots = false);
    }
  }

  Future<void> _handleBook() async {
    if (_selectedDoctorId == null || _selectedSlot == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng chọn bác sĩ và ca khám!")),
      );
      return;
    }

    setState(() => _isBooking = true);
    final dateStr = "${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}T00:00:00Z";
    
    String? selectedBranchName;
    if (_selectedBranchId != null) {
      selectedBranchName = _branches.firstWhere((b) => b.branchId == _selectedBranchId).name;
    }

    final payload = {
      "doctorId": _selectedDoctorId,
      "appointmentDate": dateStr,
      "timeSlot": _selectedSlot,
      "symptoms": _symptomsController.text.trim().isEmpty ? "Khám sức khỏe tổng quát." : _symptomsController.text.trim(),
      "hospitalBranch": selectedBranchName ?? "CareConnect Quận 1",
      "paymentMethod": _selectedPaymentMethod,
      "aiChatHistory": _chatMessages.length > 1 ? jsonEncode(_chatMessages) : null,
    };

    final res = await _apiService.bookAppointment(payload);
    setState(() => _isBooking = false);

    if (res['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Đặt lịch khám thành công!"), backgroundColor: Colors.green),
      );
      _symptomsController.clear();
      setState(() {
        _selectedSlot = null;
      });
      _fetchSlots();
      await _loadDashboardData(); 
      
      // Auto open QR code Check-in & Payment dialog for newly booked appointment
      final bookedApp = res['data'];
      if (bookedApp != null) {
        _openQrCheckInDialog(bookedApp);
      }
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(res['message']), backgroundColor: Colors.red),
      );
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
      _loadDashboardData();
    }
  }

  // Mở Bottom Sheet đổi lịch khám
  void _openRescheduleSheet(dynamic app) {
    _rescheduleDate = DateTime.now();
    _rescheduleAvailableSlots = [];
    _selectedRescheduleSlot = null;
    _isLoadingRescheduleSlots = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            
            Future<void> fetchRescheduleSlots() async {
              setModalState(() {
                _isLoadingRescheduleSlots = true;
                _rescheduleAvailableSlots = [];
                _selectedRescheduleSlot = null;
              });

              try {
                final dateStr = "${_rescheduleDate.year}-${_rescheduleDate.month.toString().padLeft(2, '0')}-${_rescheduleDate.day.toString().padLeft(2, '0')}";
                final slots = await _apiService.getAvailableSlots(app['doctorId'], dateStr);
                setModalState(() {
                  _rescheduleAvailableSlots = slots;
                  _isLoadingRescheduleSlots = false;
                });
              } catch (_) {
                setModalState(() => _isLoadingRescheduleSlots = false);
              }
            }

            Future<void> submitReschedule() async {
              if (_selectedRescheduleSlot == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Vui lòng chọn khung giờ khám mới!")),
                );
                return;
              }

              setModalState(() => _isSavingReschedule = true);
              final dateStr = "${_rescheduleDate.year}-${_rescheduleDate.month.toString().padLeft(2, '0')}-${_rescheduleDate.day.toString().padLeft(2, '0')}T00:00:00Z";
              final reschedulePayload = {
                "appointmentDate": dateStr,
                "timeSlot": _selectedRescheduleSlot
              };

              final res = await _apiService.rescheduleAppointment(app['appointmentId'], reschedulePayload);
              setModalState(() => _isSavingReschedule = false);

              if (res['success']) {
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text("Đổi lịch khám thành công!"), backgroundColor: Colors.green),
                );
                _loadDashboardData();
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
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text("Đổi Lịch Hẹn Khám", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal)),
                      IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                    ],
                  ),
                  const Divider(),
                  Text("Bác sĩ: ${app['doctorName']}", style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  ListTile(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4), side: const BorderSide(color: Colors.grey)),
                    title: Text("Ngày khám mới: ${_rescheduleDate.year}-${_rescheduleDate.month.toString().padLeft(2, '0')}-${_rescheduleDate.day.toString().padLeft(2, '0')}", style: const TextStyle(fontSize: 13)),
                    trailing: const Icon(Icons.calendar_month, color: Colors.teal),
                    onTap: () async {
                      final picked = await showDatePicker(
                        context: context,
                        initialDate: _rescheduleDate,
                        firstDate: DateTime.now(),
                        lastDate: DateTime.now().add(const Duration(days: 14)),
                      );
                      if (picked != null) {
                        setModalState(() {
                          _rescheduleDate = picked;
                        });
                        fetchRescheduleSlots();
                      }
                    },
                  ),
                  const SizedBox(height: 16),
                  const Text("Chọn ca khám rảnh mới:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                  const SizedBox(height: 8),
                  _isLoadingRescheduleSlots
                      ? const Center(child: CircularProgressIndicator())
                      : _rescheduleAvailableSlots.isEmpty
                          ? const Text("Không có lịch trống trong ngày này. Vui lòng chọn ngày khác.", style: TextStyle(color: Colors.orange, fontSize: 12))
                          : Wrap(
                              spacing: 8,
                              children: _rescheduleAvailableSlots.map((slot) {
                                final isSelected = _selectedRescheduleSlot == slot;
                                return ChoiceChip(
                                  label: Text(slot),
                                  selected: isSelected,
                                  selectedColor: Colors.teal,
                                  labelStyle: TextStyle(color: isSelected ? Colors.white : Colors.black),
                                  onSelected: (val) {
                                    setModalState(() {
                                      _selectedRescheduleSlot = val ? slot : null;
                                    });
                                  },
                                );
                              }).toList(),
                            ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 48,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      onPressed: _isSavingReschedule ? null : submitReschedule,
                      child: _isSavingReschedule
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("Xác Nhận Đổi Lịch", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  )
                ],
              ),
            );
          },
        );
      },
    );
  }

  // Mở Dialog hiển thị mã QR Check-in
  void _openQrCheckInDialog(dynamic app) {
    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: Row(
            children: const [
              Icon(Icons.qr_code, color: Colors.teal),
              SizedBox(width: 8),
              Text("Mã QR Check-in", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            ],
          ),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                "Đưa mã này cho Lễ tân tại quầy tiếp đón để Check-in đo sinh hiệu nhanh chóng.",
                style: TextStyle(fontSize: 12, color: Colors.black87),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 20),
              // Tạo QR code bằng API bên thứ ba miễn phí dựa trên ID cuộc hẹn
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  border: Border.all(color: Colors.grey.shade200),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Image.network(
                  "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${app['appointmentId']}",
                  width: 180,
                  height: 180,
                  fit: BoxFit.contain,
                  loadingBuilder: (context, child, progress) {
                    if (progress == null) return child;
                    return const SizedBox(
                      width: 180,
                      height: 180,
                      child: Center(child: CircularProgressIndicator(color: Colors.teal)),
                    );
                  },
                  errorBuilder: (context, error, stackTrace) => Container(
                    width: 180,
                    height: 180,
                    color: Colors.grey.shade100,
                    child: const Center(child: Icon(Icons.broken_image, color: Colors.grey, size: 48)),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                "Mã lịch hẹn: #${app['appointmentId']}",
                style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal, fontSize: 15),
              ),
              const SizedBox(height: 4),
              Text(
                "BS: ${app['doctorName']} - Giờ: ${app['timeSlot']}",
                style: const TextStyle(color: Colors.grey, fontSize: 11),
              ),
              if (app['paymentMethod'] != null && app['paymentMethod'].toString().isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(6),
                  ),
                  child: const Text(
                    "ĐÃ THANH TOÁN ONLINE",
                    style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 10),
                  ),
                ),
              ]
            ],
          ),
          actions: [
            if (!(app['paymentMethod'] != null && app['paymentMethod'].toString().isNotEmpty ||
                  app['paymentTransactionId'] != null && app['paymentTransactionId'].toString().isNotEmpty ||
                  app['status'] == 'CheckedIn' ||
                  app['status'] == 'Completed' ||
                  app['status'] == 'Confirmed'))
              ElevatedButton(
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                onPressed: () {
                  Navigator.pop(context);
                  _openVietQrPaymentDialog(app);
                },
                child: const Text("Thanh toán VietQR", style: TextStyle(color: Colors.white)),
              ),
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text("Đóng"),
            )
          ],
        );
      },
    );
  }

  void _openVietQrPaymentDialog(dynamic app) {
    final appointmentId = app['appointmentId'];
    final bankBin = 'mbb'; // MB Bank
    final accountNo = '19031234567890';
    final template = 'compact';
    final amount = 150000;
    final addInfo = Uri.encodeComponent("CareConnect TT $appointmentId");
    final accountName = Uri.encodeComponent("PHONG KHAM CARECONNECT");
    
    final vietQrUrl = "https://img.vietqr.io/image/$bankBin-$accountNo-$template.png?amount=$amount&addInfo=$addInfo&accountName=$accountName";
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) {
        bool isConfirming = false;
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              title: Row(
                children: const [
                  Icon(Icons.credit_card, color: Colors.green),
                  SizedBox(width: 8),
                  Text("Thanh Toán VietQR", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      "Quét mã QR bằng ứng dụng ngân hàng của bạn để thanh toán phí khám.",
                      style: TextStyle(fontSize: 12, color: Colors.black87),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        border: Border.all(color: Colors.grey.shade200),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Image.network(
                        vietQrUrl,
                        width: 200,
                        height: 280,
                        fit: BoxFit.contain,
                        loadingBuilder: (context, child, progress) {
                          if (progress == null) return child;
                          return const SizedBox(
                            width: 200,
                            height: 280,
                            child: Center(child: CircularProgressIndicator(color: Colors.teal)),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.green.withOpacity(0.05),
                        border: Border.all(color: Colors.green.withOpacity(0.15)),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Ngân hàng: MB Bank", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          const Text("Số TK: 19031234567890", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          const Text("Tên: CONG TY Y TE CARECONNECT", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          const Text("Số tiền: 150.000 đ", style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.red)),
                          Text("Nội dung: CareConnect TT $appointmentId", style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.blue)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: isConfirming ? null : () => Navigator.pop(context),
                  child: const Text("Hủy"),
                ),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                  onPressed: isConfirming
                      ? null
                      : () async {
                          setModalState(() => isConfirming = true);
                          final mockTxId = 'FT${DateTime.now().millisecondsSinceEpoch.toString().substring(3)}';
                          final payload = {
                            "status": "Confirmed",
                            "paymentMethod": "VietQR",
                            "paymentTransactionId": mockTxId,
                          };
                          final success = await _apiService.updateAppointmentStatus(appointmentId, payload);
                          setModalState(() => isConfirming = false);
                          if (success) {
                            if (mounted) {
                              Navigator.pop(context);
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text("Thanh toán thành công! Mã GD: $mockTxId"), backgroundColor: Colors.green),
                              );
                              _loadDashboardData();
                            }
                          } else {
                            if (mounted) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text("Lỗi xác nhận thanh toán. Vui lòng thử lại."), backgroundColor: Colors.red),
                              );
                            }
                          }
                        },
                  child: isConfirming
                      ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text("Tôi đã chuyển khoản", style: TextStyle(color: Colors.white)),
                ),
              ],
            );
          },
        );
      },
    );
  }

  // --- AI CHATBOT SYSTEM ---
  Future<void> _handleSendAiMessage({String? customMessage}) async {
    final text = customMessage ?? _chatController.text.trim();
    if (text.isEmpty) return;

    if (customMessage == null) _chatController.clear();

    setState(() {
      _chatMessages.add({"sender": "user", "text": text});
      _isAiTyping = true;
    });

    _chatHistory.add("User: $text");

    try {
      final aiRes = await _apiService.chatAi(text, _chatHistory);
      final reply = aiRes['response'] ?? "Không có phản hồi.";
      final specialty = aiRes['suggestedSpecialization'];
      final List<dynamic> replies = aiRes['quickReplies'] ?? [];

      _chatHistory.add("AI: $reply");

      setState(() {
        _isAiTyping = false;
        _chatMessages.add({
          "sender": "ai",
          "text": reply,
          "suggestedSpecialty": specialty,
        });
        _currentQuickReplies = replies.cast<String>();
      });
    } catch (_) {
      setState(() {
        _isAiTyping = false;
        _chatMessages.add({
          "sender": "ai",
          "text": "Lỗi kết nối Trợ lý AI CareConnect.",
        });
      });
    }
  }

  // --- SAVE PROFILE ---
  Future<void> _handleSaveProfile() async {
    final name = _fullNameController.text.trim();
    if (name.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Họ tên bắt buộc phải điền!")),
      );
      return;
    }

    setState(() => _isSavingProfile = true);
    
    final payload = {
      "fullName": name,
      "phoneNumber": _phoneController.text.trim(),
      "email": _emailController.text.trim(),
      "address": _addressController.text.trim(),
      "gender": _selectedGender,
      "bloodType": _selectedBloodType,
      "insuranceCardNumber": _insuranceController.text.trim(),
      "nationalId": _nationalIdController.text.trim(),
      "dateOfBirth": _dobController.text.trim().isEmpty ? null : "${_dobController.text.trim()}T00:00:00Z"
    };

    final result = await _apiService.updateProfile(payload);
    setState(() => _isSavingProfile = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Cập nhật hồ sơ cá nhân thành công!"), backgroundColor: Colors.green),
      );
      _loadDashboardData(); // Cập nhật lại tên trên dashboard
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
    }
  }

  // --- GPS ---
  Future<void> _loadGpsBranchesData() async {
    setState(() {
      _isLoadingGpsBranches = true;
      _gpsStatus = "Đang tìm phòng khám/bệnh viện thực tế gần nhất...";
    });

    try {
      final loc = await _getUserLocation();
      LatLng referenceLatLng = loc ?? const LatLng(21.5939, 105.8442); // Mặc định Thái Nguyên nếu hoàn toàn không có định vị

      // Tìm kiếm bệnh viện, phòng khám thật xung quanh vị trí này từ OSM
      final branches = await _fetchRealNearbyHospitals(referenceLatLng.latitude, referenceLatLng.longitude);

      for (var b in branches) {
        double distance = Geolocator.distanceBetween(
          referenceLatLng.latitude,
          referenceLatLng.longitude,
          b.latitude,
          b.longitude,
        );
        b.distanceInKm = distance / 1000.0;
      }
      branches.sort((a, b) => (a.distanceInKm ?? double.maxFinite).compareTo(b.distanceInKm ?? double.maxFinite));
      
      final address = _addressController.text.trim();
      String status;
      if (_locationMethod == "GPS") {
        status = "📍 Vị trí hiện tại (GPS): Cơ sở y tế gần bạn nhất";
      } else if (_locationMethod == "Address" && address.isNotEmpty) {
        status = "🏠 Địa chỉ hồ sơ: Cơ sở y tế gần $address";
      } else {
        status = "⚠️ Cơ sở y tế gần Thái Nguyên (Mặc định):";
      }
      setState(() => _gpsStatus = status);

      setState(() {
        _gpsBranches = branches;
        _isLoadingGpsBranches = false;
      });
    } catch (_) {
      setState(() {
        _isLoadingGpsBranches = false;
        _gpsStatus = "Lỗi kết nối cơ sở y tế.";
      });
    }
  }

  Future<List<BranchModel>> _fetchRealNearbyHospitals(double lat, double lon) async {
    final List<BranchModel> results = [];
    
    // Bounding box khoảng 0.25 độ xung quanh vị trí người dùng (xấp xỉ 25km)
    final double left = lon - 0.25;
    final double right = lon + 0.25;
    final double top = lat + 0.25;
    final double bottom = lat - 0.25;
    
    final queries = ["hospital", "clinic"];
    int idCounter = 1;
    final Set<String> uniqueCoords = {};

    for (var query in queries) {
      try {
        final url = Uri.parse("https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=10&viewbox=$left,$top,$right,$bottom&bounded=1");
        final response = await http.get(
          url,
          headers: {"User-Agent": "CareConnectMobileApp/1.0"},
        ).timeout(const Duration(seconds: 5));
        
        if (response.statusCode == 200) {
          final List<dynamic> data = jsonDecode(response.body);
          for (var item in data) {
            final double? itemLat = double.tryParse(item['lat'].toString());
            final double? itemLon = double.tryParse(item['lon'].toString());
            if (itemLat == null || itemLon == null) continue;
            
            final coordKey = "${itemLat.toStringAsFixed(4)}_${itemLon.toStringAsFixed(4)}";
            if (uniqueCoords.contains(coordKey)) continue;
            uniqueCoords.add(coordKey);
            
            String displayName = item['display_name'] ?? '';
            String name = item['name'] ?? '';
            if (name.isEmpty && displayName.isNotEmpty) {
              name = displayName.split(',')[0];
            }
            if (name.isEmpty) {
              name = query == "hospital" ? "Bệnh viện" : "Phòng khám";
            }
            
            results.add(BranchModel(
              branchId: idCounter++,
              name: name,
              address: displayName,
              latitude: itemLat,
              longitude: itemLon,
            ));
          }
        }
      } catch (_) {}
    }
    
    // Nếu rỗng (ví dụ mất mạng), nạp danh sách dự phòng
    if (results.isEmpty) {
      results.add(BranchModel(
        branchId: 101,
        name: "Bệnh viện Đa khoa Huyện Đại Từ",
        address: "Thị trấn Hùng Sơn, Huyện Đại Từ, Tỉnh Thái Nguyên",
        latitude: 21.6263,
        longitude: 105.6451,
      ));
      results.add(BranchModel(
        branchId: 102,
        name: "Bệnh viện Đa khoa Trung ương Thái Nguyên",
        address: "Số 479 Đường Lương Ngọc Quyến, TP. Thái Nguyên, Tỉnh Thái Nguyên",
        latitude: 21.5932,
        longitude: 105.8427,
      ));
      results.add(BranchModel(
        branchId: 103,
        name: "Trạm y tế Xã Khôi Kỳ",
        address: "Xã Khôi Kỳ, Huyện Đại Từ, Tỉnh Thái Nguyên",
        latitude: 21.6034,
        longitude: 105.6022,
      ));
    }
    
    return results;
  }

  // --- HÀM HỖ TRỢ ĐỊNH VỊ TỌA ĐỘ VÀ GEOCASE FALLBACK ---
  Future<LatLng?> _getUserLocation() async {
    // 1. Thử định vị GPS thời gian thực (realtime)
    try {
      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
      }
      if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
        final position = await Geolocator.getCurrentPosition(
          desiredAccuracy: LocationAccuracy.high,
          timeLimit: const Duration(seconds: 4),
        );
        _locationMethod = "GPS";
        return LatLng(position.latitude, position.longitude);
      }
    } catch (_) {}

    // 2. Dự phòng (Fallback): Geocoding địa chỉ liên hệ của bệnh nhân
    final address = _addressController.text.trim();
    if (address.isNotEmpty) {
      final loc = await _geocodeAddress(address);
      if (loc != null) {
        _locationMethod = "Address";
        return loc;
      }
    }
    _locationMethod = "None";
    return null;
  }

  Future<LatLng?> _geocodeAddress(String address) async {
    final cleanAddress = address.trim();
    if (cleanAddress.isEmpty) return null;

    // Phân rã địa chỉ theo dấu phẩy để tìm kiếm lùi dần từ chi tiết đến khái quát trên OSM
    final parts = cleanAddress.split(RegExp(r'[,;-]'));
    for (int i = 0; i < parts.length; i++) {
      final queryParts = parts.sublist(i).join(', ').trim();
      if (queryParts.isEmpty) continue;
      
      try {
        final url = Uri.parse("https://nominatim.openstreetmap.org/search?q=${Uri.encodeComponent(queryParts)}&format=json&limit=1");
        final response = await http.get(
          url,
          headers: {"User-Agent": "CareConnectMobileApp/1.0"},
        ).timeout(const Duration(seconds: 4));
        
        if (response.statusCode == 200) {
          final List<dynamic> data = jsonDecode(response.body);
          if (data.isNotEmpty) {
            final lat = double.tryParse(data[0]['lat'].toString());
            final lon = double.tryParse(data[0]['lon'].toString());
            if (lat != null && lon != null) {
              return LatLng(lat, lon);
            }
          }
        }
      } catch (_) {}
    }
    
    // Mặc định cho tỉnh Thái Nguyên nếu có từ khóa
    if (cleanAddress.toLowerCase().contains("thái nguyên") || cleanAddress.toLowerCase().contains("thai nguyen")) {
      return const LatLng(21.5939, 105.8442);
    }
    return null;
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

  @override
  Widget build(BuildContext context) {
    final List<Widget> tabs = [
      _buildHomeTab(),
      _buildBookingTab(),
      _buildAiChatTab(),
      _buildNewsTab(),
      _buildProfileTab(),
    ];

    return Scaffold(
      appBar: AppBar(
        title: const Text(
          "CareConnect Patient Portal", 
          style: TextStyle(color: Color(0xFF1E293B), fontWeight: FontWeight.w800, fontSize: 18, letterSpacing: -0.5),
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
      ),
      body: tabs[_currentIndex],
      bottomNavigationBar: Container(
        decoration: const BoxDecoration(
          border: Border(top: BorderSide(color: Color(0xFFE2E8F0), width: 1)),
        ),
        child: BottomNavigationBar(
          currentIndex: _currentIndex,
          backgroundColor: Colors.white,
          elevation: 0,
          selectedItemColor: const Color(0xFF0F766E),
          unselectedItemColor: const Color(0xFF94A3B8),
          type: BottomNavigationBarType.fixed,
          onTap: (index) {
            setState(() => _currentIndex = index);
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.home_rounded), label: "Trang chủ"),
            BottomNavigationBarItem(icon: Icon(Icons.calendar_month_rounded), label: "Đặt lịch"),
            BottomNavigationBarItem(icon: Icon(Icons.forum_rounded), label: "Trợ lý AI"),
            BottomNavigationBarItem(icon: Icon(Icons.newspaper_rounded), label: "Tin tức"),
            BottomNavigationBarItem(icon: Icon(Icons.person_rounded), label: "Hồ sơ"),
          ],
        ),
      ),
    );
  }

  // --- MÀN HÌNH TRANG CHỦ MỚI (TAB 0) ---
  Widget _buildHomeTab() {
    final upcomingAppointments = _appointments.where((a) => a['status'] == 'Pending' || a['status'] == 'Confirmed' || a['status'] == 'CheckedIn').toList();

    return _isLoadingRecords
        ? ListView(
            padding: const EdgeInsets.all(16.0),
            children: const [
              SkeletonCard(),
              SkeletonCard(),
              SkeletonCard(),
            ],
          )
        : RefreshIndicator(
            onRefresh: _loadDashboardData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // 1. Banner chào mừng
                  Card(
                    child: Padding(
                      padding: const EdgeInsets.all(18.0),
                      child: Row(
                        children: [
                          const CircleAvatar(
                            radius: 28,
                            backgroundColor: Color(0xFFE6F4F1),
                            child: Icon(Icons.person_rounded, size: 30, color: Color(0xFF0F766E)),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text("Chào mừng trở lại,", style: TextStyle(fontSize: 13, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                                const SizedBox(height: 2),
                                Text(
                                  _patientName,
                                  style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF0F766E), letterSpacing: -0.5),
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ],
                            ),
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 20),

                  // 2. Phím tắt dịch vụ nhanh
                  const Text(
                    "Dịch vụ nhanh",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.3),
                  ),
                  const SizedBox(height: 12),
                  GridView.count(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisCount: 4,
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 0.9,
                    children: [
                      _buildQuickActionItem(
                        icon: Icons.calendar_month_rounded,
                        label: "Đặt lịch",
                        color: const Color(0xFF0F766E),
                        onTap: () => setState(() => _currentIndex = 1),
                      ),
                      _buildQuickActionItem(
                        icon: Icons.forum_rounded,
                        label: "Trợ lý AI",
                        color: const Color(0xFF2563EB),
                        onTap: () => setState(() => _currentIndex = 2),
                      ),
                      _buildQuickActionItem(
                        icon: Icons.map_rounded,
                        label: "Chi nhánh",
                        color: const Color(0xFFD97706),
                        onTap: () => Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => BranchView()),
                        ),
                      ),
                      _buildQuickActionItem(
                        icon: Icons.newspaper_rounded,
                        label: "Tin tức",
                        color: const Color(0xFF7C3AED),
                        onTap: () => setState(() => _currentIndex = 3),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // 3. Lịch hẹn sắp tới
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Lịch hẹn sắp tới",
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.3),
                      ),
                      if (upcomingAppointments.isNotEmpty)
                        TextButton(
                          onPressed: _showAllAppointmentsBottomSheet,
                          child: const Text("Xem tất cả", style: TextStyle(color: Color(0xFF0F766E), fontWeight: FontWeight.bold, fontSize: 13)),
                        ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  if (upcomingAppointments.isEmpty)
                    Card(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
                        child: Column(
                          children: [
                            Icon(Icons.calendar_today_rounded, size: 36, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            const Text(
                              "Bạn chưa có lịch hẹn nào sắp tới.",
                              style: TextStyle(color: Color(0xFF64748B), fontSize: 13),
                            ),
                            const SizedBox(height: 12),
                            ElevatedButton(
                              onPressed: () => setState(() => _currentIndex = 1),
                              child: const Text("Đặt lịch ngay"),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ...upcomingAppointments.take(1).map((app) {
                      return Card(
                        child: InkWell(
                          onTap: () => _openQrCheckInDialog(app),
                          borderRadius: BorderRadius.circular(12),
                          child: Padding(
                            padding: const EdgeInsets.all(16.0),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    const Icon(Icons.circle, size: 10, color: Color(0xFF0D9488)),
                                    const SizedBox(width: 8),
                                    Text(
                                      app['timeSlot'],
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0D9488), fontSize: 13),
                                    ),
                                    const Spacer(),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: const Color(0xFFFEF3C7),
                                        borderRadius: BorderRadius.circular(6),
                                      ),
                                      child: Text(
                                        app['status'] == 'Confirmed' ? 'Đã xác nhận' : (app['status'] == 'CheckedIn' ? 'Đã tiếp đón' : 'Đang chờ'),
                                        style: const TextStyle(color: Color(0xFFD97706), fontWeight: FontWeight.bold, fontSize: 11),
                                      ),
                                    ),
                                  ],
                                ),
                                const Divider(height: 20),
                                Text("Bác sĩ: ${app['doctorName']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                const SizedBox(height: 6),
                                Text("Phòng khám: ${app['hospitalBranch']}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                              ],
                            ),
                          ),
                        ),
                      );
                    }),
                  const SizedBox(height: 24),

                  // 4. Chỉ số sinh hiệu gần nhất
                  const Text(
                    "Chỉ số sinh hiệu gần nhất",
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.3),
                  ),
                  const SizedBox(height: 12),
                  if (_records.isEmpty)
                    Card(
                      child: Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(20),
                        child: const Center(
                          child: Text("Chưa có chỉ số đo sức khỏe nào.", style: TextStyle(color: Color(0xFF64748B), fontSize: 13)),
                        ),
                      ),
                    )
                  else ...[
                    _buildLatestVitalsGrid(_records.first),
                  ],
                  const SizedBox(height: 24),

                  // 5. Lối vào lịch sử bệnh án
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: OutlinedButton.icon(
                      icon: const Icon(Icons.history_rounded, size: 20),
                      label: Text("Xem lịch sử bệnh án đầy đủ (${_records.length} hồ sơ)"),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Color(0xFFE2E8F0)),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        foregroundColor: const Color(0xFF0F766E),
                      ),
                      onPressed: _showMedicalHistoryBottomSheet,
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          );
  }

  Widget _buildQuickActionItem({
    required IconData icon,
    required String label,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                color: color.withOpacity(0.08),
                shape: BoxShape.circle,
              ),
              child: Icon(icon, color: color, size: 24),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLatestVitalsGrid(RecordModel latest) {
    final temp = latest.temperature;
    final bp = latest.bloodPressure;
    final weight = latest.weight;
    final hr = latest.heartRate;

    return GridView.count(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      crossAxisCount: 2,
      crossAxisSpacing: 10,
      mainAxisSpacing: 10,
      childAspectRatio: 2.2,
      children: [
        _buildVitalGridCard("Huyết áp", bp != null ? "$bp mmHg" : "--", Icons.favorite_rounded, Colors.red),
        _buildVitalGridCard("Nhịp tim", hr != null ? "$hr bpm" : "--", Icons.monitor_heart_rounded, Colors.pink),
        _buildVitalGridCard("Nhiệt độ", temp != null ? "$temp °C" : "--", Icons.thermostat_rounded, Colors.orange),
        _buildVitalGridCard("Cân nặng", weight != null ? "$weight kg" : "--", Icons.scale_rounded, Colors.blue),
      ],
    );
  }

  Widget _buildVitalGridCard(String label, String value, IconData icon, Color color) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      padding: const EdgeInsets.all(10),
      child: Row(
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: color.withOpacity(0.08),
              shape: BoxShape.circle,
            ),
            child: Icon(icon, color: color, size: 18),
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w500)),
                const SizedBox(height: 2),
                Text(
                  value, 
                  style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                  overflow: TextOverflow.ellipsis,
                ),
              ],
            ),
          )
        ],
      ),
    );
  }

  // --- MỞ LỊCH SỬ BỆNH ÁN DƯỚI DẠNG BOTTOM SHEET ---
  void _showMedicalHistoryBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Lịch Sử Bệnh Án Chi Tiết",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: _records.isEmpty
                      ? const Center(child: Text("Bạn chưa có hồ sơ bệnh án nào.", style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _records.length,
                          itemBuilder: (context, index) {
                            final record = _records[index];
                            return Card(
                              margin: const EdgeInsets.only(bottom: 12.0),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            "Bác sĩ: ${record.doctorName}",
                                            style: const TextStyle(fontWeight: FontWeight.bold),
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                          ),
                                        ),
                                        const SizedBox(width: 8),
                                        Text(
                                          record.recordDate.split('T')[0],
                                          style: const TextStyle(color: Colors.grey, fontSize: 12),
                                        ),
                                      ],
                                    ),
                                    const Divider(height: 20),
                                    if (record.bloodPressure != null || record.temperature != null || record.weight != null || record.heartRate != null) ...[
                                      Wrap(
                                        spacing: 8,
                                        runSpacing: 4,
                                        children: [
                                          if (record.bloodPressure != null) _buildVitalBadge("HA: ${record.bloodPressure} mmHg"),
                                          if (record.temperature != null) _buildVitalBadge("T: ${record.temperature}°C"),
                                          if (record.weight != null) _buildVitalBadge("CN: ${record.weight} kg"),
                                          if (record.heartRate != null) _buildVitalBadge("NT: ${record.heartRate} bpm"),
                                        ],
                                      ),
                                      const SizedBox(height: 10),
                                    ],
                                    const Text("Chẩn đoán:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    Text(record.diagnosis, style: const TextStyle(fontSize: 14)),
                                    const SizedBox(height: 8),
                                    const Text("Đơn thuốc:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                                    Text(record.prescription, style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
                                    if (record.prescription.isNotEmpty && record.prescriptionFee > 0) ...[
                                      const SizedBox(height: 12),
                                      Container(
                                        padding: const EdgeInsets.all(12),
                                        decoration: BoxDecoration(
                                          color: record.billingStatus == 'Paid'
                                              ? const Color(0xFFE6F4EA)
                                              : const Color(0xFFFCE8E6),
                                          borderRadius: BorderRadius.circular(8),
                                          border: Border.all(
                                            color: record.billingStatus == 'Paid'
                                                ? Colors.green.shade300
                                                : Colors.red.shade300,
                                          ),
                                        ),
                                        child: Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          children: [
                                            Expanded(
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  const Text(
                                                    "Viện phí đơn thuốc:",
                                                    style: TextStyle(
                                                      fontSize: 11,
                                                      fontWeight: FontWeight.bold,
                                                      color: Colors.black54,
                                                    ),
                                                  ),
                                                  const SizedBox(height: 2),
                                                  Text(
                                                    "${record.prescriptionFee.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} đ",
                                                    style: TextStyle(
                                                      fontSize: 14,
                                                      fontWeight: FontWeight.bold,
                                                      color: record.billingStatus == 'Paid'
                                                          ? Colors.green.shade800
                                                          : Colors.red.shade800,
                                                    ),
                                                  ),
                                                ],
                                              ),
                                            ),
                                            record.billingStatus == 'Paid'
                                                ? const Row(
                                                    children: [
                                                      Icon(Icons.check_circle, color: Colors.green, size: 16),
                                                      SizedBox(width: 4),
                                                      Text(
                                                        "Đã thanh toán",
                                                        style: TextStyle(
                                                          color: Colors.green,
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 12,
                                                        ),
                                                      ),
                                                    ],
                                                  )
                                                : ElevatedButton.icon(
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: Colors.red,
                                                      foregroundColor: Colors.white,
                                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                      minimumSize: Size.zero,
                                                      tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                                      shape: RoundedRectangleBorder(
                                                        borderRadius: BorderRadius.circular(6),
                                                      ),
                                                    ),
                                                    onPressed: () {
                                                      _showPrescriptionPaymentDialog(record);
                                                    },
                                                    icon: const Icon(Icons.qr_code, size: 14),
                                                    label: const Text(
                                                      "Thanh toán VietQR",
                                                      style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                                    ),
                                                  ),
                                          ],
                                        ),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  void _showAllAppointmentsBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        return DraggableScrollableSheet(
          initialChildSize: 0.85,
          minChildSize: 0.5,
          maxChildSize: 0.95,
          expand: false,
          builder: (context, scrollController) {
            return Column(
              children: [
                Container(
                  margin: const EdgeInsets.symmetric(vertical: 12),
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        "Tất Cả Lịch Hẹn Khám",
                        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Color(0xFF1E293B)),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close_rounded),
                        onPressed: () => Navigator.pop(context),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),
                Expanded(
                  child: _appointments.isEmpty
                      ? const Center(child: Text("Bạn chưa có lịch hẹn khám nào.", style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          controller: scrollController,
                          padding: const EdgeInsets.all(16),
                          itemCount: _appointments.length,
                          itemBuilder: (context, index) {
                            final app = _appointments[index];
                            final status = app['status'];
                            
                            // Map status text & color
                            String statusText = status;
                            Color statusColor = Colors.grey;
                            if (status == 'Pending') {
                              statusText = 'Chờ xác nhận';
                              statusColor = Colors.orange;
                            } else if (status == 'Confirmed') {
                              statusText = 'Đã xác nhận';
                              statusColor = Colors.blue;
                            } else if (status == 'CheckedIn') {
                              statusText = 'Đã tiếp đón';
                              statusColor = Colors.green;
                            } else if (status == 'Completed') {
                              statusText = 'Hoàn thành';
                              statusColor = Colors.teal;
                            } else if (status == 'Cancelled') {
                              statusText = 'Đã hủy';
                              statusColor = Colors.red;
                            }

                            final isUpcoming = status == 'Pending' || status == 'Confirmed' || status == 'CheckedIn';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12.0),
                              child: Padding(
                                padding: const EdgeInsets.all(16.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      children: [
                                        const Icon(Icons.calendar_today_rounded, size: 16, color: Color(0xFF0F766E)),
                                        const SizedBox(width: 8),
                                        Text(
                                          app['timeSlot'],
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                        ),
                                        const Spacer(),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: statusColor.withOpacity(0.1),
                                            borderRadius: BorderRadius.circular(6),
                                          ),
                                          child: Text(
                                            statusText,
                                            style: TextStyle(color: statusColor, fontWeight: FontWeight.bold, fontSize: 11),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const Divider(height: 20),
                                    Text("Bác sĩ: ${app['doctorName']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                    const SizedBox(height: 4),
                                    Text("Ngày khám: ${app['appointmentDate'].toString().split('T')[0]}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                    const SizedBox(height: 4),
                                    Text("Phòng khám: ${app['hospitalBranch'] ?? 'Chưa cập nhật'}", style: const TextStyle(color: Colors.grey, fontSize: 12)),
                                    if (app['symptoms'] != null && app['symptoms'].toString().isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Text("Triệu chứng: ${app['symptoms']}", style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
                                    ],
                                    if (isUpcoming) ...[
                                      const Divider(height: 20),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          OutlinedButton.icon(
                                            icon: const Icon(Icons.qr_code, size: 16),
                                            label: const Text("Mã QR / Thanh toán", style: TextStyle(fontSize: 11)),
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                              foregroundColor: Colors.teal,
                                              side: const BorderSide(color: Colors.teal),
                                            ),
                                            onPressed: () {
                                              Navigator.pop(context);
                                              _openQrCheckInDialog(app);
                                            },
                                          ),
                                          const SizedBox(width: 8),
                                          OutlinedButton(
                                            child: const Text("Đổi lịch", style: TextStyle(fontSize: 11)),
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                              foregroundColor: Colors.blue,
                                              side: const BorderSide(color: Colors.blue),
                                            ),
                                            onPressed: () {
                                              Navigator.pop(context);
                                              _openRescheduleSheet(app);
                                            },
                                          ),
                                          const SizedBox(width: 8),
                                          OutlinedButton(
                                            child: const Text("Hủy", style: TextStyle(fontSize: 11)),
                                            style: OutlinedButton.styleFrom(
                                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                              foregroundColor: Colors.red,
                                              side: const BorderSide(color: Colors.red),
                                            ),
                                            onPressed: () {
                                              Navigator.pop(context);
                                              _cancelAppointment(app);
                                            },
                                          ),
                                        ],
                                      )
                                    ]
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildVitalBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFE6F4F1),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: const Color(0xFF0D9488).withOpacity(0.1)),
      ),
      child: Text(
        label,
        style: const TextStyle(fontSize: 11, color: Color(0xFF0F766E), fontWeight: FontWeight.w700),
      ),
    );
  }

  // --- TAB 1 LAYOUT: BOOKING FORM ---
  Widget _buildBookingTab() {
    return _isLoadingBookingData
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                Card(
                  elevation: 3,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text("Đặt Lịch Hẹn Khám", style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal)),
                        const SizedBox(height: 20),
                        DropdownButtonFormField<int>(
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: "Chọn Bệnh Viện / Phòng Khám Gần Nhất", border: OutlineInputBorder()),
                          value: _selectedBranchId,
                          items: _branches.map((b) {
                            final distStr = b.distanceInKm != null ? " (${b.distanceInKm!.toStringAsFixed(1)} km)" : "";
                            return DropdownMenuItem<int>(
                              value: b.branchId,
                              child: Text(
                                "${b.name}$distStr",
                                overflow: TextOverflow.ellipsis,
                              ),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() => _selectedBranchId = val);
                          },
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<int>(
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: "Chọn Bác Sĩ", border: OutlineInputBorder()),
                          value: _selectedDoctorId,
                          items: _doctors.map((d) {
                            return DropdownMenuItem<int>(
                              value: d['userId'],
                              child: Text("${d['fullName']} (${d['specialization']})"),
                            );
                          }).toList(),
                          onChanged: (val) {
                            setState(() {
                              _selectedDoctorId = val;
                            });
                            _fetchSlots();
                          },
                        ),
                        const SizedBox(height: 16),
                        ListTile(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4), side: const BorderSide(color: Colors.grey)),
                          title: Text("Ngày khám: ${_selectedDate.year}-${_selectedDate.month.toString().padLeft(2, '0')}-${_selectedDate.day.toString().padLeft(2, '0')}"),
                          trailing: const Icon(Icons.calendar_month, color: Colors.teal),
                          onTap: () async {
                            final picked = await showDatePicker(
                              context: context,
                              initialDate: _selectedDate,
                              firstDate: DateTime.now(),
                              lastDate: DateTime.now().add(const Duration(days: 14)),
                            );
                            if (picked != null) {
                              setState(() => _selectedDate = picked);
                              _fetchSlots();
                            }
                          },
                        ),
                        const SizedBox(height: 16),
                        const Text("Khung giờ còn trống:", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey)),
                        const SizedBox(height: 8),
                        _isLoadingSlots
                            ? const Center(child: CircularProgressIndicator())
                            : _availableSlots.isEmpty
                                ? const Padding(
                                    padding: EdgeInsets.symmetric(vertical: 10),
                                    child: Text("Bác sĩ không có lịch trực hoặc đã đầy vào ngày này.", style: TextStyle(color: Colors.orange, fontSize: 12)),
                                  )
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
                        TextField(
                          controller: _symptomsController,
                          maxLines: 2,
                          decoration: const InputDecoration(
                            labelText: "Mô tả triệu chứng (Lâm sàng)",
                            border: OutlineInputBorder(),
                            hintText: "Ví dụ: Đau đầu, sốt nhẹ...",
                          ),
                        ),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          isExpanded: true,
                          decoration: const InputDecoration(labelText: "Phương thức thanh toán", border: OutlineInputBorder()),
                          value: _selectedPaymentMethod,
                          items: const [
                            DropdownMenuItem(value: "Cash", child: Text("Thanh toán tiền mặt tại quầy")),
                            DropdownMenuItem(value: "VNPay", child: Text("Cổng thanh toán VNPay (Ví điện tử)")),
                            DropdownMenuItem(value: "CreditCard", child: Text("Thẻ tín dụng / Thẻ quốc tế")),
                          ],
                          onChanged: (val) {
                            setState(() => _selectedPaymentMethod = val ?? "Cash");
                          },
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          height: 48,
                          child: ElevatedButton(
                            style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                            onPressed: _isBooking ? null : _handleBook,
                            child: _isBooking
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text("Xác Nhận Đặt Lịch", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Card(
                  elevation: 2,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            const Icon(Icons.gps_fixed, color: Colors.teal),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_gpsStatus, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.teal))),
                          ],
                        ),
                        const SizedBox(height: 12),
                        _isLoadingGpsBranches
                            ? const Column(
                                children: [
                                  SkeletonListTile(),
                                  SkeletonListTile(),
                                ],
                              )
                            : ListView.builder(
                                shrinkWrap: true,
                                physics: const NeverScrollableScrollPhysics(),
                                itemCount: _gpsBranches.take(2).length,
                                itemBuilder: (context, index) {
                                  final b = _gpsBranches[index];
                                  return ListTile(
                                    contentPadding: EdgeInsets.zero,
                                    title: Text(
                                      b.name,
                                      style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    subtitle: Text(
                                      b.address,
                                      style: const TextStyle(fontSize: 11, color: Colors.grey),
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                    ),
                                    trailing: b.distanceInKm != null
                                        ? Text("${b.distanceInKm!.toStringAsFixed(1)} km", style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12))
                                        : null,
                                  );
                                },
                              )
                      ],
                    ),
                  ),
                )
              ],
            ),
          );
  }

  // --- TAB 2 LAYOUT: CONVERSATIONAL AI CHATBOT ---
  Widget _buildAiChatTab() {
    return PatientAiChatTab(
      chatMessages: _chatMessages,
      isAiTyping: _isAiTyping,
      currentQuickReplies: _currentQuickReplies,
      chatController: _chatController,
      onSendAiMessage: _handleSendAiMessage,
      onGoToBookingTab: () {
        setState(() {
          _currentIndex = 1;
        });
      },
    );
  }

  // --- TAB 3 LAYOUT: MEDICAL NEWS FEED ---
  Widget _buildNewsTab() {
    return PatientNewsTab(
      isLoadingNews: _isLoadingNews,
      newsArticles: _newsArticles,
      onRefreshNews: _loadNewsData,
    );
  }

  // --- TAB 4 LAYOUT: PROFILE MANAGEMENT ---
  Widget _buildProfileTab() {
    return _isLoadingProfile
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text("Hồ Sơ Y Tế Cá Nhân", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal)),
                    const SizedBox(height: 16),
                    TextField(controller: _fullNameController, decoration: const InputDecoration(labelText: "Họ và Tên *", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _phoneController, decoration: const InputDecoration(labelText: "Số điện thoại", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _emailController, decoration: const InputDecoration(labelText: "Email đăng ký (Tên đăng nhập)", border: OutlineInputBorder(), enabled: false)),
                    const SizedBox(height: 12),
                    TextField(controller: _dobController, decoration: const InputDecoration(labelText: "Ngày sinh (YYYY-MM-DD)", border: OutlineInputBorder(), suffixIcon: Icon(Icons.calendar_today))),
                    const SizedBox(height: 12),
                    TextField(controller: _addressController, decoration: const InputDecoration(labelText: "Địa chỉ liên hệ", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "Giới tính", border: OutlineInputBorder()),
                      value: _selectedGender,
                      items: const [
                        DropdownMenuItem(value: "Nam", child: Text("Nam")),
                        DropdownMenuItem(value: "Nữ", child: Text("Nữ")),
                        DropdownMenuItem(value: "Khác", child: Text("Khác")),
                      ],
                      onChanged: (val) {
                        setState(() => _selectedGender = val ?? "Nam");
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "Nhóm máu", border: OutlineInputBorder()),
                      value: _selectedBloodType,
                      items: const ["A", "B", "O", "AB"].map((type) {
                        return DropdownMenuItem(value: type, child: Text(type));
                      }).toList(),
                      onChanged: (val) {
                        setState(() => _selectedBloodType = val ?? "O");
                      },
                    ),
                    const SizedBox(height: 12),
                    TextField(controller: _insuranceController, decoration: const InputDecoration(labelText: "Mã thẻ Bảo hiểm Y tế", border: OutlineInputBorder())),
                    const SizedBox(height: 12),
                    TextField(controller: _nationalIdController, decoration: const InputDecoration(labelText: "Số CCCD / Hộ chiếu", border: OutlineInputBorder())),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.teal, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                        onPressed: _isSavingProfile ? null : _handleSaveProfile,
                        child: _isSavingProfile
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text("Lưu Thay Đổi Hồ Sơ", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
  }

  void _showPrescriptionPaymentDialog(RecordModel record) {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        bool isPaying = false;
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              titlePadding: const EdgeInsets.all(16),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              actionsPadding: const EdgeInsets.all(12),
              title: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.payment_rounded, color: Colors.green),
                      SizedBox(width: 8),
                      Text(
                        "Thanh Toán VietQR",
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      "Mở app ngân hàng quét mã chuyển khoản để thanh toán tiền thuốc",
                      textAlign: TextAlign.center,
                      style: TextStyle(fontSize: 13, color: Colors.black54),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: Colors.grey.shade300),
                      ),
                      child: Image.network(
                        "https://img.vietqr.io/image/mbb-19031234567890-compact.png?amount=${record.prescriptionFee.toInt()}&addInfo=CareConnect%20DT%20${record.medicalRecordId}&accountName=PHONG%20KHAM%20CARECONNECT",
                        width: 200,
                        height: 280,
                        fit: BoxFit.contain,
                        errorBuilder: (context, error, stackTrace) {
                          return const SizedBox(
                            width: 200,
                            height: 280,
                            child: Center(
                              child: Column(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(Icons.error_outline, color: Colors.red, size: 36),
                                  SizedBox(height: 8),
                                  Text("Không thể tải mã QR", style: TextStyle(fontSize: 12)),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(height: 14),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text("Số tài khoản: 19031234567890 (MB Bank)", style: TextStyle(fontSize: 12)),
                          const Text("Chủ tài khoản: CONG TY Y TE CARECONNECT", style: TextStyle(fontSize: 12)),
                          Text(
                            "Số tiền: ${record.prescriptionFee.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]}.')} đ",
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.red),
                          ),
                          Text(
                            "Nội dung chuyển khoản: CareConnect DT ${record.medicalRecordId}",
                            style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.blue),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 12),
                  ],
                ),
              ),
              actions: [
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton(
                        style: OutlinedButton.styleFrom(
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isPaying ? null : () => Navigator.of(context).pop(),
                        child: const Text("Quay lại"),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Expanded(
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.green,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        onPressed: isPaying
                            ? null
                            : () async {
                                setDialogState(() => isPaying = true);
                                try {
                                  final res = await _apiService.payPrescription(record.medicalRecordId);
                                  if (res['success'] == true) {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text("Thanh toán thành công đơn thuốc BA-${record.medicalRecordId}!"),
                                          backgroundColor: Colors.green,
                                        ),
                                      );
                                    }
                                    Navigator.of(context).pop();
                                    _loadDashboardData(); // Refresh patient lists
                                  } else {
                                    if (mounted) {
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        SnackBar(
                                          content: Text(res['message'] ?? "Thanh toán thất bại."),
                                          backgroundColor: Colors.red,
                                        ),
                                      );
                                    }
                                  }
                                } catch (e) {
                                  if (mounted) {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text("Lỗi kết nối máy chủ."),
                                        backgroundColor: Colors.red,
                                      ),
                                    );
                                  }
                                } finally {
                                  setDialogState(() => isPaying = false);
                                }
                              },
                        child: isPaying
                            ? const SizedBox(
                                width: 18,
                                height: 18,
                                child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                              )
                            : const Text("Tôi đã chuyển", style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ],
            );
          },
        );
      },
    );
  }
}

