const { DatabaseSync } = require('node:sqlite');
const fs = require('fs');
const XLSX = require('xlsx');

try {
  // Kết nối database
  const db = new DatabaseSync('d:\\test\\web\\hospital.db');
  const query = db.prepare('SELECT FullName, Role, Specialization, HospitalBranch, Email, PhoneNumber FROM Users');
  const rows = query.all();
  
  // Dữ liệu dòng tiêu đề và nội dung
  const headers = ["Họ và Tên", "Vai trò", "Chuyên khoa", "Chi nhánh", "Email đăng nhập", "Số điện thoại", "Mật khẩu mặc định"];
  const sheetData = [headers];
  
  for (const r of rows) {
    sheetData.push([
      r.FullName || "",
      r.Role || "",
      r.Specialization || "-",
      r.HospitalBranch || "-",
      r.Email || "",
      r.PhoneNumber || "-",
      "123456"
    ]);
  }
  
  // Tạo Workbook và Worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(sheetData);
  
  // Tự động căn chỉnh độ rộng cột theo độ dài chữ
  const maxLens = headers.map((h, i) => {
    return Math.max(h.length, ...sheetData.slice(1).map(row => (row[i] || "").toString().length));
  });
  ws['!cols'] = maxLens.map(len => ({ wch: len + 4 }));
  
  XLSX.utils.book_append_sheet(wb, ws, "Tài khoản CareConnect");
  
  // Ghi ra file XLSX
  XLSX.writeFile(wb, "d:\\test\\web\\CareConnect_Accounts.xlsx");
  console.log("File CareConnect_Accounts.xlsx created successfully!");
} catch (err) {
  console.error("Error generating XLSX file:", err);
}
