class BranchModel {
  final int branchId;
  final String name;
  final String address;
  final double latitude;
  final double longitude;
  double? distanceInKm; // Khoảng cách GPS được tính toán động từ vị trí người dùng

  BranchModel({
    required this.branchId,
    required this.name,
    required this.address,
    required this.latitude,
    required this.longitude,
    this.distanceInKm,
  });

  factory BranchModel.fromJson(Map<String, dynamic> json) {
    return BranchModel(
      branchId: json['branchId'] ?? 0,
      name: json['name'] ?? '',
      address: json['address'] ?? '',
      latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
      longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
    );
  }
}
