import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../login_view.dart';

class DoctorHomeView extends StatefulWidget {
  const DoctorHomeView({Key? key}) : super(key: key);

  @override
  State<DoctorHomeView> createState() => _DoctorHomeViewState();
}

class _DoctorHomeViewState extends State<DoctorHomeView> {
  final _apiService = ApiService();
  List<dynamic> _appointments = [];
  bool _isLoading = true;
  String _doctorName = "Bác sĩ";

  // Form controllers cho chẩn đoán
  final _diagnosisController = TextEditingController();
  final _treatmentController = TextEditingController();
  final _prescriptionController = TextEditingController();
  bool _isSubmitting = false;

  // Cấu hình lịch trực rảnh cho bác sĩ (Tab 3)
  DateTime _scheduleDate = DateTime.now();
  final List<String> _allTimeSlots = [
    "08:00 - 09:00",
    "09:00 - 10:00",
    "10:00 - 11:00",
    "11:00 - 12:00",
    "14:00 - 15:00",
    "15:00 - 16:00",
    "16:00 - 17:00"
  ];
  Set<String> _selectedSlots = {};
  bool _isLoadingSchedule = false;
  bool _isSavingSchedule = false;
  List<dynamic> _allMySchedules = [];

  // Hồ sơ Bác sĩ (Tab 4)
  bool _isLoadingProfile = true;
  bool _isSavingProfile = false;
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _emailController = TextEditingController();
  final _specializationController = TextEditingController();
  final _degreeController = TextEditingController();
  final _branchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _loadAppointments();
    _loadMySchedule();
    _loadProfileData();
  }

  Future<void> _loadAppointments() async {
    setState(() => _isLoading = true);
    try {
      final userName = await _apiService.getUserName() ?? "Bác sĩ";
      final appointments = await _apiService.getMyAppointments();
      setState(() {
        _doctorName = userName;
        _appointments = appointments;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadMySchedule() async {
    setState(() => _isLoadingSchedule = true);
    try {
      final schedules = await _apiService.getMySchedule();
      setState(() {
        _allMySchedules = schedules;
        _updateSelectedSlotsForSelectedDate();
        _isLoadingSchedule = false;
      });
    } catch (_) {
      setState(() => _isLoadingSchedule = false);
    }
  }

  void _updateSelectedSlotsForSelectedDate() {
    final targetDateStr = "${_scheduleDate.year}-${_scheduleDate.month.toString().padLeft(2, '0')}-${_scheduleDate.day.toString().padLeft(2, '0')}";
    final slotsForDate = _allMySchedules
        .where((s) => s['availableDate'].toString().startsWith(targetDateStr))
        .map((s) => s['timeSlot'].toString())
        .toSet();
    setState(() {
      _selectedSlots = slotsForDate;
    });
  }

  Future<void> _saveSchedule() async {
    setState(() => _isSavingSchedule = true);
    final targetDateStr = "${_scheduleDate.year}-${_scheduleDate.month.toString().padLeft(2, '0')}-${_scheduleDate.day.toString().padLeft(2, '0')}T00:00:00Z";
    final payload = {
      "availableDate": targetDateStr,
      "timeSlots": _selectedSlots.toList(),
    };

    final result = await _apiService.setSchedule(payload);
    setState(() => _isSavingSchedule = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.green),
      );
      _loadMySchedule();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
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
        _specializationController.text = profile['specialization'] ?? 'Không rõ';
        _degreeController.text = profile['degree'] ?? 'Không rõ';
        _branchController.text = profile['hospitalBranch'] ?? 'Không rõ';
        _isLoadingProfile = false;
      });
    } catch (_) {
      setState(() => _isLoadingProfile = false);
    }
  }

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
    };

    final result = await _apiService.updateProfile(payload);
    setState(() => _isSavingProfile = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Cập nhật thông tin cá nhân thành công!"), backgroundColor: Colors.green),
      );
      _loadAppointments(); // Cập nhật lại tên bác sĩ ở thanh Appbar
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
    }
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

  // Mở Bottom Sheet nhập bệnh án chẩn đoán
  void _openDiagnosisBottomSheet(dynamic app) {
    _diagnosisController.clear();
    _treatmentController.clear();
    _prescriptionController.clear();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(16))),
      builder: (context) {
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
                    Text("Khám Bệnh: ${app['patientName']}", style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.teal)),
                    IconButton(icon: const Icon(Icons.close), onPressed: () => Navigator.pop(context)),
                  ],
                ),
                const Divider(),
                const SizedBox(height: 8),
                Text("Triệu chứng: ${app['symptoms']}", style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                const SizedBox(height: 10),
                const Text("Chỉ số sinh hiệu đo tại quầy tiếp đón:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal)),
                const SizedBox(height: 6),
                Wrap(
                  spacing: 12,
                  runSpacing: 6,
                  children: [
                    _buildVitalBadge("Huyết áp: ${app['bloodPressure'] ?? 'Chưa đo'}"),
                    _buildVitalBadge("Nhiệt độ: ${app['temperature'] ?? 'Chưa đo'}°C"),
                    _buildVitalBadge("Cân nặng: ${app['weight'] ?? 'Chưa đo'} kg"),
                    _buildVitalBadge("Nhịp tim: ${app['heartRate'] ?? 'Chưa đo'} bpm"),
                  ],
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _diagnosisController,
                  decoration: const InputDecoration(labelText: "Chẩn Đoán Bệnh *"),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _treatmentController,
                  decoration: const InputDecoration(labelText: "Hướng Điều Trị *"),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _prescriptionController,
                  maxLines: 3,
                  decoration: const InputDecoration(labelText: "Kê Đơn Thuốc *", hintText: "- Paracetamol 500mg x 10 viên..."),
                ),
                const SizedBox(height: 20),
                SizedBox(
                  width: double.infinity,
                  height: 48,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF0F766E),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    onPressed: _isSubmitting ? null : () => _submitMedicalRecord(app),
                    child: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white)
                        : const Text("Lưu Bệnh Án & Hoàn Thành", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _submitMedicalRecord(dynamic app) async {
    final diagnosis = _diagnosisController.text.trim();
    final treatment = _treatmentController.text.trim();
    final prescription = _prescriptionController.text.trim();

    if (diagnosis.isEmpty || treatment.isEmpty || prescription.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng điền đầy đủ các thông tin chẩn đoán bắt buộc!")),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final recordPayload = {
      "patientId": app['patientId'],
      "appointmentId": app['appointmentId'],
      "diagnosis": diagnosis,
      "treatment": treatment,
      "prescription": prescription,
    };

    final recordRes = await _apiService.createMedicalRecord(recordPayload);

    if (recordRes['success']) {
      final statusPayload = {
        "status": "Completed",
        "bloodPressure": app['bloodPressure'],
        "temperature": app['temperature'],
        "weight": app['weight'],
        "heartRate": app['heartRate']
      };

      await _apiService.updateAppointmentStatus(app['appointmentId'], statusPayload);

      setState(() => _isSubmitting = false);
      if (mounted) {
        Navigator.pop(context);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Đã lưu bệnh án & Hoàn thành ca khám!"), backgroundColor: Colors.green),
        );
        _loadAppointments();
      }
    } else {
      setState(() => _isSubmitting = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(recordRes['message']), backgroundColor: Colors.red),
        );
      }
    }
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
        style: const TextStyle(fontSize: 11, color: Color(0xFF0F766E), fontWeight: FontWeight.bold),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final waitingQueue = _appointments.where((a) => a['status'] == 'CheckedIn' || a['status'] == 'Confirmed').toList();
    final completedQueue = _appointments.where((a) => a['status'] == 'Completed').toList();

    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            "Bác sĩ: $_doctorName", 
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
            isScrollable: true,
            tabs: [
              Tab(icon: Icon(Icons.pending_actions_rounded), text: "Chờ Khám"),
              Tab(icon: Icon(Icons.task_alt_rounded), text: "Đã Khám"),
              Tab(icon: Icon(Icons.calendar_month_rounded), text: "Lịch Trực"),
              Tab(icon: Icon(Icons.person_rounded), text: "Hồ Sơ"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            // Tab 1: Chờ khám
            _isLoading ? const Center(child: CircularProgressIndicator()) : _buildQueueList(waitingQueue, isPending: true),
            // Tab 2: Đã khám xong
            _isLoading ? const Center(child: CircularProgressIndicator()) : _buildQueueList(completedQueue, isPending: false),
            // Tab 3: Cấu hình ca trực rảnh
            _buildScheduleTab(),
            // Tab 4: Hồ sơ cá nhân của Bác sĩ
            _buildProfileTab(),
          ],
        ),
      ),
    );
  }

  Widget _buildQueueList(List<dynamic> queue, {required bool isPending}) {
    if (queue.isEmpty) {
      return Center(
        child: Text(
          isPending ? "Hôm nay chưa có ca khám nào đang đợi." : "Chưa có ca khám nào hoàn thành.",
          style: const TextStyle(color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: queue.length,
      itemBuilder: (context, index) {
        final app = queue[index];
        final isCheckedIn = app['status'] == 'CheckedIn';
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      app['patientName'],
                      style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.5),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        app['timeSlot'],
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF2563EB), fontSize: 12),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text("Triệu chứng: ${app['symptoms']}", style: const TextStyle(fontSize: 13, color: Colors.black87)),
                const SizedBox(height: 12),
                if (isPending) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      isCheckedIn
                          ? const Row(
                              children: [
                                Icon(Icons.check_circle_outline, color: Colors.green, size: 18),
                                SizedBox(width: 4),
                                Text("Đã đo sinh hiệu", style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                              ],
                            )
                          : const Row(
                              children: [
                                Icon(Icons.info_outline_rounded, color: Colors.orange, size: 18),
                                SizedBox(width: 4),
                                Text("Chưa đo sinh hiệu", style: TextStyle(color: Colors.orange, fontSize: 12)),
                              ],
                            ),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(backgroundColor: Colors.teal),
                        onPressed: () => _openDiagnosisBottomSheet(app),
                        child: const Text("Khám Bệnh", style: TextStyle(color: Colors.white)),
                      )
                    ],
                  ),
                ] else ...[
                  const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 18),
                      SizedBox(width: 4),
                      Text("Đã hoàn thành bệnh án", style: TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold)),
                    ],
                  )
                ]
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildScheduleTab() {
    return _isLoadingSchedule
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Cấu Hình Lịch Trực Rảnh", 
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.5),
                    ),
                    const SizedBox(height: 16),
                    ListTile(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade300)),
                      title: Text("Ngày trực: ${_scheduleDate.year}-${_scheduleDate.month.toString().padLeft(2, '0')}-${_scheduleDate.day.toString().padLeft(2, '0')}", style: const TextStyle(fontWeight: FontWeight.bold)),
                      trailing: const Icon(Icons.calendar_month, color: Color(0xFF0F766E)),
                      onTap: () async {
                        final picked = await showDatePicker(
                          context: context,
                          initialDate: _scheduleDate,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 14)),
                        );
                        if (picked != null) {
                          setState(() {
                            _scheduleDate = picked;
                          });
                          _updateSelectedSlotsForSelectedDate();
                        }
                      },
                    ),
                    const Divider(height: 32),
                    const Text("Chọn các khung giờ khám rảnh của bạn:", style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 12),
                    Column(
                      children: _allTimeSlots.map((slot) {
                        final isSelected = _selectedSlots.contains(slot);
                        return CheckboxListTile(
                          activeColor: Colors.teal,
                          title: Text(slot, style: const TextStyle(fontWeight: FontWeight.bold)),
                          value: isSelected,
                          onChanged: (val) {
                            setState(() {
                              if (val == true) {
                                _selectedSlots.add(slot);
                              } else {
                                _selectedSlots.remove(slot);
                              }
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
                        onPressed: _isSavingSchedule ? null : _saveSchedule,
                        child: _isSavingSchedule
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text("Lưu Lịch Trực Rảnh", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    )
                  ],
                ),
              ),
            ),
          );
  }

  Widget _buildProfileTab() {
    return _isLoadingProfile
        ? const Center(child: CircularProgressIndicator())
        : SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      "Hồ Sơ Cá Nhân Bác Sĩ", 
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.5),
                    ),
                    const SizedBox(height: 16),
                    TextField(controller: _fullNameController, decoration: const InputDecoration(labelText: "Họ và Tên *")),
                    const SizedBox(height: 12),
                    TextField(controller: _phoneController, decoration: const InputDecoration(labelText: "Số điện thoại")),
                    const SizedBox(height: 12),
                    TextField(controller: _emailController, decoration: const InputDecoration(labelText: "Email đăng nhập", enabled: false)),
                    const SizedBox(height: 12),
                    TextField(controller: _specializationController, decoration: const InputDecoration(labelText: "Chuyên khoa làm việc", enabled: false)),
                    const SizedBox(height: 12),
                    TextField(controller: _degreeController, decoration: const InputDecoration(labelText: "Học vị / Học hàm", enabled: false)),
                    const SizedBox(height: 12),
                    TextField(controller: _branchController, decoration: const InputDecoration(labelText: "Chi nhánh công tác", enabled: false)),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      height: 48,
                      child: ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0F766E),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _isSavingProfile ? null : _handleSaveProfile,
                        child: _isSavingProfile
                            ? const CircularProgressIndicator(color: Colors.white)
                            : const Text("Lưu Thay Đổi", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
  }
}
