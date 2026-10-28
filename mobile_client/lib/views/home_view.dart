import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../models/record_model.dart';
import 'branch_view.dart';
import 'login_view.dart';

class HomeView extends StatefulWidget {
  const HomeView({Key? key}) : super(key: key);

  @override
  State<HomeView> createState() => _HomeViewState();
}

class _HomeViewState extends State<HomeView> {
  final _apiService = ApiService();
  List<RecordModel> _records = [];
  bool _isLoading = true;
  String _patientName = "Bệnh nhân";

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final records = await _apiService.getMedicalRecords();
      final userName = await _apiService.getUserName() ?? "Bệnh nhân";
      setState(() {
        _records = records;
        _patientName = userName;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Lỗi tải thông tin bệnh án.")),
        );
      }
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("CareConnect Dashboard", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
        backgroundColor: Colors.teal,
        actions: [
          IconButton(
            icon: const Icon(Icons.logout, color: Colors.white),
            onPressed: _handleLogout,
          )
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Thẻ chào mừng bệnh nhân
                    Card(
                      color: Colors.teal.shade50,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Row(
                          children: [
                            const CircleAvatar(
                              radius: 28,
                              backgroundColor: Colors.teal,
                              child: Icon(Icons.person, size: 36, color: Colors.white),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text("Xin chào,", style: TextStyle(fontSize: 14, color: Colors.grey)),
                                  Text(
                                    _patientName,
                                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Colors.teal),
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
                    // Quick Action: Tìm chi nhánh phòng khám bằng GPS
                    ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.teal,
                        minimumSize: const Size(double.infinity, 50),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                      icon: const Icon(Icons.map, color: Colors.white),
                      label: const Text("Tìm Chi Nhánh Bệnh Viện (GPS)", style: TextStyle(fontSize: 16, color: Colors.white, fontWeight: FontWeight.bold)),
                      onPressed: () {
                        Navigator.push(
                          context,
                          MaterialPageRoute(builder: (context) => const BranchView()),
                        );
                      },
                    ),
                    const SizedBox(height: 24),
                    // Danh sách bệnh án đã khám
                    const Text(
                      "Lịch Sử Bệnh Án & Sinh Hiệu",
                      style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal),
                    ),
                    const SizedBox(height: 12),
                    _records.isEmpty
                        ? const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 40.0),
                              child: Text("Bạn chưa có lịch sử bệnh án nào.", style: TextStyle(color: Colors.grey)),
                            ),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _records.length,
                            itemBuilder: (context, index) {
                              final record = _records[index];
                              return Card(
                                margin: const EdgeInsets.only(bottom: 12.0),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            "Bác sĩ: ${record.doctorName}",
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                                          ),
                                          Text(
                                            record.recordDate.split('T')[0],
                                            style: const TextStyle(color: Colors.grey, fontSize: 13),
                                          ),
                                        ],
                                      ),
                                      const Divider(height: 20),
                                      // Sinh hiệu đo tại quầy tiếp đón
                                      if (record.bloodPressure != null || record.temperature != null || record.weight != null || record.heartRate != null) ...[
                                        const Text("Chỉ số sinh hiệu (Reception):", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.teal)),
                                        const SizedBox(height: 6),
                                        Wrap(
                                          spacing: 12,
                                          runSpacing: 6,
                                          children: [
                                            if (record.bloodPressure != null) _buildVitalBadge("HA: ${record.bloodPressure} mmHg"),
                                            if (record.temperature != null) _buildVitalBadge("T: ${record.temperature}°C"),
                                            if (record.weight != null) _buildVitalBadge("CN: ${record.weight} kg"),
                                            if (record.heartRate != null) _buildVitalBadge("NT: ${record.heartRate} bpm"),
                                          ],
                                        ),
                                        const SizedBox(height: 12),
                                      ],
                                      const Text("Chẩn đoán:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                                      Text(record.diagnosis, style: const TextStyle(fontSize: 14)),
                                      const SizedBox(height: 8),
                                      const Text("Điều trị & Đơn thuốc:", style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                                      Text(record.prescription, style: const TextStyle(fontSize: 13, fontStyle: FontStyle.italic)),
                                    ],
                                  ),
                                ),
                              );
                            },
                          )
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildVitalBadge(String label) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: Colors.teal.shade50,
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: Colors.teal.shade200),
      ),
      child: Text(label, style: const TextStyle(fontSize: 11, color: Colors.teal, fontWeight: FontWeight.w600)),
    );
  }
}
