class RecordModel {
  final int medicalRecordId;
  final String diagnosis;
  final String treatment;
  final String prescription;
  final String doctorName;
  final String patientName;
  final String recordDate;
  
  // Sinh hiệu liên kết từ cuộc hẹn khám
  final String? bloodPressure;
  final String? temperature;
  final String? weight;
  final String? heartRate;

  // Viện phí thuốc phát sinh
  final double prescriptionFee;
  final String billingStatus;

  RecordModel({
    required this.medicalRecordId,
    required this.diagnosis,
    required this.treatment,
    required this.prescription,
    required this.doctorName,
    required this.patientName,
    required this.recordDate,
    this.bloodPressure,
    this.temperature,
    this.weight,
    this.heartRate,
    this.prescriptionFee = 0.0,
    this.billingStatus = 'Unpaid',
  });

  factory RecordModel.fromJson(Map<String, dynamic> json) {
    return RecordModel(
      medicalRecordId: json['medicalRecordId'] ?? 0,
      diagnosis: json['diagnosis'] ?? '',
      treatment: json['treatment'] ?? '',
      prescription: json['prescription'] ?? '',
      doctorName: json['doctorName'] ?? 'Bác sĩ CareConnect',
      patientName: json['patientName'] ?? 'Bệnh nhân',
      recordDate: json['recordDate'] ?? '',
      bloodPressure: json['bloodPressure'],
      temperature: json['temperature'],
      weight: json['weight'],
      heartRate: json['heartRate'],
      prescriptionFee: (json['prescriptionFee'] as num?)?.toDouble() ?? 0.0,
      billingStatus: json['billingStatus'] ?? 'Unpaid',
    );
  }
}
