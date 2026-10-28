import 'package:flutter/material.dart';
import '../../services/api_service.dart';
import '../../models/branch_model.dart';
import '../../models/record_model.dart';
import '../login_view.dart';

class AdminHomeView extends StatefulWidget {
  const AdminHomeView({Key? key}) : super(key: key);

  @override
  State<AdminHomeView> createState() => _AdminHomeViewState();
}

class _AdminHomeViewState extends State<AdminHomeView> {
  final _apiService = ApiService();
  
  // Tổng quan & Thống kê
  bool _isLoadingStats = true;
  int _totalAppointments = 0;
  int _totalPatients = 0;
  int _totalDoctors = 0;
  String _adminName = "Admin";
  Map<String, dynamic> _overviewData = {};

  // Form nhân viên mới
  final _fullNameController = TextEditingController();
  final _emailController = TextEditingController();
  final _phoneController = TextEditingController();
  final _passwordController = TextEditingController();
  String _selectedRole = "Doctor";
  String? _selectedBranch;
  String _selectedSpecialization = "Nội khoa tổng quát";
  String _selectedDegree = "Thạc sĩ";
  bool _isCreatingEmployee = false;

  List<BranchModel> _branches = [];

  final List<String> _specializations = [
    "Nội khoa tổng quát", "Nhi khoa", "Tim mạch", "Da liễu", "Mắt", 
    "Răng hàm mặt", "Sản phụ khoa", "Tai mũi họng", "Xương khớp", 
    "Tiêu hóa", "Thần kinh", "Ung bướu"
  ];

  final List<String> _degrees = [
    "Bác sĩ chuyên khoa I", "Bác sĩ chuyên khoa II", "Thạc sĩ", "Tiến sĩ", "PGS.TS"
  ];

  // Quản lý Người dùng (Nhân viên / Bệnh nhân)
  String _userManagementTab = "Staff"; // "Staff" hoặc "Patient"
  List<dynamic> _staffList = [];
  List<dynamic> _patientList = [];
  bool _isLoadingStaff = false;
  bool _isLoadingPatients = false;
  String _searchQuery = "";

  // Duyệt lịch khám
  List<dynamic> _appointmentsList = [];
  bool _isLoadingAppointments = false;
  String _appointmentFilterStatus = "All"; // "All", "Pending", "Confirmed", "CheckedIn", "Completed", "Cancelled"

  // Quản lý bệnh án
  List<RecordModel> _medicalRecordsList = [];
  bool _isLoadingRecords = false;
  String _recordsSearchQuery = "";

  // Trạng thái reset db
  bool _isResettingDb = false;

  @override
  void initState() {
    super.initState();
    _loadStats();
    _loadStaffList();
    _loadPatientList();
    _loadAppointmentsList();
    _loadMedicalRecordsList();
  }

  Future<void> _loadStats() async {
    setState(() => _isLoadingStats = true);
    try {
      final name = await _apiService.getUserName() ?? "Quản trị viên";
      final overview = await _apiService.getAdminOverview();
      final brs = await _apiService.getBranches();
      
      setState(() {
        _adminName = name;
        _overviewData = overview;
        _branches = brs;

        final s = overview['summary'] ?? {};
        _totalAppointments = s['totalAppointments'] ?? 0;
        _totalPatients = s['totalPatients'] ?? 0;
        _totalDoctors = s['totalDoctors'] ?? 0;

        if (brs.isNotEmpty && _selectedBranch == null) {
          _selectedBranch = brs[0].name;
        }
        _isLoadingStats = false;
      });
    } catch (_) {
      setState(() => _isLoadingStats = false);
    }
  }

  Future<void> _loadStaffList() async {
    setState(() => _isLoadingStaff = true);
    try {
      final staff = await _apiService.getStaff();
      setState(() {
        _staffList = staff;
        _isLoadingStaff = false;
      });
    } catch (_) {
      setState(() => _isLoadingStaff = false);
    }
  }

  Future<void> _loadPatientList() async {
    setState(() => _isLoadingPatients = true);
    try {
      final patients = await _apiService.getPatients();
      setState(() {
        _patientList = patients;
        _isLoadingPatients = false;
      });
    } catch (_) {
      setState(() => _isLoadingPatients = false);
    }
  }

  Future<void> _loadAppointmentsList() async {
    setState(() => _isLoadingAppointments = true);
    try {
      final apps = await _apiService.getMyAppointments();
      setState(() {
        _appointmentsList = apps;
        _isLoadingAppointments = false;
      });
    } catch (_) {
      setState(() => _isLoadingAppointments = false);
    }
  }

