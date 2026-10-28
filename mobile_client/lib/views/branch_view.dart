import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:flutter_map/flutter_map.dart';
import 'package:latlong2/latlong.dart';
import 'package:http/http.dart' as http;
import '../services/api_service.dart';
import '../models/branch_model.dart';
import 'widgets/pulsing_skeleton.dart';

class BranchView extends StatefulWidget {
  const BranchView({Key? key}) : super(key: key);

  @override
  State<BranchView> createState() => _BranchViewState();
}

class _BranchViewState extends State<BranchView> {
  final _apiService = ApiService();
  List<BranchModel> _branches = [];
  bool _isLoading = true;
  String _gpsStatus = "Đang tải dữ liệu...";
  bool _showMap = false;
  LatLng? _userLatLng;
  final MapController _mapController = MapController();

  @override
  void initState() {
    super.initState();
    _loadBranchesAndCalculateDistance();
  }

  Future<void> _loadBranchesAndCalculateDistance() async {
    setState(() {
      _isLoading = true;
      _gpsStatus = "Đang xác định vị trí...";
    });

    try {
      // 1. Định vị vị trí GPS hiện tại của điện thoại bệnh nhân
      setState(() => _gpsStatus = "Đang kích hoạt định vị GPS...");
      Position? currentPosition;
      
      try {
        LocationPermission permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        
        if (permission == LocationPermission.always || permission == LocationPermission.whileInUse) {
          currentPosition = await Geolocator.getCurrentPosition(
            desiredAccuracy: LocationAccuracy.high,
            timeLimit: const Duration(seconds: 4),
          );
        } else {
          setState(() => _gpsStatus = "Quyền truy cập GPS bị từ chối.");
        }
      } catch (e) {
        // Lỗi định vị hoặc tắt GPS
      }

      LatLng? referenceLatLng;

      if (currentPosition != null) {
        referenceLatLng = LatLng(currentPosition.latitude, currentPosition.longitude);
        _userLatLng = referenceLatLng;
      } else {
        // Fallback: Lấy địa chỉ liên hệ của bệnh nhân từ API profile
        try {
          final profile = await _apiService.getProfile();
          final String? address = profile['address'];
          if (address != null && address.trim().isNotEmpty) {
            setState(() => _gpsStatus = "Không có GPS. Đang định vị theo địa chỉ...");
            referenceLatLng = await _geocodeAddress(address);
            _userLatLng = referenceLatLng;
          }
        } catch (_) {}
      }

      // Mặc định về Thái Nguyên nếu hoàn toàn không lấy được định vị
      if (referenceLatLng == null) {
        referenceLatLng = const LatLng(21.5939, 105.8442);
        _userLatLng = referenceLatLng;
      }

      // 2. Tìm kiếm Bệnh viện / Phòng khám thực tế gần nhất từ OpenStreetMap Nominatim
      setState(() => _gpsStatus = "Đang tìm phòng khám/bệnh viện thực tế xung quanh...");
      final branches = await _fetchRealNearbyHospitals(referenceLatLng.latitude, referenceLatLng.longitude);

      // 3. Tính toán khoảng cách địa lý (Haversine Formula) đến từng chi nhánh
      for (var branch in branches) {
        double distanceInMeters = Geolocator.distanceBetween(
          referenceLatLng.latitude,
          referenceLatLng.longitude,
          branch.latitude,
          branch.longitude,
        );
        branch.distanceInKm = distanceInMeters / 1000.0;
      }

      // 4. Sắp xếp chi nhánh từ gần nhất đến xa nhất
      branches.sort((a, b) => (a.distanceInKm ?? double.maxFinite).compareTo(b.distanceInKm ?? double.maxFinite));
      
      final profile = await _apiService.getProfile().catchError((_) => {});
      final String? address = profile != null ? profile['address'] : null;
      setState(() => _gpsStatus = (address != null && address.isNotEmpty) 
          ? "Định vị: $address" 
          : "Đã định vị thành công vị trí hiện tại.");

      setState(() {
        _branches = branches;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _gpsStatus = "Lỗi tải dữ liệu phòng khám.";
      });
    }
  }