  Future<void> _loadMedicalRecordsList() async {
    setState(() => _isLoadingRecords = true);
    try {
      final records = await _apiService.getMedicalRecords();
      setState(() {
        _medicalRecordsList = records;
        _isLoadingRecords = false;
      });
    } catch (_) {
      setState(() => _isLoadingRecords = false);
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

  Future<void> _createEmployee() async {
    final name = _fullNameController.text.trim();
    final email = _emailController.text.trim();
    final phone = _phoneController.text.trim();
    final password = _passwordController.text.trim();

    if (name.isEmpty || email.isEmpty || password.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Vui lòng nhập đầy đủ các trường bắt buộc!")),
      );
      return;
    }

    setState(() => _isCreatingEmployee = true);

    final payload = {
      "fullName": name,
      "email": email,
      "phoneNumber": phone,
      "password": password,
      "role": _selectedRole,
      "hospitalBranch": _selectedBranch ?? "CareConnect Quận 1",
      "specialization": _selectedRole == "Doctor" ? _selectedSpecialization : null,
      "degree": _selectedRole == "Doctor" ? _selectedDegree : null,
    };

    final result = await _apiService.registerEmployee(payload);
    setState(() => _isCreatingEmployee = false);

    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Tạo tài khoản nhân viên thành công!"), backgroundColor: Colors.green),
      );
      _fullNameController.clear();
      _emailController.clear();
      _phoneController.clear();
      _passwordController.clear();
      _loadStats();
      _loadStaffList();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message']), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _deleteUser(dynamic user, bool isPatient) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(isPatient ? "Xác Nhận Xóa Bệnh Nhân" : "Xác Nhận Xóa Nhân Viên", 
          style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
        content: Text("Bạn có thực sự muốn xóa tài khoản ${user['fullName']} không? Hành động này không thể hoàn tác."),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Xác Nhận Xóa", style: TextStyle(color: Colors.white)),
          )
        ],
      ),
    );

    if (confirm == true) {
      final res = await _apiService.deleteUser(user['userId']);
      if (res['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Xóa tài khoản thành công!"), backgroundColor: Colors.green),
        );
        _loadStats();
        _loadStaffList();
        _loadPatientList();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message']), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _updateApptStatus(int appointmentId, String newStatus) async {
    final success = await _apiService.updateAppointmentStatus(appointmentId, {"status": newStatus});
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text("Đã cập nhật lịch khám thành công!"), backgroundColor: Colors.green),
      );
      _loadStats();
      _loadAppointmentsList();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Cập nhật trạng thái lịch khám thất bại!"), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _payPrescription(int recordId) async {
    final result = await _apiService.payPrescription(recordId);
    if (result['success']) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text("Thanh toán hóa đơn thành công!"), backgroundColor: Colors.green),
      );
      _loadStats();
      _loadMedicalRecordsList();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(result['message'] ?? "Thanh toán hóa đơn thất bại."), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _handleResetDb() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text("Reset Dữ Liệu Hệ Thống", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
        content: const Text("CẢNH BÁO: Hành động này sẽ xóa sạch toàn bộ lịch hẹn, bệnh án và các tài khoản tự tạo, đặt cơ sở dữ liệu về trạng thái mẫu ban đầu. Bạn có muốn tiếp tục?"),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text("Hủy")),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(context, true),
            child: const Text("Reset Hệ Thống", style: TextStyle(color: Colors.white)),
          )
        ],
      ),
    );

    if (confirm == true) {
      setState(() => _isResettingDb = true);
      final res = await _apiService.resetDatabase();
      setState(() => _isResettingDb = false);

      if (res['success']) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Reset cơ sở dữ liệu thành công!"), backgroundColor: Colors.green),
        );
        _loadStats();
        _loadStaffList();
        _loadPatientList();
        _loadAppointmentsList();
        _loadMedicalRecordsList();
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(res['message']), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _translateStatus(String status) {
    switch (status) {
      case "Pending":
        return "Chờ duyệt";
      case "Confirmed":
        return "Xác nhận";
      case "CheckedIn":
        return "Tiếp nhận";
      case "Completed":
        return "Hoàn thành";
      case "Cancelled":
        return "Đã hủy";
      default:
        return status;
    }
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case "Pending":
        return Colors.orange;
      case "Confirmed":
        return Colors.blue;
      case "CheckedIn":
        return Colors.purple;
      case "Completed":
        return Colors.green;
      case "Cancelled":
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 5,
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            "Admin: $_adminName", 
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
            isScrollable: true,
            labelColor: Color(0xFF0F766E),
            unselectedLabelColor: Color(0xFF64748B),
            indicatorColor: Color(0xFF0F766E),
            indicatorSize: TabBarIndicatorSize.label,
            tabs: [
              Tab(icon: Icon(Icons.dashboard_rounded), text: "Tổng Quan"),
              Tab(icon: Icon(Icons.calendar_month_rounded), text: "Duyệt Lịch"),
              Tab(icon: Icon(Icons.assignment_rounded), text: "Bệnh Án"),
              Tab(icon: Icon(Icons.people_alt_rounded), text: "Người Dùng"),
              Tab(icon: Icon(Icons.settings_rounded), text: "Hệ Thống"),
            ],
          ),
        ),
        body: TabBarView(
          children: [
            _buildStatsTab(),
            _buildAppointmentsTab(),
            _buildMedicalRecordsTab(),
            _buildUserManagementTab(),
            _buildCreateEmployeeTab(),
          ],
        ),
      ),
    );
  }

  // --- TAB 1: TỔNG QUAN ---
  Widget _buildStatsTab() {
    final summary = _overviewData['summary'] ?? {};
    final recentApps = _overviewData['recentAppointments'] as List<dynamic>? ?? [];
    final recentRecs = _overviewData['recentRecords'] as List<dynamic>? ?? [];
    final topDocs = _overviewData['topDoctors'] as List<dynamic>? ?? [];
    final completionRate = (summary['completionRate'] ?? 0).toString();
    final statusBreakdown = summary['statusBreakdown'] as Map<dynamic, dynamic>? ?? {};

    return _isLoadingStats
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadStats,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // KPI Grid
                  const Text("Chỉ Số Hoạt Động", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                  const SizedBox(height: 12),
                  GridView.count(
                    crossAxisCount: 2,
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    crossAxisSpacing: 10,
                    mainAxisSpacing: 10,
                    childAspectRatio: 1.5,
                    children: [
                      _buildStatCard("Lịch Hẹn", _totalAppointments.toString(), Icons.calendar_month, Colors.blue),
                      _buildStatCard("Bệnh Nhân", _totalPatients.toString(), Icons.people, Colors.purple),
                      _buildStatCard("Bác Sĩ", _totalDoctors.toString(), Icons.medical_services, Colors.teal),
                      _buildStatCard("Bệnh Án", (summary['totalRecords'] ?? 0).toString(), Icons.assignment_rounded, Colors.orange),
                    ],
                  ),
                  const SizedBox(height: 24),

                  // Phân tích Trạng thái & Tỷ lệ hoàn thành
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 0.5,
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: const [
                              Icon(Icons.analytics_rounded, color: Color(0xFF0F766E)),
                              SizedBox(width: 8),
                              Text("Tỷ Lệ Hoàn Thành Lịch Khám", style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                            ],
                          ),
                          const SizedBox(height: 12),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text("$completionRate%", style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                              const Text("Lịch hẹn khám hoàn thành", style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                          const SizedBox(height: 8),
                          LinearProgressIndicator(
                            value: (double.tryParse(completionRate) ?? 0) / 100,
                            backgroundColor: Colors.grey.shade200,
                            color: const Color(0xFF0F766E),
                            minHeight: 8,
                            borderRadius: BorderRadius.circular(4),
                          ),
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 8),
                          Wrap(
                            spacing: 8,
                            runSpacing: 8,
                            children: [
                              _buildStatusBadge("Chờ duyệt: ${statusBreakdown['Pending'] ?? 0}", Colors.orange),
                              _buildStatusBadge("Xác nhận: ${statusBreakdown['Confirmed'] ?? 0}", Colors.blue),
                              _buildStatusBadge("Tiếp nhận: ${statusBreakdown['CheckedIn'] ?? 0}", Colors.purple),
                              _buildStatusBadge("Hoàn thành: ${statusBreakdown['Completed'] ?? 0}", Colors.green),
                              _buildStatusBadge("Đã hủy: ${statusBreakdown['Cancelled'] ?? 0}", Colors.red),
                            ],
                          )
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Top Bác sĩ
                  const Text("Top Bác Sĩ Hoạt Động Hiệu Quả", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                  const SizedBox(height: 12),
                  if (topDocs.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(20), child: Center(child: Text("Chưa có dữ liệu bác sĩ hoàn thành ca khám.")))),
                  if (topDocs.isNotEmpty)
                    Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0.5,
                      child: Column(
                        children: topDocs.map((doc) {
                          final idx = topDocs.indexOf(doc) + 1;
                          return ListTile(
                            leading: CircleAvatar(
                              backgroundColor: idx == 1 ? Colors.amber.shade100 : (idx == 2 ? Colors.grey.shade200 : Colors.orange.shade50),
                              child: Text("#$idx", style: TextStyle(fontWeight: FontWeight.bold, color: idx == 1 ? Colors.amber.shade900 : Colors.black87)),
                            ),
                            title: Text(doc['fullName'] ?? 'Bác sĩ', style: const TextStyle(fontWeight: FontWeight.bold)),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(12)),
                              child: Text("${doc['completedCount']} ca khám", style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.bold, fontSize: 12)),
                            ),
                          );
                        }).toList(),
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Lịch hẹn gần đây
                  const Text("Lịch Hẹn Mới Nhất", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                  const SizedBox(height: 12),
                  if (recentApps.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(20), child: Center(child: Text("Chưa có lịch hẹn khám nào.")))),
                  if (recentApps.isNotEmpty)
                    Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0.5,
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: recentApps.length,
                        separatorBuilder: (context, index) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final app = recentApps[index];
                          final dateStr = DateTime.tryParse(app['appointmentDate'] ?? '') != null
                              ? "${DateTime.parse(app['appointmentDate']).day}/${DateTime.parse(app['appointmentDate']).month}/${DateTime.parse(app['appointmentDate']).year}"
                              : '';
                          return ListTile(
                            title: Text("Bệnh nhân: ${app['patientName'] ?? 'Chưa rõ'}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            subtitle: Text("BS. ${app['doctorName'] ?? ''} - $dateStr (${app['timeSlot']})", style: const TextStyle(fontSize: 11)),
                            trailing: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(color: _getStatusColor(app['status']).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                              child: Text(_translateStatus(app['status']), style: TextStyle(color: _getStatusColor(app['status']), fontSize: 10, fontWeight: FontWeight.bold)),
                            ),
                          );
                        },
                      ),
                    ),
                  const SizedBox(height: 24),

                  // Bệnh án gần đây
                  const Text("Bệnh Án Mới Nhất", style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F766E))),
                  const SizedBox(height: 12),
                  if (recentRecs.isEmpty)
                    const Card(child: Padding(padding: EdgeInsets.all(20), child: Center(child: Text("Chưa có bệnh án mới.")))),
                  if (recentRecs.isNotEmpty)
                    Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      elevation: 0.5,
                      child: ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: recentRecs.length,
                        separatorBuilder: (context, index) => const Divider(height: 1),
                        itemBuilder: (context, index) {
                          final rec = recentRecs[index];
                          final dateStr = DateTime.tryParse(rec['recordDate'] ?? '') != null
                              ? "${DateTime.parse(rec['recordDate']).day}/${DateTime.parse(rec['recordDate']).month}/${DateTime.parse(rec['recordDate']).year}"
                              : '';
                          return ListTile(
                            title: Text("Bệnh nhân: ${rec['patientName'] ?? 'Chưa rõ'}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                            subtitle: Text("Chẩn đoán: ${rec['diagnosis'] ?? 'Không rõ'}", style: const TextStyle(fontSize: 12, fontStyle: FontStyle.italic)),
                            trailing: Text(dateStr, style: const TextStyle(fontSize: 11, color: Colors.grey)),
                          );
                        },
                      ),
                    ),
                ],
              ),
            ),
          );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(6),
              decoration: BoxDecoration(color: color.withOpacity(0.1), shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 20),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(title, style: const TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.w600)),
                  const SizedBox(height: 2),
                  Text(value, style: TextStyle(color: Colors.grey.shade800, fontSize: 16, fontWeight: FontWeight.bold)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatusBadge(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(color: color.withOpacity(0.1), borderRadius: BorderRadius.circular(12)),
      child: Text(text, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.bold)),
    );
  }

  // --- TAB 2: DUYỆT LỊCH KHÁM ---
  Widget _buildAppointmentsTab() {
    // Lọc lịch khám theo trạng thái
    final filtered = _appointmentsList.where((a) {
      if (_appointmentFilterStatus == "All") return true;
      return a['status'] == _appointmentFilterStatus;
    }).toList();

    return _isLoadingAppointments
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadAppointmentsList,
            child: Column(
              children: [
                // Thanh lọc trạng thái
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  child: Row(
                    children: ["All", "Pending", "Confirmed", "CheckedIn", "Completed", "Cancelled"].map((status) {
                      final isSelected = _appointmentFilterStatus == status;
                      return Padding(
                        padding: const EdgeInsets.only(right: 6),
                        child: FilterChip(
                          label: Text(status == "All" ? "Tất cả" : _translateStatus(status), style: TextStyle(fontSize: 12, color: isSelected ? Colors.white : Colors.black87)),
                          selected: isSelected,
                          selectedColor: const Color(0xFF0F766E),
                          checkmarkColor: Colors.white,
                          backgroundColor: Colors.grey.shade100,
                          onSelected: (val) {
                            setState(() => _appointmentFilterStatus = status);
                          },
                        ),
                      );
                    }).toList(),
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(child: Text("Không tìm thấy lịch hẹn nào.", style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          padding: const EdgeInsets.all(12),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final app = filtered[index];
                            final apptDate = DateTime.tryParse(app['appointmentDate'] ?? '') != null
                                ? "${DateTime.parse(app['appointmentDate']).day}/${DateTime.parse(app['appointmentDate']).month}/${DateTime.parse(app['appointmentDate']).year}"
                                : '';
                            final status = app['status'];

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0.5,
                              child: Padding(
                                padding: const EdgeInsets.all(12.0),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text("Mã Lịch: #${app['appointmentId']}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: _getStatusColor(status).withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                                          child: Text(_translateStatus(status), style: TextStyle(color: _getStatusColor(status), fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text("Bệnh nhân: ${app['patientName'] ?? 'Chưa rõ'}", style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                    const SizedBox(height: 4),
                                    Text("Bác sĩ: BS. ${app['doctorName'] ?? 'Chưa rõ'}", style: const TextStyle(fontSize: 13, color: Colors.black87)),
                                    Text("Chi nhánh: ${app['hospitalBranch'] ?? 'Chưa rõ'}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                    const SizedBox(height: 6),
                                    Row(
                                      children: [
                                        const Icon(Icons.access_time_filled, size: 14, color: Colors.grey),
                                        const SizedBox(width: 4),
                                        Text("$apptDate - ${app['timeSlot']}", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Colors.blueGrey)),
                                      ],
                                    ),
                                    if (status == "Pending") ...[
                                      const SizedBox(height: 12),
                                      const Divider(height: 1),
                                      const SizedBox(height: 8),
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.end,
                                        children: [
                                          OutlinedButton(
                                            style: OutlinedButton.styleFrom(
                                              foregroundColor: Colors.red,
                                              side: const BorderSide(color: Colors.red),
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              padding: const EdgeInsets.symmetric(horizontal: 16),
                                            ),
                                            onPressed: () => _updateApptStatus(app['appointmentId'], "Cancelled"),
                                            child: const Text("Từ chối (Hủy)", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ),
                                          const SizedBox(width: 8),
                                          ElevatedButton(
                                            style: ElevatedButton.styleFrom(
                                              backgroundColor: Colors.green,
                                              foregroundColor: Colors.white,
                                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                              padding: const EdgeInsets.symmetric(horizontal: 16),
                                            ),
                                            onPressed: () => _updateApptStatus(app['appointmentId'], "Confirmed"),
                                            child: const Text("Duyệt & Xác nhận", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          ),
                                        ],
                                      )
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                ),
              ],
            ),
          );
  }

  // --- TAB 3: QUẢN LÝ BỆNH ÁN ---
  Widget _buildMedicalRecordsTab() {
    final filtered = _medicalRecordsList.where((r) {
      if (_recordsSearchQuery.isEmpty) return true;
      final q = _recordsSearchQuery.toLowerCase();
      return (r.patientName.toLowerCase().contains(q) || 
          r.diagnosis.toLowerCase().contains(q) || 
          r.doctorName.toLowerCase().contains(q));
    }).toList();

    return _isLoadingRecords
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadMedicalRecordsList,
            child: Column(
              children: [
                // Tìm kiếm bệnh án
                Padding(
                  padding: const EdgeInsets.all(12),
                  child: TextField(
                    decoration: InputDecoration(
                      hintText: "Tìm theo tên bệnh nhân, chẩn đoán, bác sĩ...",
                      prefixIcon: const Icon(Icons.search),
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16),
                    ),
                    onChanged: (val) {
                      setState(() => _recordsSearchQuery = val.trim());
                    },
                  ),
                ),
                Expanded(
                  child: filtered.isEmpty
                      ? const Center(child: Text("Không tìm thấy bệnh án nào.", style: TextStyle(color: Colors.grey)))
                      : ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          itemCount: filtered.length,
                          itemBuilder: (context, index) {
                            final rec = filtered[index];
                            final dateStr = DateTime.tryParse(rec.recordDate) != null
                                ? "${DateTime.parse(rec.recordDate).day}/${DateTime.parse(rec.recordDate).month}/${DateTime.parse(rec.recordDate).year}"
                                : '';

                            final isPaid = rec.billingStatus.toLowerCase() == "paid";

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                              elevation: 0.5,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text("Bệnh Án: #BA-${rec.medicalRecordId}", style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.blueGrey)),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                          decoration: BoxDecoration(color: isPaid ? Colors.green.shade50 : Colors.orange.shade50, borderRadius: BorderRadius.circular(6)),
                                          child: Text(isPaid ? "Đã thanh toán" : "Chưa thanh toán", style: TextStyle(color: isPaid ? Colors.green.shade800 : Colors.orange.shade800, fontSize: 10, fontWeight: FontWeight.bold)),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 8),
                                    Text("Bệnh nhân: ${rec.patientName}", style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 14)),
                                    const SizedBox(height: 4),
                                    Text("Bác sĩ điều trị: BS. ${rec.doctorName}", style: const TextStyle(fontSize: 13, color: Colors.black87)),
                                    const SizedBox(height: 6),
                                    Container(
                                      width: double.infinity,
                                      padding: const EdgeInsets.all(10),
                                      decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.grey.shade100)),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text("Chẩn đoán: ${rec.diagnosis}", style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.black87)),
                                          const SizedBox(height: 4),
                                          Text("Hướng xử lý: ${rec.treatment}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                          if (rec.prescription.isNotEmpty) ...[
                                            const SizedBox(height: 4),
                                            Text("Đơn thuốc: ${rec.prescription}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                          ],
                                        ],
                                      ),
                                    ),
                                    const SizedBox(height: 8),
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text("Ngày lập: $dateStr", style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                        Text("Hóa đơn thuốc: ${rec.prescriptionFee.toStringAsFixed(0)}đ", style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal)),
                                      ],
                                    ),
                                    if (!isPaid) ...[
                                      const SizedBox(height: 12),
                                      const Divider(height: 1),
                                      const SizedBox(height: 8),
                                      SizedBox(
                                        width: double.infinity,
                                        child: ElevatedButton.icon(
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: Colors.teal,
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          icon: const Icon(Icons.payment, size: 16),
                                          label: const Text("Duyệt Thanh Toán Toa Thuốc", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                          onPressed: () => _payPrescription(rec.medicalRecordId),
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
            ),
          );
  }

  // --- TAB 4: QUẢN LÝ NGƯỜI DÙNG ---
  Widget _buildUserManagementTab() {
    final showPatients = _userManagementTab == "Patient";

    // Lọc theo từ khóa tìm kiếm
    final filteredStaff = _staffList.where((s) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return (s['fullName']?.toLowerCase()?.contains(q) ?? false) || 
          (s['email']?.toLowerCase()?.contains(q) ?? false);
    }).toList();

    final filteredPatients = _patientList.where((p) {
      if (_searchQuery.isEmpty) return true;
      final q = _searchQuery.toLowerCase();
      return (p['fullName']?.toLowerCase()?.contains(q) ?? false) || 
          (p['email']?.toLowerCase()?.contains(q) ?? false) ||
          (p['phoneNumber']?.toLowerCase()?.contains(q) ?? false);
    }).toList();

    return Column(
      children: [
        // Tab switchers (Nhân viên / Bệnh nhân)
        Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: !showPatients ? const Color(0xFF0F766E) : Colors.grey.shade100,
                    foregroundColor: !showPatients ? Colors.white : Colors.black87,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => setState(() => _userManagementTab = "Staff"),
                  child: const Text("Quản Lý Nhân Viên"),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: showPatients ? const Color(0xFF0F766E) : Colors.grey.shade100,
                    foregroundColor: showPatients ? Colors.white : Colors.black87,
                    elevation: 0,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () => setState(() => _userManagementTab = "Patient"),
                  child: const Text("Quản Lý Bệnh Nhân"),
                ),
              ),
            ],
          ),
        ),
        // Search bar
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12),
          child: TextField(
            decoration: InputDecoration(
              hintText: showPatients ? "Tìm theo tên bệnh nhân, email, SĐT..." : "Tìm nhân viên theo tên, email...",
              prefixIcon: const Icon(Icons.search),
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
            ),
            onChanged: (val) {
              setState(() => _searchQuery = val.trim());
            },
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: showPatients
              ? (_isLoadingPatients
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _loadPatientList,
                      child: filteredPatients.isEmpty
                          ? const Center(child: Text("Hệ thống chưa có bệnh nhân nào.", style: TextStyle(color: Colors.grey)))
                          : ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filteredPatients.length,
                              itemBuilder: (context, index) {
                                final pat = filteredPatients[index];
                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0.5,
                                  child: Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: Colors.purple.withOpacity(0.1),
                                          radius: 24,
                                          child: const Icon(Icons.people, color: Colors.purple),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(pat['fullName'] ?? 'Bệnh nhân', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                              const SizedBox(height: 4),
                                              Text("SĐT: ${pat['phoneNumber'] ?? 'Không có'}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                              Text("Email: ${pat['email'] ?? 'Không có'}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                              if (pat['insuranceCardNumber'] != null && pat['insuranceCardNumber'].toString().isNotEmpty)
                                                Text("BHYT: ${pat['insuranceCardNumber']}", style: const TextStyle(fontSize: 11, color: Colors.blueGrey)),
                                              if (pat['patientType'] != null && pat['patientType'].toString().isNotEmpty)
                                                Container(
                                                  margin: const EdgeInsets.only(top: 4),
                                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                  decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(4)),
                                                  child: Text(pat['patientType'] == "Priority" ? "Ưu tiên (Người già/Trẻ nhỏ)" : "Thường", style: TextStyle(color: Colors.purple.shade800, fontSize: 9, fontWeight: FontWeight.bold)),
                                                )
                                            ],
                                          ),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                                          onPressed: () => _deleteUser(pat, true),
                                        )
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    ))
              : (_isLoadingStaff
                  ? const Center(child: CircularProgressIndicator())
                  : RefreshIndicator(
                      onRefresh: _loadStaffList,
                      child: filteredStaff.isEmpty
                          ? const Center(child: Text("Không tìm thấy nhân viên nào.", style: TextStyle(color: Colors.grey)))
                          : ListView.builder(
                              padding: const EdgeInsets.all(12),
                              itemCount: filteredStaff.length,
                              itemBuilder: (context, index) {
                                final staff = filteredStaff[index];
                                final role = staff['role'];
                                Color roleColor = Colors.teal;
                                if (role == 'Admin') roleColor = Colors.red;
                                if (role == 'Receptionist') roleColor = Colors.blue;
                                if (role == 'Finance') roleColor = Colors.orange;

                                return Card(
                                  margin: const EdgeInsets.only(bottom: 12),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                  elevation: 0.5,
                                  child: Padding(
                                    padding: const EdgeInsets.all(12.0),
                                    child: Row(
                                      children: [
                                        CircleAvatar(
                                          backgroundColor: roleColor.withOpacity(0.1),
                                          radius: 24,
                                          child: Icon(
                                            role == 'Doctor' ? Icons.medical_services_outlined : Icons.person_outline,
                                            color: roleColor,
                                          ),
                                        ),
                                        const SizedBox(width: 12),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Row(
                                                children: [
                                                  Text(staff['fullName'] ?? 'Nhân sự', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                                  const SizedBox(width: 6),
                                                  Container(
                                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                    decoration: BoxDecoration(color: roleColor.withOpacity(0.1), borderRadius: BorderRadius.circular(4)),
                                                    child: Text(role == 'Finance' ? 'Tài chính' : role, style: TextStyle(color: roleColor, fontSize: 9, fontWeight: FontWeight.bold)),
                                                  )
                                                ],
                                              ),
                                              const SizedBox(height: 4),
                                              Text("Email: ${staff['email'] ?? ''}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                              if (role == 'Doctor' && staff['specialization'] != null)
                                                Text("Khoa: ${staff['specialization']}", style: const TextStyle(fontSize: 12, color: Colors.black87)),
                                              Text("Chi nhánh: ${staff['hospitalBranch'] ?? 'Chưa rõ'}", style: const TextStyle(fontSize: 12, color: Colors.grey)),
                                            ],
                                          ),
                                        ),
                                        if (role != 'Admin')
                                          IconButton(
                                            icon: const Icon(Icons.delete_outline, color: Colors.red),
                                            onPressed: () => _deleteUser(staff, false),
                                          )
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                    )),
        ),
      ],
    );
  }

  // --- TAB 5: HỆ THỐNG ---
  Widget _buildCreateEmployeeTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          // Card cấp nhân viên
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            elevation: 0.5,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    "Cấp Tài Khoản Nhân Viên Mới", 
                    style: TextStyle(fontSize: 15, fontWeight: FontWeight.w800, color: Color(0xFF1E293B), letterSpacing: -0.5),
                  ),
                  const SizedBox(height: 16),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: "Chọn vai trò nhân viên", border: OutlineInputBorder()),
                    value: _selectedRole,
                    items: const [
                      DropdownMenuItem(value: "Doctor", child: Text("Bác sĩ (Doctor)")),
                      DropdownMenuItem(value: "Receptionist", child: Text("Lễ tân (Receptionist)")),
                      DropdownMenuItem(value: "Admin", child: Text("Quản trị viên (Admin)")),
                      DropdownMenuItem(value: "Finance", child: Text("Phòng tài chính (Finance)")),
                    ],
                    onChanged: (val) {
                      setState(() => _selectedRole = val ?? "Doctor");
                    },
                  ),
                  const SizedBox(height: 12),
                  TextField(controller: _fullNameController, decoration: const InputDecoration(labelText: "Họ Tên Nhân Viên *", border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  TextField(controller: _emailController, keyboardType: TextInputType.emailAddress, decoration: const InputDecoration(labelText: "Email Đăng Nhập *", border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  TextField(controller: _phoneController, keyboardType: TextInputType.phone, decoration: const InputDecoration(labelText: "Số Điện Thoại", border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  TextField(controller: _passwordController, obscureText: true, decoration: const InputDecoration(labelText: "Mật Khẩu *", border: OutlineInputBorder())),
                  const SizedBox(height: 12),
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(labelText: "Chọn Chi Nhánh Làm Việc", border: OutlineInputBorder()),
                    value: _selectedBranch,
                    items: _branches.map((b) {
                      return DropdownMenuItem<String>(value: b.name, child: Text(b.name));
                    }).toList(),
                    onChanged: (val) {
                      setState(() => _selectedBranch = val);
                    },
                  ),
                  const SizedBox(height: 12),
                  if (_selectedRole == "Doctor") ...[
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "Chuyên khoa bác sĩ", border: OutlineInputBorder()),
                      value: _selectedSpecialization,
                      items: _specializations.map((s) {
                        return DropdownMenuItem<String>(value: s, child: Text(s));
                      }).toList(),
                      onChanged: (val) {
                        setState(() => _selectedSpecialization = val ?? "Nội khoa tổng quát");
                      },
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      decoration: const InputDecoration(labelText: "Học vị / Học hàm", border: OutlineInputBorder()),
                      value: _selectedDegree,
                      items: _degrees.map((d) {
                        return DropdownMenuItem<String>(value: d, child: Text(d));
                      }).toList(),
                      onChanged: (val) {
                        setState(() => _selectedDegree = val ?? "Thạc sĩ");
                      },
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 44,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0F766E), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      onPressed: _isCreatingEmployee ? null : _createEmployee,
                      child: _isCreatingEmployee
                          ? const CircularProgressIndicator(color: Colors.white)
                          : const Text("Tạo Tài Khoản Nhân Viên", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 20),

          // Reset DB Card
          Card(
            elevation: 0,
            color: Colors.red.shade50,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.red.shade200)),
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.warning_amber_rounded, color: Colors.red),
                      SizedBox(width: 8),
                      Text("Tùy Chọn Khôi Phục Hệ Thống", style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red, fontSize: 14)),
                    ],
                  ),
                  const SizedBox(height: 8),
                  const Text("Xóa sạch toàn bộ cơ sở dữ liệu hiện tại để khôi phục cấu hình và các tài khoản mẫu mặc định.", style: TextStyle(fontSize: 12, color: Colors.black87)),
                  const SizedBox(height: 16),
                  SizedBox(
                    width: double.infinity,
                    height: 40,
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(backgroundColor: Colors.red, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
                      icon: _isResettingDb
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.refresh, color: Colors.white),
                      label: const Text("Khôi Phục Dữ Liệu Mẫu (Reset DB)", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                      onPressed: _isResettingDb ? null : _handleResetDb,
                    ),
                  )
                ],
              ),
            ),
          )
        ],
      ),
    );
  }
}