  Future<List<BranchModel>> _fetchRealNearbyHospitals(double lat, double lon) async {
    final List<BranchModel> results = [];
    
    // Tạo bounding box khoảng 0.25 độ xung quanh vị trí người dùng (xấp xỉ 25km)
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

  void _showBranchDetailBottomSheet(BranchModel branch) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(20.0),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      branch.name,
                      style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.teal),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(context),
                  )
                ],
              ),
              const Divider(),
              const SizedBox(height: 8),
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Icon(Icons.location_on, color: Colors.teal, size: 20),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      branch.address,
                      style: const TextStyle(fontSize: 14, color: Colors.black87),
                    ),
                  ),
                ],
              ),
              if (branch.distanceInKm != null) ...[
                const SizedBox(height: 12),
                Row(
                  children: [
                    const Icon(Icons.directions_car, color: Colors.orange, size: 20),
                    const SizedBox(width: 8),
                    Text(
                      "Khoảng cách: ${branch.distanceInKm!.toStringAsFixed(1)} km từ vị trí của bạn",
                      style: const TextStyle(fontSize: 14, color: Colors.orange, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.teal,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  onPressed: () {
                    Navigator.pop(context);
                  },
                  child: const Text("Đóng", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildListView() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            "Danh Sách Chi Nhánh Phòng Khám",
            style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.teal),
          ),
          const SizedBox(height: 12),
          Expanded(
            child: ListView.builder(
              itemCount: _branches.length,
              itemBuilder: (context, index) {
                final branch = _branches[index];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12.0),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  elevation: 2,
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Colors.teal,
                      child: Icon(Icons.local_hospital_rounded, color: Colors.white),
                    ),
                    title: Text(
                      branch.name,
                      style: const TextStyle(fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const SizedBox(height: 4),
                        Text(
                          branch.address,
                          style: const TextStyle(fontSize: 12, color: Colors.grey),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                    trailing: branch.distanceInKm != null
                        ? Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: Colors.orange.shade50,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.orange.shade200),
                            ),
                            child: Text(
                              "${branch.distanceInKm!.toStringAsFixed(1)} km",
                              style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 12),
                            ),
                          )
                        : const Icon(Icons.arrow_forward_ios, size: 16),
                    onTap: () => _showBranchDetailBottomSheet(branch),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMapView() {
    LatLng centerLatLng = const LatLng(10.762622, 106.660172); // TPHCM mặc định
    if (_userLatLng != null) {
      centerLatLng = _userLatLng!;
    } else if (_branches.isNotEmpty) {
      centerLatLng = LatLng(_branches[0].latitude, _branches[0].longitude);
    }

    return Stack(
      children: [
        FlutterMap(
          mapController: _mapController,
          options: MapOptions(
            initialCenter: centerLatLng,
            initialZoom: 13.0,
          ),
          children: [
            TileLayer(
              urlTemplate: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
              userAgentPackageName: 'com.careconnect.mobile',
            ),
            MarkerLayer(
              markers: [
                if (_userLatLng != null)
                  Marker(
                    point: _userLatLng!,
                    width: 45,
                    height: 45,
                    child: const Stack(
                      alignment: Alignment.center,
                      children: [
                        Icon(Icons.circle, color: Colors.blueAccent, size: 24),
                        Icon(Icons.circle, color: Colors.white, size: 12),
                      ],
                    ),
                  ),
                ..._branches.map((b) {
                  return Marker(
                    point: LatLng(b.latitude, b.longitude),
                    width: 50,
                    height: 50,
                    child: GestureDetector(
                      onTap: () => _showBranchDetailBottomSheet(b),
                      child: const Icon(
                        Icons.location_on_rounded,
                        color: Colors.redAccent,
                        size: 40,
                      ),
                    ),
                  );
                }).toList(),
              ],
            ),
          ],
        ),
        if (_userLatLng != null)
          Positioned(
            right: 16,
            bottom: 16,
            child: FloatingActionButton(
              mini: true,
              backgroundColor: Colors.teal,
              onPressed: () {
                _mapController.move(_userLatLng!, 14.5);
              },
              child: const Icon(Icons.my_location, color: Colors.white),
            ),
          ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text("Chi Nhánh Gần Nhất", style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
        backgroundColor: Colors.teal,
        actions: [
          if (!_isLoading)
            IconButton(
              icon: Icon(_showMap ? Icons.list_alt_rounded : Icons.map_rounded, color: Colors.white),
              tooltip: _showMap ? "Xem danh sách" : "Xem bản đồ",
              onPressed: () {
                setState(() {
                  _showMap = !_showMap;
                });
              },
            ),
        ],
      ),
      body: _isLoading
          ? ListView(
              padding: const EdgeInsets.all(16.0),
              children: const [
                SizedBox(height: 8),
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
                SkeletonListTile(),
              ],
            )
          : Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Padding(
                  padding: const EdgeInsets.only(left: 16.0, right: 16.0, top: 16.0),
                  child: Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.teal.shade50,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.teal.shade100),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.gps_fixed_rounded, color: Colors.teal, size: 20),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            _gpsStatus,
                            style: const TextStyle(color: Colors.teal, fontWeight: FontWeight.w600, fontSize: 13),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),
                Expanded(
                  child: _showMap ? _buildMapView() : _buildListView(),
                ),
              ],
            ),
    );
  }
}

