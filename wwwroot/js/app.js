const API_BASE = '/api';

// URL token sync helper for mobile webview (especially for cross-origin local testing on Chrome)
const urlParams = new URLSearchParams(window.location.search || (window.location.hash.includes('?') ? window.location.hash.split('?')[1] : ''));
if (urlParams.has('token')) {
    localStorage.setItem('token', urlParams.get('token') || '');
    localStorage.setItem('userRole', urlParams.get('role') || '');
    localStorage.setItem('userName', urlParams.get('name') || '');
    localStorage.setItem('userId', urlParams.get('userId') || '');
}

// State Management
let token = localStorage.getItem('token') || '';
let userRole = localStorage.getItem('userRole') || '';
let userName = localStorage.getItem('userName') || '';
let currentTab = 'appointments'; // Tab hiện tại: appointments | records
let cachedPatientCoords = null;
let isInitializingLocation = false;

const vietnamDivisions = {
    "TP. Hồ Chí Minh": {
        "Quận 1": ["Phường Bến Nghé", "Phường Bến Thành", "Phường Cầu Kho", "Phường Cầu Ông Lãnh", "Phường Cô Giang"],
        "Quận 3": ["Phường Võ Thị Sáu", "Phường 1", "Phường 2", "Phường 3", "Phường 4"],
        "TP. Thủ Đức": ["Phường Bình Thọ", "Phường Hiệp Bình Chánh", "Phường Hiệp Bình Phước", "Phường Linh Đông", "Phường Linh Tây"],
        "Quận 4": [], "Quận 5": [], "Quận 6": [], "Quận 7": [], "Quận 8": [], "Quận 10": [], "Quận 11": [], "Quận 12": [],
        "Quận Bình Thạnh": [], "Quận Bình Tân": [], "Quận Gò Vấp": [], "Quận Phú Nhuận": [],
        "Huyện Bình Chánh": [], "Huyện Cần Giờ": [], "Huyện Củ Chi": [], "Huyện Hóc Môn": [], "Huyện Nhà Bè": [],
        "TP. Vũng Tàu": [], "TP. Bà Rịa": [], "Thị xã Phú Mỹ": [], "Huyện Châu Đức": [], "Huyện Côn Đảo": [], "Huyện Đất Đỏ": [], "Huyện Long Điền": [], "Huyện Xuyên Mộc": [],
        "TP. Thủ Dầu Một": [], "TP. Thuận An": [], "TP. Dĩ An": [], "TP. Tân Uyên": [], "TP. Bến Cát": [], "Huyện Bàu Bàng": [], "Huyện Dầu Tiếng": [], "Huyện Phú Giáo": [], "Huyện Bắc Tân Uyên": []
    },
    "Thành phố Hà Nội": {
        "Quận Hoàn Kiếm": ["Phường Hàng Bạc", "Phường Hàng Bồ", "Phường Hàng Bông", "Phường Hàng Buồm", "Phường Hàng Đào"],
        "Quận Đống Đa": ["Phường Cát Linh", "Phường Hàng Bột", "Phường Khâm Thiên", "Phường Láng Hạ", "Phường Láng Thượng"],
        "Quận Ba Đình": [], "Quận Tây Hồ": [], "Quận Long Biên": [], "Quận Cầu Giấy": [], "Quận Hai Bà Trưng": [], "Quận Hoàng Mai": [], "Quận Thanh Xuân": [], "Quận Nam Từ Liêm": [], "Quận Bắc Từ Liêm": [],
        "Thị xã Sơn Tây": [], "Huyện Ba Vì": [], "Huyện Chương Mỹ": [], "Huyện Đan Phượng": [], "Huyện Đông Anh": [], "Huyện Gia Lâm": [], "Huyện Hoài Đức": [], "Huyện Mê Linh": [], "Huyện Mỹ Đức": [], "Huyện Phú Xuyên": [], "Huyện Phúc Thọ": [], "Huyện Quốc Oai": [], "Huyện Sóc Sơn": [], "Huyện Thạch Thất": [], "Huyện Thanh Oai": [], "Huyện Thanh Trì": [], "Huyện Thường Tín": [], "Huyện Ứng Hòa": []
    },
    "Thành phố Đà Nẵng": {
        "Quận Hải Châu": ["Phường Hải Châu I", "Phường Hải Châu II", "Phường Thạch Thang", "Phường Thanh Bình"],
        "Quận Thanh Khê": ["Phường An Khê", "Phường Chính Gián", "Phường Hòa Khê", "Phường Tam Thuận"],
        "Quận Sơn Trà": [], "Quận Ngũ Hành Sơn": [], "Quận Liên Chiểu": [], "Quận Cẩm Lệ": [], "Huyện Hòa Vang": [], "Huyện Hoàng Sa": [],
        "TP. Tam Kỳ": [], "TP. Hội An": [], "Thị xã Điện Bàn": [], "Huyện Bắc Trà My": [], "Huyện Đại Lộc": [], "Huyện Đông Giang": [], "Huyện Duy Xuyên": [], "Huyện Hiệp Đức": [], "Huyện Nam Giang": [], "Huyện Nam Trà My": [], "Huyện Nông Sơn": [], "Huyện Núi Thành": [], "Huyện Phú Ninh": [], "Huyện Phước Sơn": [], "Huyện Quế Sơn": [], "Huyện Tây Giang": [], "Huyện Thăng Bình": [], "Huyện Tiên Phước": []
    },
    "Thành phố Huế": {
        "TP. Huế": [], "Thị xã Hương Thủy": [], "Thị xã Hương Trà": [], "Huyện Phong Điền": [], "Huyện Quảng Điền": [], "Huyện Phú Vang": [], "Huyện Phú Lộc": [], "Huyện A Lưới": [], "Huyện Nam Đông": []
    },
    "Thành phố Hải Phòng": {
        "Q. Hồng Bàng": [], "Q. Lê Chân": [], "Q. Ngô Quyền": [], "Q. Kiến An": [], "Q. Hải An": [], "Q. Đồ Sơn": [], "Q. Dương Kinh": [], "H. Thuỷ Nguyên": [], "H. An Dương": [], "H. An Lão": [], "H. Kiến Thuỵ": [], "H. Tiên Lãng": [], "H. Vĩnh Bảo": [], "H. Cát Hải": [], "H. Bạch Long Vĩ": [],
        "TP. Hải Dương": [], "TP. Chí Linh": [], "Thị xã Kinh Môn": [], "Huyện Bình Giang": [], "Huyện Cẩm Giàng": [], "Huyện Gia Lộc": [], "Huyện Kim Thành": [], "Huyện Nam Sách": [], "Huyện Ninh Giang": [], "Huyện Thanh Hà": [], "Huyện Thanh Miện": [], "Huyện Tứ Kỳ": []
    },
    "Thành phố Cần Thơ": {
        "Q. Ninh Kiều": [], "Q. Bình Thủy": [], "Q. Cái Răng": [], "Q. Ô Môn": [], "Q. Thốt Nốt": [], "H. Phong Điền": [], "H. Cờ Đỏ": [], "H. Vĩnh Thạnh": [], "H. Thới Lai": [],
        "TP. Sóc Trăng": [], "Thị xã Vĩnh Châu": [], "Thị xã Ngã Năm": [], "Huyện Mỹ Xuyên": [], "Huyện Trần Đề": [], "Huyện Long Phú": [], "Huyện Kế Sách": [], "Huyện Cù Lao Dung": [], "Huyện Mỹ Tú": [], "Huyện Châu Thành": [], "Huyện Thạnh Trị": [],
        "TP. Vị Thanh": [], "TP. Ngã Bảy": [], "Thị xã Long Mỹ": [], "Huyện Vị Thủy": [], "Huyện Phụng Hiệp": []
    },
    "Tỉnh Lai Châu": {
        "TP. Lai Châu": [], "Huyện Mường Tè": [], "Huyện Nậm Nhùn": [], "Huyện Phong Thổ": [], "Huyện Sìn Hồ": [], "Huyện Tam Đường": [], "Huyện Tân Uyên": [], "Huyện Than Uyên": []
    },
    "Tỉnh Điện Biên": {
        "TP. Điện Biên Phủ": [], "Thị xã Mường Lay": [], "Huyện Điện Biên": [], "Huyện Điện Biên Đông": [], "Huyện Mường Ảng": [], "Huyện Mường Chà": [], "Huyện Mường Nhé": [], "Huyện Nậm Pồ": [], "Huyện Tủa Chùa": [], "Huyện Tuần Giáo": []
    },
    "Tỉnh Sơn La": {
        "TP. Sơn La": [], "Huyện Quỳnh Nhai": [], "Huyện Mường La": [], "Huyện Thuận Châu": [], "Huyện Phù Yên": [], "Huyện Bắc Yên": [], "Huyện Mai Sơn": [], "Huyện Sông Mã": [], "Huyện Yên Châu": [], "Huyện Mộc Châu": [], "Huyện Vân Hồ": [], "Huyện Sốp Cộp": []
    },
    "Tỉnh Lạng Sơn": {
        "TP. Lạng Sơn": [], "Huyện Tràng Định": [], "Huyện Bình Gia": [], "Huyện Văn Lãng": [], "Huyện Cao Lộc": [], "Huyện Văn Quan": [], "Huyện Bắc Sơn": [], "Huyện Hữu Lũng": [], "Huyện Chi Lăng": [], "Huyện Lộc Bình": [], "Huyện Đình Lập": []
    },
    "Tỉnh Quảng Ninh": {
        "TP. Hạ Long": [], "TP. Móng Cái": [], "TP. Cẩm Phả": [], "TP. Uông Bí": [], "Thị xã Đông Triều": [], "Thị xã Quảng Yên": [], "Huyện Vân Đồn": [], "Huyện Tiên Yên": [], "Huyện Hải Hà": [], "Huyện Đầm Hà": [], "Huyện Bình Liêu": [], "Huyện Ba Chẽ": [], "Huyện Cô Tô": []
    },
    "Tỉnh Thanh Hoá": {
        "TP. Thanh Hóa": [], "TP. Sầm Sơn": [], "Thị xã Bỉm Sơn": [], "Thị xã Nghi Sơn": [], "Huyện Đông Sơn": [], "Huyện Quảng Xương": [], "Huyện Hoằng Hóa": [], "Huyện Hậu Lộc": [], "Huyện Hà Trung": [], "Huyện Nga Sơn": [], "Huyện Thiệu Hóa": [], "Huyện Triệu Sơn": [], "Huyện Yên Định": [], "Huyện Vĩnh Lộc": [], "Huyện Thọ Xuân": [], "Huyện Thường Xuân": [], "Huyện Như Xuân": [], "Huyện Như Thanh": [], "Huyện Nông Cống": [], "Huyện Ngọc Lặc": [], "Huyện Thạch Thành": [], "Huyện Lang Chánh": [], "Huyện Bá Thước": [], "Huyện Quan Hóa": [], "Huyện Quan Sơn": [], "Huyện Mường Lát": []
    },
    "Tỉnh Nghệ An": {
        "TP. Vinh": [], "Thị xã Cửa Lò": [], "Thị xã Thái Hòa": [], "Thị xã Hoàng Mai": [], "Huyện Kỳ Sơn": [], "Huyện Tương Dương": [], "Huyện Con Cuông": [], "Huyện Anh Sơn": [], "Huyện Tân Kỳ": [], "Huyện Đô Lương": [], "Huyện Thanh Chương": [], "Huyện Diễn Châu": [], "Huyện Yên Thành": [], "Huyện Quỳnh Lưu": [], "Huyện Nghĩa Đàn": [], "Huyện Quỳ Hợp": [], "Huyện Quỳ Châu": [], "Huyện Quế Phong": [], "Huyện Hưng Nguyên": [], "Huyện Nam Đàn": [], "Huyện Nghi Lộc": []
    },
    "Tỉnh Hà Tĩnh": {
        "TP. Hà Tĩnh": [], "Thị xã Hồng Lĩnh": [], "Thị xã Kỳ Anh": [], "Huyện Kỳ Anh": [], "Huyện Cẩm Xuyên": [], "Huyện Thạch Hà": [], "Huyện Lộc Hà": [], "Huyện Can Lộc": [], "Huyện Nghi Xuân": [], "Huyện Đức Thọ": [], "Huyện Hương Sơn": [], "Huyện Hương Khê": [], "Huyện Vũ Quang": []
    },
    "Tỉnh Cao Bằng": {
        "TP. Cao Bằng": [], "Huyện Bảo Lâm": [], "Huyện Bảo Lạc": [], "Huyện Hà Quảng": [], "Huyện Trùng Khánh": [], "Huyện Hạ Lang": [], "Huyện Quảng Hòa": [], "Huyện Hoà An": [], "Huyện Nguyên Bình": [], "Huyện Thạch An": []
    },
    "Tỉnh Tuyên Quang": {
        "TP. Tuyên Quang": [], "Huyện Chiêm Hóa": [], "Huyện Hàm Yên": [], "Huyện Lâm Bình": [], "Huyện Na Hang": [], "Huyện Sơn Dương": [], "Huyện Yên Sơn": [],
        "TP. Hà Giang": [], "Huyện Bắc Mê": [], "Huyện Bắc Quang": [], "Huyện Đồng Văn": [], "Huyện Hoàng Su Phì": [], "Huyện Mèo Vạc": [], "Huyện Quản Bạ": [], "Huyện Quang Bình": [], "Huyện Vị Xuyên": [], "Huyện Xín Mần": [], "Huyện Yên Minh": []
    },
    "Tỉnh Lào Cai": {
        "TP. Lào Cai": [], "Huyện Bảo Thắng": [], "Huyện Bảo Yên": [], "Huyện Bát Xát": [], "Huyện Mường Khương": [], "Huyện Sa Pa": [], "Huyện Si Ma Cai": [], "Huyện Văn Bàn": [], "Huyện Bắc Hà": [],
        "TP. Yên Bái": [], "Thị xã Nghĩa Lộ": [], "Huyện Lục Yên": [], "Huyện Mù Căng Chải": [], "Huyện Trạm Tấu": [], "Huyện Trấn Yên": [], "Huyện Văn Chấn": [], "Huyện Văn Yên": [], "Huyện Yên Bình": []
    },
    "Tỉnh Thái Nguyên": {
        "TP. Thái Nguyên": [], "TP. Sông Công": [], "TP. Phổ Yên": [], "Huyện Đại Từ": [], "Huyện Định Hóa": [], "Huyện Đồng Hỷ": [], "Huyện Phú Bình": [], "Huyện Phú Lương": [], "Huyện Võ Nhai": [],
        "TP. Bắc Kạn": [], "Huyện Ba Bể": [], "Huyện Bạch Thông": [], "Huyện Chợ Đồn": [], "Huyện Chợ Mới": [], "Huyện Na Rì": [], "Huyện Ngân Sơn": [], "Huyện Pác Nặm": []
    },
    "Tỉnh Phú Thọ": {
        "TP. Việt Trì": [], "Thị xã Phú Thọ": [], "Huyện Cẩm Khê": [], "Huyện Đoan Hùng": [], "Huyện Hạ Hòa": [], "Huyện Lâm Thao": [], "Huyện Phù Ninh": [], "Huyện Tam Nông": [], "Huyện Tân Sơn": [], "Huyện Thanh Ba": [], "Huyện Thanh Sơn": [], "Huyện Thanh Thủy": [], "Huyện Yên Lập": [],
        "TP. Vĩnh Yên": [], "TP. Phúc Yên": [], "Huyện Bình Xuyên": [], "Huyện Lập Thạch": [], "Huyện Sông Lô": [], "Huyện Tam Dương": [], "Huyện Tam Đảo": [], "Huyện Vĩnh Tường": [], "Huyện Yên Lạc": [],
        "TP. Hòa Bình": [], "Huyện Cao Phong": [], "Huyện Đà Bắc": [], "Huyện Kim Bôi": [], "Huyện Lạc Sơn": [], "Huyện Lạc Thủy": [], "Huyện Lương Sơn": [], "Huyện Mai Châu": [], "Huyện Tân Lạc": [], "Huyện Yên Thủy": []
    },
    "Tỉnh Bắc Ninh": {
        "TP. Bắc Ninh": [], "Thị xã Từ Sơn": [], "Huyện Gia Bình": [], "Huyện Lương Tài": [], "Huyện Quế Võ": [], "Huyện Thuận Thành": [], "Huyện Tiên Du": [], "Huyện Yên Phong": [],
        "TP. Bắc Giang": [], "Thị xã Việt Yên": [], "Huyện Hiệp Hòa": [], "Huyện Lạng Giang": [], "Huyện Lục Nam": [], "Huyện Lục Ngạn": [], "Huyện Sơn Động": [], "Huyện Tân Yên": [], "Huyện Yên Dũng": [], "Huyện Yên Thế": []
    },
    "Tỉnh Hưng Yên": {
        "TP. Hưng Yên": [], "Thị xã Mỹ Hào": [], "Huyện Ân Thi": [], "Huyện Khoái Châu": [], "Huyện Kim Động": [], "Huyện Phù Cừ": [], "Huyện Tiên Lữ": [], "Huyện Văn Giang": [], "Huyện Văn Lâm": [], "Huyện Yên Mỹ": [],
        "TP. Thái Bình": [], "Huyện Đông Hưng": [], "Huyện Hưng Hà": [], "Huyện Kiến Xương": [], "Huyện Quỳnh Phụ": [], "Huyện Thái Thụy": [], "Huyện Tiền Hải": [], "Huyện Vũ Thư": []
    },
    "Tỉnh Ninh Bình": {
        "TP. Ninh Bình": [], "TP. Tam Điệp": [], "Huyện Gia Viễn": [], "Huyện Hoa Lư": [], "Huyện Kim Sơn": [], "Huyện Nho Quan": [], "Huyện Yên Khánh": [], "Huyện Yên Mô": [],
        "TP. Phủ Lý": [], "Thị xã Duy Tiên": [], "Huyện Kim Bảng": [], "Huyện Lý Nhân": [], "Huyện Thanh Liêm": [], "Huyện Bình Lục": [],
        "TP. Nam Định": [], "Huyện Giao Thủy": [], "Huyện Hải Hậu": [], "Huyện Mỹ Lộc": [], "Huyện Nam Trực": [], "Huyện Nghĩa Hưng": [], "Huyện Trực Ninh": [], "Huyện Vụ Bản": [], "Huyện Xuân Trường": [], "Huyện Ý Yên": []
    },
    "Tỉnh Quảng Trị": {
        "TP. Đông Hà": [], "Thị xã Quảng Trị": [], "Huyện Cam Lộ": [], "Huyện Cồn Cỏ": [], "Huyện Đa Krông": [], "Huyện Gio Linh": [], "Huyện Hải Lăng": [], "Huyện Hướng Hóa": [], "Huyện Triệu Phong": [], "Huyện Vĩnh Linh": [],
        "TP. Đồng Hới": [], "Thị xã Ba Đồn": [], "Huyện Bố Trạch": [], "Huyện Lệ Thủy": [], "Huyện Minh Hóa": [], "Huyện Quảng Ninh": [], "Huyện Quảng Trạch": [], "Huyện Tuyên Hóa": []
    },
    "Tỉnh Quảng Ngãi": {
        "TP. Quảng Ngãi": [], "Thị xã Đức Phổ": [], "Huyện Lý Sơn": [], "Huyện Bình Sơn": [], "Huyện Trà Bồng": [], "Huyện Sơn Tịnh": [], "Huyện Tư Nghĩa": [], "Huyện Sơn Hà": [], "Huyện Sơn Tây": [], "Huyện Minh Long": [], "Huyện Nghĩa Hành": [], "Huyện Mộ Đức": [], "Huyện Ba Tơ": [],
        "TP. Kon Tum": [], "Huyện Đắk Glei": [], "Huyện Đắk Hà": [], "Huyện Đắk Tô": [], "Huyện Ia H'Drai": [], "Huyện Kon Plông": [], "Huyện Kon Rẫy": [], "Huyện Ngọc Hồi": [], "Huyện Sa Thầy": [], "Huyện Tu Mơ Rông": []
    },
    "Tỉnh Gia Lai": {
        "TP. Pleiku": [], "Thị xã An Khê": [], "Thị xã Ayun Pa": [], "Huyện Chư Păh": [], "Huyện Chư Prông": [], "Huyện Chư Sê": [], "Huyện Đăk Đoa": [], "Huyện Đăk Pơ": [], "Huyện Đức Cơ": [], "Huyện Ia Grai": [], "Huyện Ia Pa": [], "Huyện K'Bang": [], "Huyện Kông Chro": [], "Huyện Krông Pa": [], "Huyện Mang Yang": [], "Huyện Phú Thiện": [], "Huyện Chư Pưh": [],
        "TP. Quy Nhơn": [], "Thị xã An Nhơn": [], "Thị xã Hoài Nhơn": [], "Huyện An Lão": [], "Huyện Hoài Ân": [], "Huyện Phù Cát": [], "Huyện Phù Mỹ": [], "Huyện Tuy Phước": [], "Huyện Tây Sơn": [], "Huyện Vân Canh": [], "Huyện Vĩnh Thạnh": []
    },
    "Tỉnh Khánh Hoà": {
        "TP. Nha Trang": [], "TP. Cam Ranh": [], "Thị xã Ninh Hòa": [], "Huyện Vạn Ninh": [], "Huyện Diên Khánh": [], "Huyện Khánh Vĩnh": [], "Huyện Khánh Sơn": [], "Huyện Cam Lâm": [], "Huyện Trường Sa": [],
        "TP. Phan Rang - Tháp Chàm": [], "Huyện Bác Ái": [], "Huyện Ninh Hải": [], "Huyện Ninh Phước": [], "Huyện Ninh Sơn": [], "Huyện Thuận Bắc": [], "Huyện Thuận Nam": []
    },
    "Tỉnh Lâm Đồng": {
        "TP. Đà Lạt": [], "TP. Bảo Lộc": [], "Huyện Bảo Lâm": [], "Huyện Cát Tiên": [], "Huyện Di Linh": [], "Huyện Đạ Huoai": [], "Huyện Đạ Tẻh": [], "Huyện Đơn Dương": [], "Huyện Đức Trọng": [], "Huyện Lạc Dương": [], "Huyện Lâm Hà": [], "Huyện Đam Rông": [],
        "TP. Gia Nghĩa": [], "Huyện Đăk Glong": [], "Huyện Đăk Mil": [], "Huyện Đăk R'Lấp": [], "Huyện Đăk Song": [], "Huyện Cư Jút": [], "Huyện Krông Nô": [], "Huyện Tuy Đức": [],
        "TP. Phan Thiết": [], "Thị xã La Gi": [], "Huyện Tuy Phong": [], "Huyện Bắc Bình": [], "Huyện Hàm Thuận Bắc": [], "Huyện Hàm Thuận Nam": [], "Huyện Tánh Linh": [], "Huyện Đức Linh": [], "Huyện Hàm Tân": [], "Huyện Phú Quý": []
    },
    "Tỉnh Đắk Lắk": {
        "TP. Buôn Ma Thuột": [], "Thị xã Buôn Hồ": [], "Huyện Ea H'leo": [], "Huyện Ea Súp": [], "Huyện Krông Năng": [], "Huyện Krông Búk": [], "Huyện Buôn Đôn": [], "Huyện Cư M'gar": [], "Huyện Ea Kar": [], "Huyện M'Drắk": [], "Huyện Krông Pắc": [], "Huyện Krông Bông": [], "Huyện Krông Ana": [], "Huyện Lắc": [], "Huyện Cư Kuin": [],
        "TP. Tuy Hòa": [], "Thị xã Sông Cầu": [], "Thị xã Đông Hòa": [], "Huyện Đồng Xuân": [], "Huyện Sông Hinh": [], "Huyện Sơn Hòa": [], "Huyện Phú Hòa": [], "Huyện Tây Hòa": [], "Huyện Tuy An": []
    },
    "Tỉnh Đồng Nai": {
        "TP. Biên Hòa": [], "TP. Long Khánh": [], "Huyện Cẩm Mỹ": [], "Huyện Định Quán": [], "Huyện Long Thành": [], "Huyện Nhơn Trạch": [], "Huyện Tân Phú": [], "Huyện Thống Nhất": [], "Huyện Trảng Bom": [], "Huyện Vĩnh Cửu": [], "Huyện Xuân Lộc": [],
        "TP. Đồng Xoài": [], "Thị xã Phước Long": [], "Thị xã Bình Long": [], "Thị xã Chơn Thành": [], "Huyện Đồng Phú": [], "Huyện Bù Đăng": [], "Huyện Bù Đốp": [], "Huyện Bù Gia Mập": [], "Huyện Lộc Ninh": [], "Huyện Hớn Quản": [], "Huyện Phú Riềng": []
    },
    "Tỉnh Tây Ninh": {
        "TP. Tây Ninh": [], "Thị xã Hòa Thành": [], "Thị xã Trảng Bàng": [], "Huyện Bến Cầu": [], "Huyện Châu Thành": [], "Huyện Dương Minh Châu": [], "Huyện Gò Dầu": [], "Huyện Tân Biên": [], "Huyện Tân Châu": [],
        "TP. Tân An": [], "Thị xã Kiến Tường": [], "Huyện Bến Lức": [], "Huyện Cần Đước": [], "Huyện Cần Giuộc": [], "Huyện Châu Thành": [], "Huyện Đức Hòa": [], "Huyện Đức Huệ": [], "Huyện Mộc Hóa": [], "Huyện Tân Hưng": [], "Huyện Tân Thạnh": [], "Huyện Tân Trụ": [], "Huyện Thạnh Hóa": [], "Huyện Thủ Thừa": [], "Huyện Vĩnh Hưng": []
    },
    "Tỉnh Vĩnh Long": {
        "TP. Vĩnh Long": [], "Thị xã Bình Minh": [], "Huyện Long Hồ": [], "Huyện Mang Thít": [], "Huyện Vũng Liêm": [], "Huyện Tam Bình": [], "Huyện Trà Ôn": [], "Huyện Bình Tân": [],
        "TP. Bến Tre": [], "Huyện Ba Tri": [], "Huyện Bình Đại": [], "Huyện Châu Thành": [], "Huyện Chợ Lách": [], "Huyện Giồng Trôm": [], "Huyện Mỏ Cày Bắc": [], "Huyện Mỏ Cày Nam": [], "Huyện Thạnh Phú": [],
        "TP. Trà Vinh": [], "Thị xã Duyên Hải": [], "Huyện Càng Long": [], "Huyện Cầu Kè": [], "Huyện Cầu Ngang": [], "Huyện Châu Thành": [], "Huyện Duyên Hải": [], "Huyện Tiểu Cần": [], "Huyện Trà Cú": []
    },
    "Tỉnh Đồng Tháp": {
        "TP. Cao Lãnh": [], "TP. Sa Đéc": [], "TP. Hồng Ngự": [], "Thị xã Hồng Ngự": [], "Huyện Cao Lãnh": [], "Huyện Châu Thành": [], "Huyện Hồng Ngự": [], "Huyện Lai Vung": [], "Huyện Lấp Vò": [], "Huyện Tam Nông": [], "Huyện Tân Hồng": [], "Huyện Thanh Bình": [], "Huyện Tháp Mười": [],
        "TP. Mỹ Tho": [], "Thị xã Gò Công": [], "Thị xã Cai Lậy": [], "Huyện Cái Bè": [], "Huyện Cai Lậy": [], "Huyện Châu Thành": [], "Huyện Chợ Gạo": [], "Huyện Gò Công Đông": [], "Huyện Gò Công Tây": [], "Huyện Tân Phú Đông": [], "Huyện Tân Phước": []
    },
    "Tỉnh Cà Mau": {
        "TP. Cà Mau": [], "Huyện Cái Nước": [], "Huyện Đầm Dơi": [], "Huyện Năm Căn": [], "Huyện Ngọc Hiển": [], "Huyện Phú Tân": [], "Huyện Thới Bình": [], "Huyện U Minh": [], "Huyện Trần Văn Thời": [],
        "TP. Bạc Liêu": [], "Thị xã Giá Rai": [], "Huyện Hồng Dân": [], "Huyện Hòa Bình": [], "Huyện Phước Long": [], "Huyện Vĩnh Lợi": [], "Huyện Đông Hải": []
    },
    "Tỉnh An Giang": {
        "TP. Long Xuyên": [], "TP. Châu Đốc": [], "Thị xã Tân Châu": [], "Thị xã Tịnh Biên": [], "Huyện An Phú": [], "Huyện Châu Phú": [], "Huyện Châu Thành": [], "Huyện Chợ Mới": [], "Huyện Phú Tân": [], "Huyện Thoại Sơn": [], "Huyện Tri Tôn": [],
        "TP. Rạch Giá": [], "TP. Hà Tiên": [], "TP. Phú Quốc": [], "Huyện Kiên Lương": [], "Huyện Hòn Đất": [], "Huyện Tân Hiệp": [], "Huyện Châu Thành": [], "Huyện Giồng Riềng": [], "Huyện Gò Quao": [], "Huyện An Biên": [], "Huyện An Minh": [], "Huyện Vĩnh Thuận": [], "Huyện U Minh Thượng": [], "Huyện Kiên Hải": [], "Huyện Giang Thành": []
    }
};

const allProvinces = [
    "TP. Hồ Chí Minh",
    "Thành phố Cần Thơ",
    "Thành phố Đà Nẵng",
    "Thành phố Hà Nội",
    "Thành phố Hải Phòng",
    "Thành phố Huế",
    "Tỉnh An Giang",
    "Tỉnh Bắc Ninh",
    "Tỉnh Cà Mau",
    "Tỉnh Cao Bằng",
    "Tỉnh Đắk Lắk",
    "Tỉnh Điện Biên",
    "Tỉnh Đồng Nai",
    "Tỉnh Đồng Tháp",
    "Tỉnh Gia Lai",
    "Tỉnh Hà Tĩnh",
    "Tỉnh Hưng Yên",
    "Tỉnh Khánh Hoà",
    "Tỉnh Lai Châu",
    "Tỉnh Lâm Đồng",
    "Tỉnh Lạng Sơn",
    "Tỉnh Lào Cai",
    "Tỉnh Nghệ An",
    "Tỉnh Ninh Bình",
    "Tỉnh Phú Thọ",
    "Tỉnh Quảng Ngãi",
    "Tỉnh Quảng Ninh",
    "Tỉnh Quảng Trị",
    "Tỉnh Sơn La",
    "Tỉnh Tây Ninh",
    "Tỉnh Thái Nguyên",
    "Tỉnh Thanh Hoá",
    "Tỉnh Tuyên Quang",
    "Tỉnh Vĩnh Long"
];

function populateDistricts(province, districtSelectEl, textEl) {
    if (!districtSelectEl) return;
    
    districtSelectEl.innerHTML = '<option value="" disabled selected>-- Chọn quận/huyện --</option>';
    
    if (textEl) {
        textEl.value = '';
        textEl.style.display = 'none';
        textEl.removeAttribute('required');
    }
    
    districtSelectEl.style.display = 'block';
    districtSelectEl.disabled = true;

    if (!province) return;

    if (vietnamDivisions[province]) {
        const districts = Object.keys(vietnamDivisions[province]);
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d;
            opt.textContent = d;
            districtSelectEl.appendChild(opt);
        });
        districtSelectEl.disabled = false;
        districtSelectEl.setAttribute('required', 'required');
    } else {
        districtSelectEl.style.display = 'none';
        districtSelectEl.removeAttribute('required');
        if (textEl) {
            textEl.style.display = 'block';
            textEl.setAttribute('required', 'required');
        }
    }
}

// Global functions for Registration
window.onRegProvinceChange = function(val) {
    const districtSel = document.getElementById('reg-district');
    const districtText = document.getElementById('reg-district-text');
    populateDistricts(val, districtSel, districtText);
};

// Global functions for Profile
window.onProfileProvinceChange = function(val) {
    const districtSel = document.getElementById('pp-district');
    const districtText = document.getElementById('pp-district-text');
    populateDistricts(val, districtSel, districtText);
};

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const dashboardScreen = document.getElementById('dashboard-screen');
const appHeader = document.getElementById('app-header');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const bookingForm = document.getElementById('booking-form');
const recordForm = document.getElementById('record-form');
const appointmentsContainer = document.getElementById('appointments-list-container');
const bookingSectionWrapper = document.getElementById('booking-section-wrapper');
const appointmentsSectionWrapper = document.getElementById('appointments-section-wrapper');
const dashboardGrid = document.getElementById('dashboard-appointments-grid');
const headerUserName = document.getElementById('header-user-name');
const headerUserRole = document.getElementById('header-user-role');
const avatarIcon = document.getElementById('avatar-icon');
const tabsContainer = document.getElementById('tabs-container');

function initializeProvinceDropdowns() {
    const regProvince = document.getElementById('reg-province');
    const ppProvince = document.getElementById('pp-province');
    
    if (regProvince) {
        while (regProvince.options.length > 1) {
            regProvince.remove(1);
        }
    }
    if (ppProvince) {
        while (ppProvince.options.length > 1) {
            ppProvince.remove(1);
        }
    }

    allProvinces.forEach(p => {
        if (regProvince) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            regProvince.appendChild(opt);
        }
        if (ppProvince) {
            const opt = document.createElement('option');
            opt.value = p;
            opt.textContent = p;
            ppProvince.appendChild(opt);
        }
    });
}

// Initialize App
document.addEventListener('DOMContentLoaded', async () => {
    initializeProvinceDropdowns();
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    setupEventListeners();
    restoreNearbyHospitals();
    checkAuth();
    if (token && userRole === 'Patient') {
        initializePatientLocation();
    }
    initStatsCounter();
    loadFeaturedDoctors();
    initPromoCarousel();
    loadTestimonials();
    await restoreAppState();

    // Hash-based routing: handle direct deep links after state restore
    const _initHash = window.location.hash;
    if (_initHash && _initHash !== '#' && _initHash !== '#/home' && _initHash !== '#/dashboard') {
        handleRouting();
    }

    // Listen for browser back/forward navigation and hash modifications
    window.addEventListener('popstate', handleRouting);
    window.addEventListener('hashchange', handleRouting);
});

// Event Listeners Setup
function setupEventListeners() {
    loginForm.addEventListener('submit', handleLogin);
    registerForm.addEventListener('submit', handleRegister);
    registerForm.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            const step1 = document.getElementById('register-step-1');
            if (step1 && step1.style.display !== 'none') {
                e.preventDefault();
                const btnRegCheckInfo = document.getElementById('btn-reg-check-info');
                if (btnRegCheckInfo) {
                    btnRegCheckInfo.click();
                }
            }
        }
    });

    // Forgot Password Link and Modal Listeners
    const linkForgotPassword = document.getElementById('link-forgot-password');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const btnCloseForgotModal = document.getElementById('btn-close-forgot-modal');
    const btnCancelForgot = document.getElementById('btn-cancel-forgot');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    if (linkForgotPassword && forgotPasswordModal) {
        linkForgotPassword.addEventListener('click', (e) => {
            e.preventDefault();
            forgotPasswordModal.style.display = 'flex';
            // Clear input fields
            document.getElementById('forgot-account').value = '';
            document.getElementById('forgot-nationalid').value = '';
            document.getElementById('forgot-dob').value = '';
            document.getElementById('forgot-newpassword').value = '';
            document.getElementById('forgot-confirmpassword').value = '';
        });
    }

    const closeForgotModal = () => {
        if (forgotPasswordModal) {
            forgotPasswordModal.style.display = 'none';
        }
    };

    if (btnCloseForgotModal) {
        btnCloseForgotModal.addEventListener('click', closeForgotModal);
    }
    if (btnCancelForgot) {
        btnCancelForgot.addEventListener('click', closeForgotModal);
    }

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const accountOrPhone = document.getElementById('forgot-account').value.trim();
            const nationalId = document.getElementById('forgot-nationalid').value.trim();
            const dob = document.getElementById('forgot-dob').value;
            const newPassword = document.getElementById('forgot-newpassword').value;
            const confirmPassword = document.getElementById('forgot-confirmpassword').value;

            if (newPassword.length < 6) {
                showToast('Mật khẩu mới phải có tối thiểu 6 ký tự.', 'warning');
                return;
            }

            if (newPassword !== confirmPassword) {
                showToast('Mật khẩu xác nhận không trùng khớp.', 'warning');
                return;
            }

            const btnSubmit = document.getElementById('btn-submit-forgot');
            btnSubmit.disabled = true;
            btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang khôi phục...';

            try {
                const response = await fetch(`${API_BASE}/auth/reset-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        accountOrPhone,
                        nationalId,
                        dateOfBirth: dob,
                        newPassword
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showToast(data.message || 'Đặt lại mật khẩu thành công!', 'success');
                    closeForgotModal();
                    // Auto-fill login email field
                    document.getElementById('email').value = accountOrPhone;
                    document.getElementById('password').value = '';
                    document.getElementById('password').focus();
                } else {
                    showToast(data.message || 'Khôi phục mật khẩu thất bại.', 'error');
                }
            } catch (err) {
                console.error("Forgot password error:", err);
                showToast('Không thể kết nối đến máy chủ.', 'error');
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<span>Khôi phục mật khẩu</span> <i class="fa-solid fa-key"></i>';
            }
        });
    }

    // Register Wizard Button Listeners
    const btnRegCheckInfo = document.getElementById('btn-reg-check-info');
    if (btnRegCheckInfo) {
        btnRegCheckInfo.addEventListener('click', async () => {
            const fullNameInput = document.getElementById('reg-fullname');
            const usernameInput = document.getElementById('reg-username');
            const nationalIdInput = document.getElementById('reg-national-id');
            const phoneInput = document.getElementById('reg-phone');
            const dobInput = document.getElementById('reg-dob');

            const fullName = fullNameInput.value.trim();
            const username = usernameInput.value.trim();
            const nationalId = nationalIdInput.value.trim();
            const phone = phoneInput.value.trim();
            const dob = dobInput.value;

            if (!fullName) {
                showToast('Vui lòng nhập họ và tên đầy đủ.', 'warning');
                fullNameInput.focus();
                return;
            }
            if (!username) {
                showToast('Vui lòng nhập tên đăng nhập.', 'warning');
                usernameInput.focus();
                return;
            }
            if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
                showToast('Tên đăng nhập chỉ được chứa chữ cái, số, dấu chấm (.) và dấu gạch dưới (_).', 'warning');
                usernameInput.focus();
                return;
            }
            if (username.length < 3) {
                showToast('Tên đăng nhập phải có ít nhất 3 ký tự.', 'warning');
                usernameInput.focus();
                return;
            }
            if (!nationalId || !/^\d{9}$|^\d{12}$/.test(nationalId)) {
                showToast('Vui lòng nhập số CCCD/CMND hợp lệ (9 hoặc 12 chữ số).', 'warning');
                nationalIdInput.focus();
                return;
            }
            if (!phone || !/^\d{9,11}$/.test(phone.replace(/[\s.-]/g, ''))) {
                showToast('Vui lòng nhập số điện thoại hợp lệ.', 'warning');
                phoneInput.focus();
                return;
            }
            if (!dob) {
                showToast('Vui lòng chọn ngày sinh.', 'warning');
                dobInput.focus();
                return;
            }

            // Đối soát cấu trúc CCCD 12 số gắn chip theo quy tắc của Bộ Công An
            if (nationalId.length === 12) {
                // 1. Kiểm tra 3 số đầu (Mã tỉnh thành khai sinh)
                const provinceCode = nationalId.substring(0, 3);
                const validProvinces = [
                    "001", "002", "004", "006", "008", "010", "011", "012", "014", "015",
                    "017", "019", "020", "022", "024", "025", "026", "027", "030", "031",
                    "033", "034", "035", "036", "037", "038", "040", "042", "044", "045",
                    "046", "048", "049", "051", "052", "054", "056", "058", "060", "062",
                    "064", "066", "067", "068", "070", "072", "074", "075", "077", "079",
                    "080", "082", "083", "084", "086", "087", "089", "091", "092", "093",
                    "094", "095", "096"
                ];
                if (!validProvinces.includes(provinceCode)) {
                    showToast('Không xác thực được thông tin. Vui lòng kiểm tra lại!', 'warning');
                    nationalIdInput.focus();
                    return;
                }

                // Lấy năm sinh từ ngày sinh khai báo (dob format: YYYY-MM-DD)
                const dobYear = parseInt(dob.split('-')[0]);
                const currentYear = new Date().getFullYear();
                
                if (dobYear < 1900 || dobYear > currentYear) {
                    showToast('Không xác thực được thông tin. Vui lòng kiểm tra lại!', 'warning');
                    dobInput.focus();
                    return;
                }

                // 2. Kiểm tra số thứ 4 (Mã thế kỷ sinh)
                const centuryDigit = parseInt(nationalId.charAt(3));
                let expected1 = -1, expected2 = -1;
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

                if (centuryDigit !== expected1 && centuryDigit !== expected2) {
                    showToast('Không xác thực được thông tin. Vui lòng kiểm tra lại!', 'warning');
                    nationalIdInput.focus();
                    return;
                }

                // 3. Kiểm tra số thứ 5 và 6 (2 số cuối của năm sinh)
                const yearDigits = (dobYear % 100).toString().padStart(2, '0');
                const cccdYearDigits = nationalId.substring(4, 6);
                if (cccdYearDigits !== yearDigits) {
                    showToast('Không xác thực được thông tin. Vui lòng kiểm tra lại!', 'warning');
                    nationalIdInput.focus();
                    return;
                }
            }

            btnRegCheckInfo.disabled = true;
            btnRegCheckInfo.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
            try {
                // Gọi API xác minh thông tin công dân thực tế
                const verifyRes = await fetch(`${API_BASE}/auth/verify-citizen`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        fullName: fullName,
                        nationalId: nationalId,
                        phoneNumber: phone,
                        dateOfBirth: dob
                    })
                });

                const verifyData = await verifyRes.json();

                if (verifyRes.ok) {
                    showToast(verifyData.message, 'success');

                    // Cập nhật hộp tóm tắt thông tin ở Bước 2
                    document.getElementById('summary-fullname').textContent = fullName;
                    document.getElementById('summary-username').textContent = username;
                    document.getElementById('summary-national-id').textContent = nationalId;
                    document.getElementById('summary-phone').textContent = phone;
                    
                    if (dob) {
                        const parts = dob.split('-');
                        if (parts.length === 3) {
                            document.getElementById('summary-dob').textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        } else {
                            document.getElementById('summary-dob').textContent = dob;
                        }
                    } else {
                        document.getElementById('summary-dob').textContent = '-';
                    }

                    showRegisterStep(2);
                } else {
                    showToast(verifyData.message || 'Thông tin xác thực không hợp lệ.', 'error');
                }
            } catch (err) {
                console.error("Verify citizen error:", err);
                showToast('Không thể kết nối đến máy chủ để xác minh thông tin.', 'error');
            } finally {
                btnRegCheckInfo.disabled = false;
                btnRegCheckInfo.innerHTML = 'Kiểm tra thông tin <i class="fa-solid fa-chevron-right"></i>';
            }
        });
    }

    const btnRegReset = document.getElementById('btn-reg-reset');
    if (btnRegReset) {
        btnRegReset.addEventListener('click', () => {
            document.getElementById('reg-fullname').value = '';
            document.getElementById('reg-username').value = '';
            document.getElementById('reg-national-id').value = '';
            document.getElementById('reg-phone').value = '';
            document.getElementById('reg-dob').value = '';
        });
    }

    const btnRegBack = document.getElementById('btn-reg-back');
    if (btnRegBack) {
        btnRegBack.addEventListener('click', () => {
            showRegisterStep(1);
        });
    }

    bookingForm.addEventListener('submit', handleBooking);
    recordForm.addEventListener('submit', handleCreateRecord);

    // AI chatbot submit
    const aiChatForm = document.getElementById('ai-chat-form');
    if (aiChatForm) aiChatForm.addEventListener('submit', handleAiSubmit);

    // Admin quick register modal
    const adminRegForm = document.getElementById('admin-register-form');
    if (adminRegForm) adminRegForm.addEventListener('submit', handleAdminRegister);

    // Close admin modal on backdrop click
    const adminModal = document.getElementById('admin-register-modal');
    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) closeAdminRegisterModal();
        });
    }

    // Close record modal on backdrop click
    const recordModal = document.getElementById('record-modal');
    if (recordModal) {
        recordModal.addEventListener('click', (e) => {
            if (e.target === recordModal) closeRecordModal();
        });
    }

    // Close package detail modal on backdrop click
    const packageModal = document.getElementById('package-detail-modal');
    if (packageModal) {
        packageModal.addEventListener('click', (e) => {
            if (e.target === packageModal) closePackageDetailModal();
        });
    }

    // Close branch map modal on backdrop click
    const branchMapModal = document.getElementById('branch-map-modal');
    if (branchMapModal) {
        branchMapModal.addEventListener('click', (e) => {
            if (e.target === branchMapModal) closeBranchMapModal();
        });
    }

    // Close booking modal on backdrop click
    const bookingModal = document.getElementById('booking-modal');
    if (bookingModal) {
        bookingModal.addEventListener('click', (e) => {
            if (e.target === bookingModal) closeBookingModal();
        });
    }
    
    const scheduleForm = document.getElementById('schedule-config-form');
    if (scheduleForm) {
        scheduleForm.addEventListener('submit', handleSaveSchedule);
    }

    // Save app state when reloading or navigating away
    window.addEventListener('beforeunload', saveAppState);
    
    const bookingDoctor = document.getElementById('booking-doctor');
    const bookingDate = document.getElementById('booking-date');
    const bookingSpecialty = document.getElementById('booking-specialty');
    if (bookingDoctor) {
        bookingDoctor.addEventListener('change', () => {
            loadAvailableSlots();
            syncBranchWithSelectedDoctor();
        });
    }
    if (bookingDate) bookingDate.addEventListener('change', loadAvailableSlots);
    if (bookingSpecialty) bookingSpecialty.addEventListener('change', onBookingSpecialtyChange);

    const bookingFormEl = document.getElementById('booking-form');
    if (bookingFormEl) {
        bookingFormEl.addEventListener('reset', () => {
            const slotsInteractiveContainer = document.getElementById('booking-slots-interactive-container');
            const slotsMessage = document.getElementById('booking-slots-message');
            const slotsMessageText = document.getElementById('booking-slots-message-text');
            if (slotsInteractiveContainer) slotsInteractiveContainer.style.display = 'none';
            if (slotsMessage) slotsMessage.style.display = 'flex';
            if (slotsMessageText) slotsMessageText.innerText = 'Vui lòng chọn Bác sĩ và Ngày khám để hiển thị ca khám trống.';
        });
    }

    document.getElementById('btn-logout').addEventListener('click', logout);
    
    // Set default date for booking form to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0]; // Không cho chọn ngày quá khứ
    }

    // Auto-priority on DOB changes
    const regDob = document.getElementById('reg-dob');
    if (regDob) {
        regDob.addEventListener('change', (e) => calculateAgeAndTogglePriority(e.target.value, 'reg-is-priority', 'reg-priority-reason-group', 'reg-priority-reason'));
        regDob.addEventListener('input', (e) => calculateAgeAndTogglePriority(e.target.value, 'reg-is-priority', 'reg-priority-reason-group', 'reg-priority-reason'));
    }
    const ppDob = document.getElementById('pp-dob');
    if (ppDob) {
        ppDob.addEventListener('change', (e) => calculateAgeAndTogglePriority(e.target.value, 'pp-is-priority', 'pp-priority-reason-group', 'pp-priority-reason'));
        ppDob.addEventListener('input', (e) => calculateAgeAndTogglePriority(e.target.value, 'pp-is-priority', 'pp-priority-reason-group', 'pp-priority-reason'));
    }
    const walkInDob = document.getElementById('walk-in-new-dob');
    if (walkInDob) {
        walkInDob.addEventListener('change', (e) => {
            calculateAgeAndTogglePriority(e.target.value, 'walk-in-new-ispriority', 'walk-in-priority-reason-group', 'walk-in-new-priorityreason');
            updateWalkInCalculatedFee();
        });
        walkInDob.addEventListener('input', (e) => {
            calculateAgeAndTogglePriority(e.target.value, 'walk-in-new-ispriority', 'walk-in-priority-reason-group', 'walk-in-new-priorityreason');
            updateWalkInCalculatedFee();
        });
    }
    const bookingDob = document.getElementById('booking-dob');
    if (bookingDob) {
        bookingDob.addEventListener('change', (e) => calculateAgeAndTogglePriority(e.target.value, 'booking-ispriority', 'booking-priority-reason-group', 'booking-priorityreason'));
        bookingDob.addEventListener('input', (e) => calculateAgeAndTogglePriority(e.target.value, 'booking-ispriority', 'booking-priority-reason-group', 'booking-priorityreason'));
    }
}

function calculateAgeAndTogglePriority(dobVal, checkboxId, reasonGroupId, reasonInputId) {
    const checkbox = document.getElementById(checkboxId);
    const reasonGroup = document.getElementById(reasonGroupId);
    const reasonInput = document.getElementById(reasonInputId);
    if (!checkbox || !dobVal) return;

    const birthDate = new Date(dobVal);
    if (isNaN(birthDate.getTime())) return;

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }

    if (age >= 75) {
        checkbox.checked = true;
        if (reasonInput) {
            reasonInput.value = "Người cao tuổi (trên 75 tuổi)";
            reasonInput.readOnly = true;
        }
        if (reasonGroup) reasonGroup.style.display = 'block';
    } else if (age < 6) {
        checkbox.checked = true;
        if (reasonInput) {
            reasonInput.value = "Trẻ em dưới 6 tuổi";
            reasonInput.readOnly = true;
        }
        if (reasonGroup) reasonGroup.style.display = 'block';
    } else {
        if (reasonInput && (reasonInput.value === "Người cao tuổi (trên 75 tuổi)" || reasonInput.value === "Trẻ em dưới 6 tuổi")) {
            checkbox.checked = false;
            reasonInput.value = "";
            reasonInput.readOnly = false;
            if (reasonGroup) reasonGroup.style.display = 'none';
        }
    }
}


// Toggle Auth Forms Visibility
function toggleAuthForms(showRegister) {
    const loginCard = document.querySelector('.login-card:not(#register-card)');
    const registerCard = document.getElementById('register-card');
    
    if (showRegister) {
        loginCard.style.display = 'none';
        registerCard.style.display = 'block';
        registerForm.reset();
        showRegisterStep(1);
    } else {
        loginCard.style.display = 'block';
        registerCard.style.display = 'none';
        loginForm.reset();
    }
}

function showRegisterStep(step) {
    const step1 = document.getElementById('register-step-1');
    const step2 = document.getElementById('register-step-2');
    if (!step1 || !step2) return;
    if (step === 1) {
        step1.style.display = 'block';
        step2.style.display = 'none';
    } else {
        step1.style.display = 'none';
        step2.style.display = 'block';
    }
}

// Check Authentication Status
function checkAuth() {
    if (token) {
        // Show/hide guest vs user area on the landing page public header
        const authButtons = document.getElementById('public-auth-buttons');
        const userArea = document.getElementById('public-user-area');
        if (authButtons) authButtons.style.display = 'none';
        if (userArea) {
            userArea.style.display = 'flex';
            
            // Dynamic Dashboard Button Text Optimization in the public landing header
            const dashboardBtn = document.getElementById('public-header-btn-dashboard');
            if (dashboardBtn) {
                if (userRole === 'Patient') {
                    dashboardBtn.innerHTML = `<i class="fa-solid fa-gauge-high"></i> <span class="nav-btn-text">Bảng điều khiển cá nhân</span>`;
                } else if (userRole === 'Doctor') {
                    dashboardBtn.innerHTML = `<i class="fa-solid fa-user-md"></i> <span class="nav-btn-text">Trang quản lý khám</span>`;
                } else if (userRole === 'Admin') {
                    dashboardBtn.innerHTML = `<i class="fa-solid fa-user-shield"></i> <span class="nav-btn-text">Trang quản trị hệ thống</span>`;
                }
            }
        }

        const pubHeaderBooking = document.getElementById('public-header-btn-booking');
        if (pubHeaderBooking) {
            pubHeaderBooking.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        }
        const headerBooking = document.getElementById('header-btn-booking');
        if (headerBooking) {
            headerBooking.style.display = (userRole === 'Patient') ? 'flex' : 'none';
        }
        const checkinBtn = document.getElementById('header-btn-checkin');
        if (checkinBtn) {
            checkinBtn.style.display = (userRole === 'Admin' || userRole === 'Doctor') ? 'flex' : 'none';
        }
        const headerHome = document.getElementById('header-btn-home');
        if (headerHome) {
            headerHome.style.display = (userRole === 'Patient') ? 'flex' : 'none';
        }
        const headerLogo = document.querySelector('#app-header .logo');
        if (headerLogo) {
            if (userRole && userRole !== 'Patient') {
                headerLogo.setAttribute('title', 'Trang tổng quan');
                headerLogo.style.cursor = 'pointer';
                headerLogo.onclick = goToDashboard;
            } else {
                headerLogo.setAttribute('title', 'Về Trang Chủ');
                headerLogo.style.cursor = 'pointer';
                headerLogo.onclick = goToLandingPage;
            }
        }

        // Smart Routing: If staff role, redirect to Dashboard directly. Otherwise, land on Homepage.
        if (userRole && userRole !== 'Patient') {
            goToDashboard();
        } else {
            goToLandingPage();
        }
        
        // Update header details
        headerUserName.innerText = userName;
        headerUserRole.innerText = translateRole(userRole);
        headerUserRole.className = `badge badge-${userRole.toLowerCase()}`;
        
        // Update Avatar Icon based on Role
        if (userRole === 'Doctor') {
            avatarIcon.className = 'fa-solid fa-user-doctor';
        } else if (userRole === 'Admin') {
            avatarIcon.className = 'fa-solid fa-user-shield';
        } else {
            avatarIcon.className = 'fa-solid fa-user';
        }

        // Configure Layout based on Role
        if (userRole === 'Patient') {
            bookingSectionWrapper.style.display = 'block';
            dashboardGrid.classList.add('no-form');
            document.getElementById('list-title').innerText = 'Lịch Hẹn Của Tôi';
            document.getElementById('list-subtitle').innerText = 'Danh sách lịch khám bạn đã đăng ký';
            


            const btnAppointments = document.getElementById('tab-btn-appointments');
            const btnRecords = document.getElementById('tab-btn-records');
            if (btnAppointments) btnAppointments.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Lịch Hẹn Của Tôi';
            if (btnRecords) btnRecords.innerHTML = '<i class="fa-solid fa-file-medical"></i> Hồ Sơ Bệnh Án';

            const recordsTitle = document.querySelector('#tab-records h2');
            if (recordsTitle) recordsTitle.innerText = 'Hồ Sơ Bệnh Án & Đơn Thuốc';
            const recordsSub = document.getElementById('records-subtitle');
            if (recordsSub) recordsSub.innerText = 'Hiển thị lịch sử khám và thông tin đơn thuốc điều trị';
            
            // Show packages tab button for patients
            const btnPackages = document.getElementById('tab-btn-packages');
            if (btnPackages) btnPackages.style.display = 'inline-flex';

            // Show patient profile tab button for patients
            const btnProfile = document.getElementById('tab-btn-profile');
            if (btnProfile) btnProfile.style.display = 'inline-flex';
            
            // Show patient-specific auto-hide settings
            const patientSettings = document.getElementById('patient-appointment-settings');
            if (patientSettings) {
                patientSettings.style.display = 'flex';
                const autoHideWrapper = document.getElementById('auto-hide-controls-wrapper');
                if (autoHideWrapper) autoHideWrapper.style.display = 'flex';
                const btnPatientClear = document.getElementById('btn-patient-clear-hidden');
                if (btnPatientClear) btnPatientClear.style.display = 'inline-flex';
                loadAutoHideSettings();
            }
            // Hide staff-specific elements on patient login
            const staffSettings = document.getElementById('staff-appointment-settings');
            if (staffSettings) staffSettings.style.display = 'none';
            const staffBulkActions = document.getElementById('staff-bulk-actions');
            if (staffBulkActions) staffBulkActions.style.display = 'none';
            const btnReportFolders = document.getElementById('btn-report-folders');
            if (btnReportFolders) btnReportFolders.style.display = 'none';

            initializePatientLocation();
            
            // Apply pending hospital branch selection from landing page if exists
            if (window.pendingBranchFromLanding) {
                openBookingModal();
                const branchSelect = document.getElementById('booking-branch');
                if (branchSelect) {
                    branchSelect.value = window.pendingBranchFromLanding;
                    onBookingBranchChange();
                }
                window.pendingBranchFromLanding = null; // Clear
            }

            loadDoctors();
            loadPatientProfileIntoBookingForm();
            
            // Apply pending booking from specialty modal if exists
            if (window.pendingBookingFromSpecialtyModal) {
                const pending = window.pendingBookingFromSpecialtyModal;
                window.pendingBookingFromSpecialtyModal = null; // Clear
                setTimeout(() => {
                    prefillBookingModal(pending);
                }, 600);
            }
            // Apply pending booking from landing page screening or package if exists
            else if (window.pendingBookingFromLanding) {
                const symptomsInput = document.getElementById('booking-symptoms');
                if (symptomsInput) {
                    const sym = window.pendingBookingFromLanding.symptoms;
                    symptomsInput.value = sym.startsWith('[') ? sym : `[AI Sàng Lọc]: ${sym}`;
                }
                suggestedSpecialization = window.pendingBookingFromLanding.specialty;
                const pendingBranch = window.pendingBookingFromLanding.branch;
                
                setTimeout(() => {
                    openBookingModal();
                    if (pendingBranch) {
                        const branchSelect = document.getElementById('booking-branch');
                        if (branchSelect) {
                            const opts = Array.from(branchSelect.options);
                            const textMatch = opts.find(o => o.text.toLowerCase().includes(pendingBranch.toLowerCase()));
                            if (textMatch) {
                                branchSelect.value = textMatch.value;
                            } else if (branchSelect.options.length > 1) {
                                branchSelect.selectedIndex = 1;
                            }
                            filterDoctorsBySelectedBranch();
                        }
                    }
                    applySuggestedSpec();
                    window.pendingBookingFromLanding = null; // Clear
                }, 600);
            }
            else if (window.pendingBookingMode) {
                const mode = window.pendingBookingMode;
                window.pendingBookingMode = null; // Clear
                setTimeout(() => {
                    openBookingModalWithMode(mode);
                }, 600);
            }
        } else {
            bookingSectionWrapper.style.display = 'none';
            dashboardGrid.classList.add('no-form');
            
            const btnBooking = document.getElementById('tab-btn-booking');
            if (btnBooking) btnBooking.style.display = 'none';

            const btnPackages = document.getElementById('tab-btn-packages');
            if (btnPackages) btnPackages.style.display = 'none';

            const btnProfileTab = document.getElementById('tab-btn-profile');
            if (btnProfileTab) btnProfileTab.style.display = 'inline-flex';
            
            // Hide patient settings panel completely for staff
            const patientSettings = document.getElementById('patient-appointment-settings');
            if (patientSettings) patientSettings.style.display = 'none';

            // Show dedicated staff settings panel
            const staffSettings = document.getElementById('staff-appointment-settings');
            if (staffSettings) {
                staffSettings.style.display = 'flex';
                updateStaffHiddenButtonVisibility();
            }
            
            // Hide staff bulk action panel initially until selections are made
            const staffBulkActions = document.getElementById('staff-bulk-actions');
            if (staffBulkActions) staffBulkActions.style.display = 'none';
            
            const btnReportFolders = document.getElementById('btn-report-folders');
            if (btnReportFolders) btnReportFolders.style.display = 'none';
            
            if (userRole === 'Doctor') {
                document.getElementById('list-title').innerText = 'Lịch Khám Được Chỉ Định';
                document.getElementById('list-subtitle').innerText = 'Danh sách bệnh nhân đăng ký khám với bạn';

                // Customize navigation tabs & page titles for Doctor
                const btnAppointments = document.getElementById('tab-btn-appointments');
                const btnRecords = document.getElementById('tab-btn-records');
                if (btnAppointments) btnAppointments.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Lịch Khám Của Tôi';
                if (btnRecords) btnRecords.innerHTML = '<i class="fa-solid fa-file-medical"></i> Bệnh Án Bệnh Nhân';

                const recordsTitle = document.querySelector('#tab-records h2');
                if (recordsTitle) recordsTitle.innerText = 'Hồ Sơ Bệnh Án Bệnh Nhân';
                const recordsSub = document.getElementById('records-subtitle');
                if (recordsSub) recordsSub.innerText = 'Xem lịch sử khám và lập hồ sơ bệnh án cho bệnh nhân';
            } else {
                document.getElementById('list-title').innerText = 'Toàn Bộ Lịch Khám Hệ Thống';
                document.getElementById('list-subtitle').innerText = 'Bảng điều khiển quản trị viên';

                // Customize navigation tabs & page titles for Admin
                const btnAppointments = document.getElementById('tab-btn-appointments');
                const btnRecords = document.getElementById('tab-btn-records');
                if (btnAppointments) btnAppointments.innerHTML = '<i class="fa-solid fa-calendar-check"></i> Duyệt Lịch Khám';
                if (btnRecords) btnRecords.innerHTML = '<i class="fa-solid fa-file-medical"></i> Quản Lý Bệnh Án';

                const recordsTitle = document.querySelector('#tab-records h2');
                if (recordsTitle) recordsTitle.innerText = 'Bệnh Án Toàn Hệ Thống';
                const recordsSub = document.getElementById('records-subtitle');
                if (recordsSub) recordsSub.innerText = 'Xem và quản lý hồ sơ bệnh án của tất cả bệnh nhân';
            }
        }

        // Configure Admin Elements
        if (userRole === 'Admin') {
            document.getElementById('tab-btn-users').style.display = 'inline-flex';
            document.getElementById('tab-btn-overview').style.display = 'inline-flex';
            document.getElementById('stat-card-patients').style.display = 'flex';
            document.getElementById('stat-card-doctors').style.display = 'flex';
            document.getElementById('stats-container').classList.add('admin-stats');
        } else {
            const btnUsers = document.getElementById('tab-btn-users');
            const btnOverview = document.getElementById('tab-btn-overview');
            const cardPatients = document.getElementById('stat-card-patients');
            const cardDoctors = document.getElementById('stat-card-doctors');
            if (btnUsers) btnUsers.style.display = 'none';
            if (btnOverview) btnOverview.style.display = 'none';
            if (cardPatients) cardPatients.style.display = 'none';
            if (cardDoctors) cardDoctors.style.display = 'none';
            document.getElementById('stats-container').classList.remove('admin-stats');
        }

        // Configure Doctor Elements
        if (userRole === 'Doctor') {
            document.getElementById('tab-btn-schedule').style.display = 'inline-flex';
            const scheduleDateInput = document.getElementById('schedule-date');
            if (scheduleDateInput && !scheduleDateInput.value) {
                scheduleDateInput.value = new Date().toISOString().split('T')[0];
                scheduleDateInput.min = new Date().toISOString().split('T')[0]; // Không chọn ngày quá khứ
            }
            loadDoctorProfileIntoForm();
        } else {
            const btnSchedule = document.getElementById('tab-btn-schedule');
            if (btnSchedule) btnSchedule.style.display = 'none';
        }

        // Centralized Tab Buttons Visibility Configuration based on Role
        const btnAppointments = document.getElementById('tab-btn-appointments');
        const btnBooking = document.getElementById('tab-btn-booking');
        const btnRecords = document.getElementById('tab-btn-records');
        const btnTools = document.getElementById('tab-btn-tools');
        const btnPackages = document.getElementById('tab-btn-packages');
        const btnProfile = document.getElementById('tab-btn-profile');
        const btnSchedule = document.getElementById('tab-btn-schedule');
        const btnVitals = document.getElementById('tab-btn-vitals');
        if (btnVitals) btnVitals.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        const btnUserGuide = document.getElementById('tab-btn-userguide');
        if (btnUserGuide) btnUserGuide.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        const btnUsers = document.getElementById('tab-btn-users');
        const btnOverview = document.getElementById('tab-btn-overview');
        const btnReception = document.getElementById('tab-btn-reception');
        const btnFinance = document.getElementById('tab-btn-finance');

        if (btnAppointments) btnAppointments.style.display = (userRole === 'Patient' || userRole === 'Doctor' || userRole === 'Admin') ? 'inline-flex' : 'none';
        if (btnBooking) btnBooking.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        if (btnRecords) btnRecords.style.display = (userRole === 'Patient' || userRole === 'Doctor' || userRole === 'Admin') ? 'inline-flex' : 'none';
        if (btnTools) btnTools.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        if (btnPackages) btnPackages.style.display = (userRole === 'Patient') ? 'inline-flex' : 'none';
        if (btnProfile) btnProfile.style.display = 'inline-flex'; // All logged in roles see profile tab
        if (btnSchedule) btnSchedule.style.display = (userRole === 'Doctor') ? 'inline-flex' : 'none';
        if (btnUsers) btnUsers.style.display = (userRole === 'Admin') ? 'inline-flex' : 'none';
        if (btnOverview) btnOverview.style.display = (userRole === 'Admin') ? 'inline-flex' : 'none';
        if (btnReception) btnReception.style.display = (userRole === 'Receptionist') ? 'inline-flex' : 'none';
        if (btnFinance) btnFinance.style.display = (userRole === 'Finance') ? 'inline-flex' : 'none';
        const btnPharmacist = document.getElementById('tab-btn-pharmacist');
        const btnLabtech = document.getElementById('tab-btn-labtech');
        if (btnPharmacist) btnPharmacist.style.display = (userRole === 'Pharmacist') ? 'inline-flex' : 'none';
        if (btnLabtech) btnLabtech.style.display = (userRole === 'LabTechnician') ? 'inline-flex' : 'none';

        // Switch to default tab — Admin: overview, Receptionist: reception, Finance: finance, Pharmacist: pharmacist, LabTechnician: labtech, Doctor/Patient: appointments
        let defaultTab = 'appointments';
        if (userRole === 'Admin') defaultTab = 'overview';
        else if (userRole === 'Receptionist') defaultTab = 'reception';
        else if (userRole === 'Finance') defaultTab = 'finance';
        else if (userRole === 'Pharmacist') defaultTab = 'pharmacist';
        else if (userRole === 'LabTechnician') defaultTab = 'labtech';
        
        // Hide stats summary container for Receptionist, Finance, Pharmacist, Labtech (they don't use appointment stats)
        const statsContainer = document.getElementById('stats-container');
        if (statsContainer) {
            statsContainer.style.display = (userRole === 'Patient' || userRole === 'Doctor' || userRole === 'Admin') ? 'grid' : 'none';
        }
        
        switchTab(defaultTab);
    } else {
        // Show Landing Page by default when not logged in
        showLandingPage();
        const headerBooking = document.getElementById('header-btn-booking');
        if (headerBooking) headerBooking.style.display = 'none';
        const checkinBtn = document.getElementById('header-btn-checkin');
        if (checkinBtn) checkinBtn.style.display = 'none';
    }
    updateTestimonialFormPrefill();
}

// Helper: Force scroll window to the very top, overcoming any dynamic layout recalculation lag or browser clamping
function forceScrollToTop() {
    window.scrollTo({ top: 0, behavior: 'instant' });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    
    // Run multiple times at different intervals to ensure any dynamic rendering/animations don't offset the scroll
    let count = 0;
    const interval = setInterval(() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        count++;
        if (count >= 12) { // 12 times * 50ms = 600ms, covering all fade in & slide down animations (0.4s-0.5s)
            clearInterval(interval);
        }
    }, 50);
}

// Toggle between Landing Page and Auth (Login/Register) Screen
// ===== HASH-BASED SPA ROUTER =====

/**
 * Updates the URL hash via pushState (no hashchange event triggered).
 * Also updates the active state of the public navigation bar.
 */
function updateAppHash(hash) {
    if (window.location.hash !== hash) {
        history.pushState(null, '', hash);
    }
}

/**
 * Highlights the correct public nav link. Pass null to clear all active states.
 */
function setActivePublicNavLink(activeId) {
    document.querySelectorAll('.public-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    if (activeId) {
        const el = document.getElementById(activeId);
        if (el) el.classList.add('active');
    }
}

/**
 * Central SPA router — reads window.location.hash and shows the matching screen.
 * Called on popstate (browser back/forward) and on initial deep-link load.
 */
function handleRouting() {
    const hash = window.location.hash || '#/home';
    if (hash === '#/dashboard') {
        if (token) goToDashboard();
        else showAuthScreen(false);
    } else if (hash === '#/login') {
        showAuthScreen(false);
    } else if (hash === '#/register') {
        showAuthScreen(true);
    } else if (hash.startsWith('#/ai-tools')) {
        const sub = hash.replace('#/ai-tools', '').replace(/^\//, '') || 'bmi';
        showAiToolsScreen(sub);
    } else if (hash === '#/hospitals') {
        showHospitalSystemScreen();
    } else if (hash === '#/knowledge') {
        showKnowledgeScreen();
    } else {
        // #/home or any unrecognised hash
        if (token) {
            goToLandingPage();
        } else {
            showLandingPage();
        }
    }
}

// ===== END HASH-BASED SPA ROUTER =====

function showLandingPage() {
    // Show news sidebar for landing page
    document.body.classList.remove('no-sidebars');

    document.getElementById('landing-screen').style.display = 'flex';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('public-header').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('app-header').style.display = 'none';
    
    // Hide new standalone screens
    const aiTools = document.getElementById('ai-tools-screen');
    const hospScreen = document.getElementById('hospitals-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (hospScreen) hospScreen.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Show public footer
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';
    
    // Initialize default tool on landing page
    selectLandingTool('bmi');
    
    // Load dynamic trending medical news
    loadTrendingNews();
    initPromoCarousel();

    // Update URL hash and active nav
    updateAppHash('#/home');
    setActivePublicNavLink('pub-nav-home');

    forceScrollToTop();
}

function showAuthScreen(showRegister = false) {
    // Hide sidebars for auth screen
    document.body.classList.add('no-sidebars');

    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('public-header').style.display = 'flex';
    document.getElementById('dashboard-screen').style.display = 'none';
    document.getElementById('app-header').style.display = 'none';
    
    // Hide new standalone screens
    const aiTools = document.getElementById('ai-tools-screen');
    const hospScreen = document.getElementById('hospitals-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (hospScreen) hospScreen.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Show public footer
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';

    toggleAuthForms(showRegister);

    // Update URL hash
    updateAppHash(showRegister ? '#/register' : '#/login');
    setActivePublicNavLink(null);

    forceScrollToTop();
}

function handleHeroBookingClick() {
    if (!token) {
        window.pendingBookingMode = 'clinic';
        showAuthScreen(false);
    } else {
        if (userRole === 'Patient') {
            openBookingModalWithMode('clinic');
        } else if (userRole === 'Doctor' || userRole === 'Admin') {
            goToDashboard();
            showToast(`Bạn đang đăng nhập với vai trò ${translateRole(userRole)}. Chuyển đến trang quản lý của bạn.`, 'info');
        }
    }
}

function scrollToSection(sectionId) {
    if (sectionId === 'landing-tools') {
        showAiToolsScreen('bmi');
        return;
    }
    if (sectionId === 'landing-hospitals') {
        showHospitalSystemScreen();
        return;
    }
    if (document.getElementById('landing-screen').style.display === 'none') {
        showLandingPage();
    }
    const element = document.getElementById(sectionId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

// Handle Manual Login
async function handleLogin(e) {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            if (document.activeElement) {
                document.activeElement.blur();
            }
            saveSession(data.token, data.role, data.fullName || email.split('@')[0], data.userId, data.email);
            showToast('Đăng nhập thành công!', 'success');
            checkAuth();
        } else {
            showToast(data.message || 'Email hoặc mật khẩu không đúng.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    }
}

// Handle Register Submission
async function handleRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim();
    const email = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const role = 'Patient';

    const phone = document.getElementById('reg-phone').value.trim();
    const dob = document.getElementById('reg-dob').value;
    const gender = document.getElementById('reg-gender').value;
    const nationalId = document.getElementById('reg-national-id')?.value.trim();
    const ethnicity = document.getElementById('reg-ethnicity')?.value || '';
    const occupation = document.getElementById('reg-occupation')?.value || '';
    const province = document.getElementById('reg-province')?.value || '';
    const regDistrictSel = document.getElementById('reg-district');
    const district = ((regDistrictSel && regDistrictSel.style.display !== 'none') ? regDistrictSel.value : document.getElementById('reg-district-text')?.value || '').trim();
    const addressDetail = document.getElementById('reg-address-detail')?.value.trim();
    const patientType = document.getElementById('reg-patient-type')?.value || 'Service';
    const insuranceCard = document.getElementById('reg-insurance-card')?.value.trim();
    const serviceTier = document.getElementById('reg-service-tier')?.value || 'Standard';
    const isPriority = document.getElementById('reg-is-priority')?.checked || false;
    const priorityReason = (document.getElementById('reg-priority-reason')?.value || '').trim();

    // Validate Step 1 fields
    if (!fullName) {
        showToast('Vui lòng quay lại Bước 1 và nhập họ tên đầy đủ.', 'warning');
        showRegisterStep(1);
        return;
    }
    if (!username) {
        showToast('Vui lòng quay lại Bước 1 và nhập tên đăng nhập.', 'warning');
        showRegisterStep(1);
        return;
    }
    if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
        showToast('Vui lòng quay lại Bước 1 và nhập tên đăng nhập hợp lệ.', 'warning');
        showRegisterStep(1);
        return;
    }
    if (!nationalId || !/^\d{9}$|^\d{12}$/.test(nationalId)) {
        showToast('Vui lòng quay lại Bước 1 và nhập số CCCD/CMND hợp lệ (9 hoặc 12 chữ số).', 'warning');
        showRegisterStep(1);
        return;
    }
    if (!phone || !/^\d{9,11}$/.test(phone.replace(/[\s.-]/g, ''))) {
        showToast('Vui lòng quay lại Bước 1 và nhập số điện thoại hợp lệ.', 'warning');
        showRegisterStep(1);
        return;
    }
    if (!dob) {
        showToast('Vui lòng quay lại Bước 1 và nhập ngày sinh.', 'warning');
        showRegisterStep(1);
        return;
    }

    // Validate Step 2 fields
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        showToast('Định dạng Email không hợp lệ.', 'warning');
        document.getElementById('reg-email').focus();
        return;
    }
    if (!password || password.length < 6) {
        showToast('Vui lòng nhập mật khẩu tối thiểu 6 ký tự.', 'warning');
        document.getElementById('reg-password').focus();
        return;
    }
    if (!province) {
        showToast('Vui lòng chọn tỉnh/thành phố.', 'warning');
        document.getElementById('reg-province').focus();
        return;
    }
    if (!district) {
        showToast('Vui lòng chọn quận/huyện.', 'warning');
        if (regDistrictSel && regDistrictSel.style.display !== 'none') {
            regDistrictSel.focus();
        } else {
            document.getElementById('reg-district-text')?.focus();
        }
        return;
    }
    if (!ethnicity) {
        showToast('Vui lòng chọn dân tộc.', 'warning');
        document.getElementById('reg-ethnicity').focus();
        return;
    }
    if (!occupation) {
        showToast('Vui lòng chọn nghề nghiệp.', 'warning');
        document.getElementById('reg-occupation').focus();
        return;
    }
    if (patientType === 'Insurance' && !insuranceCard) {
        showToast('Vui lòng nhập số thẻ BHYT.', 'warning');
        document.getElementById('reg-insurance-card').focus();
        return;
    }

    const payload = { fullName, username, email, password, role };

    if (phone) payload.phoneNumber = phone;
    if (dob) payload.dateOfBirth = dob;
    if (gender) payload.gender = gender;
    if (nationalId) payload.nationalId = nationalId;
    if (ethnicity) payload.ethnicity = ethnicity;
    if (occupation) payload.occupation = occupation;
    if (province) payload.province = province;
    if (district) payload.district = district;
    if (addressDetail) payload.addressDetail = addressDetail;
    payload.patientType = patientType;
    if (patientType === 'Insurance' && insuranceCard) payload.insuranceCardNumber = insuranceCard;
    payload.serviceTier = serviceTier;
    payload.isPriority = isPriority;
    if (isPriority && priorityReason) payload.priorityReason = priorityReason;

    const btnSubmit = document.getElementById('btn-submit-register');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng ký...';

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Đăng ký tài khoản thành công! Đang tự động đăng nhập...', 'success');
            
            try {
                // Tự động gửi yêu cầu đăng nhập bằng thông tin vừa đăng ký
                const loginRes = await fetch(`${API_BASE}/auth/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: username || email, password: password })
                });
                
                const loginData = await loginRes.json();
                
                if (loginRes.ok) {
                    saveSession(
                        loginData.token, 
                        loginData.role, 
                        loginData.fullName || (username || email).split('@')[0], 
                        loginData.userId, 
                        loginData.email
                    );
                    localStorage.setItem('just_registered', 'true');
                    showToast('Đăng nhập thành công!', 'success');
                    checkAuth();
                } else {
                    // Fallback chuyển về màn hình đăng nhập nếu tự động đăng nhập thất bại
                    showAuthScreen(false);
                    document.getElementById('email').value = username || email;
                    document.getElementById('password').value = '';
                }
            } catch (loginErr) {
                console.error("Auto login error:", loginErr);
                showAuthScreen(false);
                document.getElementById('email').value = username || email;
                document.getElementById('password').value = '';
            }
        } else {
            showToast(data.message || 'Đăng ký tài khoản thất bại.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<span>Đăng ký tài khoản</span> <i class="fa-solid fa-user-plus"></i>';
    }
}

// Show/hide BHYT card input based on patient type selection
function onPatientTypeChange(value) {
    const insuranceGroup = document.getElementById('reg-insurance-group');
    if (insuranceGroup) {
        insuranceGroup.style.display = (value === 'Insurance') ? 'block' : 'none';
        const cardInput = document.getElementById('reg-insurance-card');
        if (cardInput) cardInput.required = (value === 'Insurance');
    }
}

// Quick Login Helper
function quickLogin(roleType, selectedEmail) {
    let email = '';
    if (roleType === 'patient') {
        email = selectedEmail || document.getElementById('quick-patient-select')?.value || 'patient@hospital.com';
    } else if (roleType === 'doctor') {
        email = selectedEmail || document.getElementById('quick-doctor-select')?.value || 'doctor@hospital.com';
    } else if (roleType === 'admin') {
        email = selectedEmail || document.getElementById('quick-admin-select')?.value || 'admin@hospital.com';
    } else if (roleType === 'receptionist') {
        email = selectedEmail || document.getElementById('quick-receptionist-select')?.value || 'reception@hospital.com';
    } else if (roleType === 'finance') {
        email = selectedEmail || document.getElementById('quick-finance-select')?.value || 'finance@hospital.com';
    } else if (roleType === 'pharmacist') {
        email = selectedEmail || document.getElementById('quick-pharmacist-select')?.value || 'pharmacist@hospital.com';
    } else if (roleType === 'labtech') {
        email = selectedEmail || document.getElementById('quick-labtech-select')?.value || 'labtech@hospital.com';
    }

    document.getElementById('email').value = email;
    document.getElementById('password').value = '123456';
    
    // Auto-trigger submit
    loginForm.dispatchEvent(new Event('submit'));
}

// Save Session details
function saveSession(jwtToken, role, name, userId, email) {
    token = jwtToken;
    userRole = role;
    userName = name.charAt(0).toUpperCase() + name.slice(1);
    
    localStorage.setItem('token', token);
    localStorage.setItem('userRole', userRole);
    localStorage.setItem('userName', userName);
    if (userId) localStorage.setItem('userId', userId);
    if (email) localStorage.setItem('userEmail', email);
    cachedPatientCoords = null;
}

// Logout
function logout() {
    token = '';
    userRole = '';
    userName = '';
    localStorage.clear();
    cachedPatientCoords = null;
    
    // Reset guest public header state
    const authButtons = document.getElementById('public-auth-buttons');
    const userArea = document.getElementById('public-user-area');
    if (authButtons) authButtons.style.display = 'flex';
    if (userArea) userArea.style.display = 'none';

    showToast('Đã đăng xuất.', 'success');
    checkAuth();
}

// Load Patient Profile administrative fields into Booking Form
async function loadPatientProfileIntoBookingForm() {
    if (userRole !== 'Patient') return;
    window.loadProfilePromise = (async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const profile = await response.json();
                if (profile.phoneNumber) document.getElementById('booking-phone').value = profile.phoneNumber;
                if (profile.dateOfBirth) {
                    document.getElementById('booking-dob').value = profile.dateOfBirth.split('T')[0];
                }
                if (profile.gender) document.getElementById('booking-gender').value = profile.gender;
                if (profile.bloodType) document.getElementById('booking-bloodtype').value = profile.bloodType;
                if (profile.address) document.getElementById('booking-address').value = profile.address;
                
                // Prefill BHYT, Patient Type and CCCD
                if (profile.nationalId) document.getElementById('booking-nationalid').value = profile.nationalId;
                if (profile.patientType) {
                    document.getElementById('booking-patienttype').value = profile.patientType;
                    onBookingPatientTypeChange(profile.patientType);
                }
                if (profile.insuranceCardNumber) document.getElementById('booking-insurancecardnumber').value = profile.insuranceCardNumber;
                if (document.getElementById('booking-servicetier')) {
                    document.getElementById('booking-servicetier').value = profile.serviceTier || 'Standard';
                }
                const isPriorityCb = document.getElementById('booking-ispriority');
                if (isPriorityCb) {
                    isPriorityCb.checked = !!profile.isPriority;
                    document.getElementById('booking-priority-reason-group').style.display = isPriorityCb.checked ? 'block' : 'none';
                }
                if (document.getElementById('booking-priorityreason')) {
                    document.getElementById('booking-priorityreason').value = profile.priorityReason || '';
                }

                // Auto-collapse administrative fields container if they are all set
                const hasPhone = !!profile.phoneNumber;
                const hasDob = !!profile.dateOfBirth;
                const hasGender = !!profile.gender;
                const hasAddress = !!profile.address;
                const hasNationalId = !!profile.nationalId;
                const hasPatientType = !!profile.patientType;
                const fieldsDiv = document.getElementById('booking-patient-info-fields');
                const arrow = document.getElementById('profile-collapse-arrow');
                if (fieldsDiv && arrow) {
                    if (hasPhone && hasDob && hasGender && hasAddress && hasNationalId) {
                        fieldsDiv.style.display = 'none';
                        arrow.style.transform = 'rotate(0deg)';
                    } else {
                        fieldsDiv.style.display = 'block';
                        arrow.style.transform = 'rotate(180deg)';
                    }
                }
            }
        } catch (error) {
            console.error("Lỗi tải thông tin hồ sơ bệnh nhân:", error);
        }
    })();
    return window.loadProfilePromise;
}

// ── Patient Profile Tab ─────────────────────────────────────────────────────
// Load patient profile data into the dedicated "Thông Tin Cá Nhân" tab
async function loadPatientProfileTab() {
    if (userRole !== 'Patient' && userRole !== 'Doctor' && userRole !== 'Admin' && userRole !== 'Receptionist') return;
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        const profile = await response.json();

        // Avatar initials
        const avatarEl = document.getElementById('patient-profile-avatar-circle');
        if (avatarEl) {
            const initials = (profile.fullName || userName || '?')
                .split(' ').filter(Boolean)
                .map(w => w[0].toUpperCase()).slice(0, 2).join('');
            avatarEl.textContent = initials;
            if (userRole === 'Doctor') {
                avatarEl.style.background = 'linear-gradient(135deg, hsl(210, 80%, 45%), hsl(230, 85%, 50%))';
                avatarEl.style.boxShadow = '0 4px 16px rgba(13, 110, 253, 0.25)';
            } else if (userRole === 'Admin') {
                avatarEl.style.background = 'linear-gradient(135deg, hsl(280, 75%, 45%), hsl(300, 80%, 50%))';
                avatarEl.style.boxShadow = '0 4px 16px rgba(111, 66, 193, 0.25)';
            } else if (userRole === 'Receptionist') {
                avatarEl.style.background = 'linear-gradient(135deg, hsl(35, 80%, 45%), hsl(45, 85%, 50%))';
                avatarEl.style.boxShadow = '0 4px 16px rgba(253, 126, 20, 0.25)';
            } else {
                avatarEl.style.background = 'linear-gradient(135deg, hsl(175, 65%, 40%), hsl(195, 70%, 45%))';
                avatarEl.style.boxShadow = '0 4px 16px rgba(0, 150, 130, 0.25)';
            }
        }
        // Update role badge based on userRole
        const roleBadge = document.getElementById('patient-profile-role-badge');
        if (roleBadge) {
            if (userRole === 'Doctor') {
                roleBadge.textContent = 'Bác sĩ';
                roleBadge.className = 'badge badge-doctor';
            } else if (userRole === 'Admin') {
                roleBadge.textContent = 'Quản trị viên';
                roleBadge.className = 'badge badge-admin';
            } else if (userRole === 'Receptionist') {
                roleBadge.textContent = 'Nhân viên tiếp đón';
                roleBadge.className = 'badge badge-receptionist';
            } else {
                roleBadge.textContent = 'Bệnh nhân';
                roleBadge.className = 'badge badge-patient';
            }
        }
        // Display name & email header
        const displayName = document.getElementById('patient-profile-display-name');
        if (displayName) displayName.textContent = profile.fullName || userName || '--';
        const displayEmail = document.getElementById('patient-profile-display-email');
        if (displayEmail) displayEmail.innerHTML = `<i class="fa-solid fa-envelope"></i> ${profile.email || '--'}`;
        // Security section email
        const secEmail = document.getElementById('pp-security-email');
        if (secEmail) secEmail.textContent = profile.email || '--';

        // Fill form fields
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
        set('pp-fullname', profile.fullName);
        set('pp-phone', profile.phoneNumber);
        set('pp-gender', profile.gender);
        set('pp-bloodtype', profile.bloodType);
        set('pp-email', profile.email);
        set('pp-nationalid', profile.nationalId);
        set('pp-ethnicity', profile.ethnicity);
        set('pp-occupation', profile.occupation);

        if (profile.province) {
            set('pp-province', profile.province);
            const districtSel = document.getElementById('pp-district');
            const districtText = document.getElementById('pp-district-text');
            
            populateDistricts(profile.province, districtSel, districtText);
            
            if (vietnamDivisions[profile.province]) {
                if (profile.district) {
                    set('pp-district', profile.district);
                }
            } else {
                if (profile.district) {
                    set('pp-district-text', profile.district);
                }
            }
        }
        set('pp-address-detail', profile.addressDetail);
        if (profile.dateOfBirth) {
            const dobEl = document.getElementById('pp-dob');
            if (dobEl) dobEl.value = profile.dateOfBirth.split('T')[0];
        }

        // Show/hide classification sections based on role
        const patientClass = document.getElementById('pp-patient-classification');
        const doctorClass = document.getElementById('pp-doctor-classification');
        if (userRole === 'Patient') {
            if (patientClass) patientClass.style.display = 'block';
            if (doctorClass) doctorClass.style.display = 'none';
            // Populate PatientType + Insurance
            const ptSelect = document.getElementById('pp-patient-type');
            if (ptSelect) {
                ptSelect.value = profile.patientType || 'Service';
                onProfilePatientTypeChange(ptSelect.value);
            }
            if (profile.insuranceCardNumber) {
                const icInput = document.getElementById('pp-insurance-card');
                if (icInput) icInput.value = profile.insuranceCardNumber;
            }
            if (document.getElementById('pp-service-tier')) {
                document.getElementById('pp-service-tier').value = profile.serviceTier || 'Standard';
            }
            const isPriorityCb = document.getElementById('pp-is-priority');
            if (isPriorityCb) {
                isPriorityCb.checked = !!profile.isPriority;
                document.getElementById('pp-priority-reason-group').style.display = isPriorityCb.checked ? 'block' : 'none';
            }
            if (document.getElementById('pp-priority-reason')) {
                document.getElementById('pp-priority-reason').value = profile.priorityReason || '';
                // Nếu là đối tượng ưu tiên theo tuổi thì chỉ đọc
                const age = profile.dateOfBirth ? (new Date().getFullYear() - new Date(profile.dateOfBirth).getFullYear()) : 30;
                if (age >= 75 || age < 6) {
                    document.getElementById('pp-priority-reason').readOnly = true;
                } else {
                    document.getElementById('pp-priority-reason').readOnly = false;
                }
            }
        } else if (userRole === 'Doctor') {
            if (patientClass) patientClass.style.display = 'none';
            if (doctorClass) doctorClass.style.display = 'block';
            // Populate Degree
            const degSelect = document.getElementById('pp-degree');
            if (degSelect) degSelect.value = profile.degree || '';
        } else {
            if (patientClass) patientClass.style.display = 'none';
            if (doctorClass) doctorClass.style.display = 'none';
        }
    } catch (error) {
        console.error('Lỗi tải hồ sơ bệnh nhân:', error);
        showToast('Không thể tải thông tin hồ sơ. Vui lòng thử lại.', 'error');
    }
}

// Toggle BHYT input inside profile tab
function onProfilePatientTypeChange(value) {
    const grp = document.getElementById('pp-insurance-group');
    if (grp) grp.style.display = (value === 'Insurance') ? 'block' : 'none';
}

// Save patient profile from the dedicated profile tab
async function savePatientProfile(event) {
    event.preventDefault();
    const saveBtn = document.getElementById('pp-save-btn');
    if (saveBtn) { saveBtn.disabled = true; saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...'; }

    const fullName = (document.getElementById('pp-fullname')?.value || '').trim();
    const phone    = (document.getElementById('pp-phone')?.value || '').trim();
    const gender   = document.getElementById('pp-gender')?.value || '';
    const bloodType = document.getElementById('pp-bloodtype')?.value || '';
    const dobRaw   = document.getElementById('pp-dob')?.value || '';
    const nationalId = (document.getElementById('pp-nationalid')?.value || '').trim();

    const province = document.getElementById('pp-province')?.value || '';
    const ppDistrictSel = document.getElementById('pp-district');
    const district = ((ppDistrictSel && ppDistrictSel.style.display !== 'none') ? ppDistrictSel.value : document.getElementById('pp-district-text')?.value || '').trim();
    const addressDetail = (document.getElementById('pp-address-detail')?.value || '').trim();
    const ethnicity = document.getElementById('pp-ethnicity')?.value || '';
    const occupation = document.getElementById('pp-occupation')?.value || '';

    const body = {
        fullName,
        phoneNumber: phone || null,
        gender: gender || null,
        bloodType: bloodType || null,
        dateOfBirth: dobRaw ? new Date(dobRaw).toISOString() : null,
        nationalId: nationalId || null,
        province: province || null,
        district: district || null,
        addressDetail: addressDetail || null,
        ethnicity: ethnicity || null,
        occupation: occupation || null
    };

    // Append classification fields based on role
    if (userRole === 'Patient') {
        body.patientType = document.getElementById('pp-patient-type')?.value || 'Service';
        if (body.patientType === 'Insurance') {
            body.insuranceCardNumber = (document.getElementById('pp-insurance-card')?.value || '').trim() || null;
        } else {
            body.insuranceCardNumber = null;
        }
        body.serviceTier = document.getElementById('pp-service-tier')?.value || 'Standard';
        body.isPriority = document.getElementById('pp-is-priority')?.checked || false;
        body.priorityReason = (document.getElementById('pp-priority-reason')?.value || '').trim() || null;
    } else if (userRole === 'Doctor') {
        body.degree = document.getElementById('pp-degree')?.value || null;
        // Also preserve specialization & hospitalBranch
        body.specialization = (document.getElementById('pp-specialization')?.value || '').trim() || null;
        body.hospitalBranch = (document.getElementById('pp-hospital-branch')?.value || '').trim() || null;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify(body)
        });
        const data = await response.json();
        if (response.ok) {
            // Update local userName
            userName = fullName;
            localStorage.setItem('userName', fullName);
            headerUserName.innerText = fullName;
            // Refresh avatar display name
            const displayName = document.getElementById('patient-profile-display-name');
            if (displayName) displayName.textContent = fullName;
            const avatarEl = document.getElementById('patient-profile-avatar-circle');
            if (avatarEl) {
                const initials = fullName.split(' ').filter(Boolean).map(w => w[0].toUpperCase()).slice(0, 2).join('');
                avatarEl.textContent = initials;
            }
            // Also refresh booking form profile fields
            loadPatientProfileIntoBookingForm();
            cachedPatientCoords = null;
            localStorage.removeItem('lastLocalizedAddress');
            initializePatientLocation();
            showToast('Cập nhật thông tin cá nhân thành công! ✓', 'success');
        } else {
            showToast(data.message || 'Lưu thông tin thất bại.', 'error');
        }
    } catch (error) {
        console.error('Lỗi lưu hồ sơ:', error);
        showToast('Lỗi kết nối. Vui lòng thử lại.', 'error');
    } finally {
        if (saveBtn) { saveBtn.disabled = false; saveBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Thay Đổi'; }
    }
}

// Load Doctor Profile into profile configuration form
async function loadDoctorProfileIntoForm() {
    if (userRole !== 'Doctor') return;
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const profile = await response.json();
            const fullNameEl = document.getElementById('doctor-profile-fullname');
            const phoneEl = document.getElementById('doctor-profile-phone');
            const specEl = document.getElementById('doctor-profile-specialization');
            const branchEl = document.getElementById('doctor-profile-branch');
            
            if (fullNameEl) fullNameEl.value = profile.fullName || '';
            if (phoneEl) phoneEl.value = profile.phoneNumber || '';
            if (specEl) specEl.value = profile.specialization || '';
            if (branchEl) branchEl.value = profile.hospitalBranch || '';
        }
    } catch (error) {
        console.error("Lỗi tải thông tin hồ sơ bác sĩ:", error);
    }
}

// Save/Update Doctor Profile
async function saveDoctorProfile(e) {
    if (e) e.preventDefault();
    
    const fullName = document.getElementById('doctor-profile-fullname').value.trim();
    const phoneNumber = document.getElementById('doctor-profile-phone').value.trim();
    const specialization = document.getElementById('doctor-profile-specialization').value.trim();
    const hospitalBranch = document.getElementById('doctor-profile-branch').value;
    
    if (!fullName || !specialization || !hospitalBranch) {
        showToast('Vui lòng điền đầy đủ các thông tin bắt buộc.', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu...';
    
    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fullName,
                phoneNumber,
                specialization,
                hospitalBranch
            })
        });
        
        btn.disabled = false;
        btn.innerHTML = oldText;
        
        if (response.ok) {
            showToast('Cập nhật thông tin chuyên môn bác sĩ thành công!', 'success');
            // Refresh local display name in header
            userName = fullName;
            document.getElementById('header-user-name').innerText = fullName;
            
            // Also refresh other parts of dashboard
            loadAppointments();
        } else {
            const data = await response.json();
            showToast(data.message || 'Cập nhật thất bại.', 'error');
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = oldText;
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

// Load Doctors List dynamically
async function loadDoctors() {
    const doctorSelect = document.getElementById('booking-doctor');
    if (!doctorSelect) return;
    doctorSelect.innerHTML = '<option value="" disabled selected>Đang tải danh sách bác sĩ...</option>';
    
    window.loadDoctorsPromise = (async () => {
        try {
            const response = await fetch(`${API_BASE}/auth/doctors`);
            const doctors = await response.json();
            
            window.allDoctors = doctors; // Save to global list for branch filtering
            
            if (doctors.length === 0) {
                doctorSelect.innerHTML = '<option value="" disabled selected>Chưa có bác sĩ nào trong hệ thống</option>';
                return doctors;
            }
            
            // Filter doctor select dropdown based on selected branch
            filterDoctorsBySelectedBranch();
            return doctors;
        } catch (error) {
            doctorSelect.innerHTML = '<option value="" disabled selected>Không thể tải danh sách bác sĩ</option>';
            return [];
        }
    })();
    return window.loadDoctorsPromise;
}

// Tab Switching Logic
function switchTab(tabName) {
    currentTab = tabName;
    
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tab-btn-${tabName}`).classList.add('active');
    
    // Update tab contents — explicitly control display to override any inline styles
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
    });
    const activeTab = document.getElementById(`tab-${tabName}`);
    activeTab.classList.add('active');
    activeTab.style.display = 'block';
    
    if (tabName === 'users') {
        switchUserSubTab(currentUserSubTab);
    } else if (tabName === 'overview') {
        loadOverviewData();
    } else if (tabName === 'schedule') {
        loadDoctorScheduleForDate();
    } else if (tabName === 'records') {
        loadMedicalRecords();
    } else if (tabName === 'vitals') {
        loadPatientVitals();
    } else if (tabName === 'booking') {
        const wrapper = document.getElementById('booking-section-wrapper');
        const tabBooking = document.getElementById('tab-booking');
        if (wrapper && tabBooking) {
            const innerDiv = tabBooking.querySelector('div');
            if (innerDiv) {
                innerDiv.appendChild(wrapper);
            } else {
                tabBooking.appendChild(wrapper);
            }
            wrapper.style.display = 'block';
        }
        loadPatientProfileIntoBookingForm();
    } else if (tabName === 'tools' || tabName === 'packages') {
        // Do nothing, purely client-side tools or packages tabs
    } else if (tabName === 'profile') {
        loadPatientProfileTab();
    } else if (tabName === 'vitals') {
        loadPatientVitals();
    } else if (tabName === 'reception') {
        loadReceptionAppointments();
    } else if (tabName === 'finance') {
        loadBillingRecords();
    } else if (tabName === 'pharmacist') {
        loadPharmacistDashboard();
    } else if (tabName === 'labtech') {
        loadLabTechDashboard();
    } else {
        loadAppointments();
    }
}


// Load Appointments from Server
async function loadAppointments() {
    // Reset search inputs on reload
    const searchInput = document.getElementById('appointment-search');
    const statusFilter = document.getElementById('appointment-status-filter');
    const branchFilter = document.getElementById('appointment-branch-filter');
    if (searchInput) searchInput.value = '';
    if (statusFilter) statusFilter.value = '';
    if (branchFilter) branchFilter.value = '';

    appointmentsContainer.innerHTML = `
        <div class="loading-placeholder">
            <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách lịch khám...
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const appointments = await response.json();
        window.allAppointments = appointments; // Save globally for searching and filtering
        filterAppointments(); // Always go through filter (includes hide logic)
        
        if (userRole === 'Admin') {
            loadAdminStats();
        } else {
            calculateStats(appointments);
        }
    } catch (error) {
        appointmentsContainer.innerHTML = `
            <div class="empty-placeholder">
                <i class="fa-solid fa-circle-exclamation" style="color: var(--danger);"></i>
                <p>Không thể tải dữ liệu cuộc hẹn.</p>
            </div>
        `;
    }
}

// Client-side filtering for appointments list
function filterAppointments() {
    if (!window.allAppointments) return;
    
    const searchVal = document.getElementById('appointment-search').value.toLowerCase().trim();
    const statusVal = document.getElementById('appointment-status-filter').value;
    const branchVal = document.getElementById('appointment-branch-filter').value;
    
    // Read auto-hide settings
    const autoHideEnabledCheckbox = document.getElementById('auto-hide-old-apps');
    const autoHideThresholdSelect = document.getElementById('auto-hide-threshold');
    const roleLower = (userRole || '').toLowerCase();
    const showHiddenCheckbox = roleLower === 'patient' ? document.getElementById('show-hidden-apps') : document.getElementById('staff-show-hidden-apps');
    
    const autoHideEnabled = autoHideEnabledCheckbox ? autoHideEnabledCheckbox.checked : true;
    const autoHideThreshold = autoHideThresholdSelect ? parseInt(autoHideThresholdSelect.value) : 7;
    const showHidden = showHiddenCheckbox ? showHiddenCheckbox.checked : false;
    
    const filtered = window.allAppointments.filter(app => {
        const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
        // Lọc theo chi nhánh
        if (branchVal && app.hospitalBranch !== branchVal) {
            return false;
        }
        
        // Lọc theo trạng thái
        if (statusVal && app.status !== statusVal) {
            return false;
        }
        
        // Lọc theo từ khóa tìm kiếm (Tên bác sĩ, tên bệnh nhân, triệu chứng)
        if (searchVal) {
            const docName = (app.doctorName || '').toLowerCase();
            const patName = (app.patientName || '').toLowerCase();
            const symptoms = (app.symptoms || '').toLowerCase();
            if (!docName.includes(searchVal) && !patName.includes(searchVal) && !symptoms.includes(searchVal)) {
                return false;
            }
        }
        
        // Reset hide/auto-hide flags on object
        app._isHiddenInUi = false;
        app._isAutoHiddenInUi = false;
        
        // Patient hide/delete and auto-hide filtering
        if (roleLower === 'patient') {
            const isManuallyHidden = isAppointmentHiddenLocally(appId);
            let isAutoHidden = false;
            
            // Auto hide old appointments (Cancelled, Completed, Confirmed in the past)
            if (autoHideEnabled && (app.status === 'Cancelled' || app.status === 'Completed' || app.status === 'Confirmed')) {
                // Check if not exempt (restored)
                if (!isAppointmentRestoredLocally(appId)) {
                    const appDate = new Date(app.appointmentDate);
                    const ageDays = (new Date() - appDate) / (1000 * 60 * 60 * 24);
                    
                    // Only hide Confirmed if it has passed, Cancelled/Completed are hidden immediately if they match threshold
                    if (app.status === 'Confirmed') {
                        if (ageDays > 0 && ageDays > autoHideThreshold) {
                            isAutoHidden = true;
                        }
                    } else if (ageDays > autoHideThreshold) {
                        isAutoHidden = true;
                    }
                }
            }
            
            if (isManuallyHidden || isAutoHidden) {
                if (showHidden) {
                    // Keep but flag for faded styling
                    app._isHiddenInUi = true;
                    app._isAutoHiddenInUi = isAutoHidden;
                } else {
                    // Exclude
                    return false;
                }
            }
        }
        
        // Staff filter to hide manually hidden completed or cancelled appointments
        if (roleLower !== 'patient') {
            if (isStaffAppointmentHiddenLocally(appId)) {
                if (showHidden) {
                    // Keep but flag for faded styling
                    app._isHiddenInUi = true;
                } else {
                    return false;
                }
            }
        }
        
        return true;
    });
    
    updateStaffHiddenButtonVisibility();
    renderAppointments(filtered);
}

// Render Appointments cards
function renderAppointments(appointments) {
    // Reset selections on render
    const countEl = document.getElementById('selected-apps-count');
    if (countEl) countEl.innerText = '0';
    
    const bulkPanel = document.getElementById('staff-bulk-actions');
    if (bulkPanel) bulkPanel.style.display = 'none';
    
    // Hide bulk selection controls since selection is reset
    const selectionControls = document.getElementById('bulk-selection-controls');
    if (selectionControls) selectionControls.style.display = 'none';

    if (appointments.length === 0) {
        appointmentsContainer.innerHTML = `
            <div class="empty-placeholder">
                <i class="fa-solid fa-calendar-minus"></i>
                <p>Chưa có lịch hẹn khám nào.</p>
            </div>
        `;
        return;
    }

    let html = '';
    appointments.forEach(app => {
        const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
        const appDate = new Date(app.appointmentDate).toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });

        const statusClass = `status-${app.status.toLowerCase()}`;
        const statusText = translateStatus(app.status);

        let symptomsHtml = app.symptoms || '<i>Không mô tả</i>';
        let badgesHtml = '';
        let patientNameDisplay = `${app.patientName} (${app.patientEmail})`;
        
        // Parse relative prefix
        const relativeRegex = /\[Đặt cho người thân:\s*([^\s|].*?)\s*\|\s*SĐT:\s*(.*?)\s*\|\s*Mối quan hệ:\s*(.*?)\s*\|\s*Năm sinh:\s*(.*?)\s*\|\s*Giới tính:\s*([^\]]*?)\]/;
        const relMatch = symptomsHtml.match(relativeRegex);
        if (relMatch) {
            const [fullMatch, relName, relPhone, relRelation, relDob, relGender] = relMatch;
            symptomsHtml = symptomsHtml.replace(fullMatch, '').trim();
            if (!symptomsHtml) symptomsHtml = '<i>Không mô tả</i>';
            
            badgesHtml += `
                <span class="badge" style="background: hsl(270, 85%, 93%); color: hsl(270, 85%, 40%); font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px; margin-bottom: 6px;">
                    <i class="fa-solid fa-users"></i> Đặt hộ: ${relName} (${relRelation})
                </span>
            `;
            patientNameDisplay = `<strong>${relName}</strong> (Đặt hộ bởi ${app.patientName} - SĐT: ${relPhone}, Năm sinh: ${relDob}, Giới tính: ${relGender})`;
        }
        
        // Parse package prefix
        const pkgRegex = /\[Gói khám:\s*([^|]*?)(?:\|Cơ sở:\s*([^\]]*?))?\]/;
        const pkgMatch = symptomsHtml.match(pkgRegex);
        if (pkgMatch) {
            const [fullMatch, pkgName, branchName] = pkgMatch;
            symptomsHtml = symptomsHtml.replace(fullMatch, '').trim();
            if (!symptomsHtml) symptomsHtml = '<i>Không mô tả</i>';
            
            let branchTag = '';
            if (branchName) {
                branchTag = ` | Cơ sở liên kết: <strong>${branchName}</strong>`;
            }
            
            badgesHtml += `
                <span class="badge" style="background: hsl(150, 80%, 93%); color: hsl(150, 80%, 30%); font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px; margin-bottom: 6px;">
                    <i class="fa-solid fa-box-tissue"></i> ${pkgName}${branchTag}
                </span>
            `;
        }

        if (app.aiChatHistory) {
            const encodedHistory = encodeURIComponent(app.aiChatHistory);
            badgesHtml += `
                <button type="button" class="badge-ai-chat" style="background: hsl(200, 85%, 93%); color: hsl(200, 85%, 35%); font-weight: 700; font-size: 11px; padding: 4px 8px; border: 1px solid hsl(200, 40%, 85%); border-radius: 4px; display: inline-flex; align-items: center; gap: 4px; margin-right: 6px; margin-bottom: 6px; cursor: pointer; transition: all 0.2s;" onclick="showAiChatHistory('${encodedHistory}')">
                    <i class="fa-solid fa-robot"></i> Xem tư vấn AI
                </button>
            `;
        }

        const roleLower = (userRole || '').toLowerCase();
        html += `
            <div class="appointment-card glass-card ${app._isHiddenInUi ? 'appointment-hidden' : ''}">
                <div class="app-card-header">
                    <div class="app-meta-group" style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        ${(roleLower === 'doctor' || roleLower === 'admin') && !app._isHiddenInUi ? `<input type="checkbox" class="appointment-select-checkbox" data-id="${appId}" onchange="onAppointmentSelectChange()" style="width: 17px; height: 17px; cursor: pointer; margin: 0 4px 0 0;">` : ''}
                        <h3>Mã lịch khám: #${appId}</h3>
                        <span><i class="fa-solid fa-calendar-day"></i> ${appDate}</span>
                        <span><i class="fa-solid fa-clock"></i> Ca khám: <strong>${app.timeSlot}</strong></span>
                    </div>
                    <span class="status-badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="app-details">
                    <div class="detail-item">
                        <strong>Bệnh nhân</strong>
                        <span>${patientNameDisplay}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Bác sĩ khám</strong>
                        <span>${app.doctorName} (${app.doctorEmail})</span>
                    </div>
                    <div class="detail-item">
                        <strong>Chi nhánh khám</strong>
                        <span>${getLocalizedBranchName(app.hospitalBranch)}</span>
                    </div>
                    <div class="detail-item">
                        <strong>Triệu chứng bệnh lý</strong>
                        <span>
                            ${badgesHtml ? `<div style="margin-top: 4px; margin-bottom: 8px; display: flex; flex-wrap: wrap;">${badgesHtml}</div>` : ''}
                            ${symptomsHtml}
                        </span>
                    </div>
                </div>

                ${renderActionButtons(app)}
            </div>
        `;
    });

    appointmentsContainer.innerHTML = html;
}

// Render action buttons based on User Role and Appointment Status
function renderActionButtons(app) {
    const roleLower = (userRole || '').toLowerCase();
    const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
    if (roleLower === 'doctor' || roleLower === 'admin') {
        if (app.status === 'Pending') {
            return `
                <div class="app-actions">
                    <button class="btn btn-sm btn-success" onclick="updateStatus(${appId}, 'Confirmed')">
                        <i class="fa-solid fa-circle-check"></i> Xác nhận lịch
                    </button>
                    <button class="btn btn-sm btn-logout" style="padding: 8px 16px;" onclick="updateStatus(${appId}, 'Cancelled')">
                        <i class="fa-solid fa-circle-xmark"></i> Hủy lịch
                    </button>
                </div>
            `;
        }
        
        if (app.status === 'Confirmed' || app.status === 'CheckedIn') {
            if (roleLower === 'doctor') {
                return `
                    <div class="app-actions">
                        <button class="btn btn-sm btn-primary" onclick="openRecordModal(${app.patientId || app.PatientId}, '${app.patientName || app.PatientName}', ${appId})">
                            <i class="fa-solid fa-file-medical"></i> Khám & Lập Bệnh Án
                        </button>
                        <button class="btn btn-sm btn-logout" style="padding: 8px 16px;" onclick="updateStatus(${appId}, 'Cancelled')">
                            <i class="fa-solid fa-circle-xmark"></i> Hủy lịch
                        </button>
                    </div>
                `;
            } else { // Admin
                return `
                    <div class="app-actions">
                        <button class="btn btn-sm btn-success" disabled>
                            <i class="fa-solid fa-circle-check"></i> Chờ khám (Doctor)
                        </button>
                        <button class="btn btn-sm btn-logout" style="padding: 8px 16px;" onclick="updateStatus(${appId}, 'Cancelled')">
                            <i class="fa-solid fa-circle-xmark"></i> Hủy lịch
                        </button>
                    </div>
                `;
            }
        }
    } else if (roleLower === 'patient') {
        let actionsHtml = '';
        if (app.status !== 'Cancelled') {
            actionsHtml += `
                <button class="btn btn-sm btn-outline-primary" style="padding: 8px 16px; margin-right: 8px;" onclick="showAppointmentQrModal(${appId})">
                    <i class="fa-solid fa-qrcode"></i> Mã QR Khám Bệnh
                </button>
            `;
        }
        if (app.status === 'Pending') {
            actionsHtml += `
                <button class="btn btn-sm btn-logout" style="padding: 8px 16px;" onclick="updateStatus(${appId}, 'Cancelled')">
                    <i class="fa-solid fa-circle-xmark"></i> Hủy yêu cầu đặt lịch
                </button>
            `;
        }
        
        // Hide/Show manually delete/hide buttons for Confirmed, Completed, and Cancelled
        if (app.status === 'Confirmed' || app.status === 'Completed' || app.status === 'Cancelled') {
            const isManuallyHidden = isAppointmentHiddenLocally(appId);
            const isAutoHidden = app._isAutoHiddenInUi || false;
            
            if (isManuallyHidden || isAutoHidden) {
                actionsHtml += `
                    <button class="btn btn-sm btn-success" style="padding: 8px 16px;" onclick="unhideAppointmentLocally(${appId})">
                        <i class="fa-solid fa-eye"></i> Hiện lại lịch khám
                    </button>
                `;
            } else {
                actionsHtml += `
                    <button class="btn btn-sm" style="padding: 8px 16px; border: 1px solid var(--border-color); background: rgba(0,0,0,0.02); color: var(--text-muted);" onclick="hideAppointmentLocally(${appId})">
                        <i class="fa-solid fa-trash-can"></i> Xóa khỏi danh sách
                    </button>
                `;
            }
        }
        
        if (actionsHtml) {
            return `<div class="app-actions">${actionsHtml}</div>`;
        }
    }
    return '';
}

// Handle Appointment Booking Submission
async function handleBooking(e) {
    e.preventDefault();
    const doctorId = parseInt(document.getElementById('booking-doctor').value);
    const appointmentDate = document.getElementById('booking-date').value;
    const timeSlot = document.getElementById('booking-slot').value;
    let symptoms = document.getElementById('booking-symptoms').value.trim();

    const phoneNumber = document.getElementById('booking-phone').value.trim();
    const dateOfBirth = document.getElementById('booking-dob').value;
    const gender = document.getElementById('booking-gender').value;
    const bloodType = document.getElementById('booking-bloodtype').value;
    const address = document.getElementById('booking-address').value.trim();

    // Read CCCD, Patient Type, and BHYT
    const nationalId = document.getElementById('booking-nationalid')?.value.trim() || '';
    const patientType = document.getElementById('booking-patienttype')?.value || 'Service';
    const insuranceCardNumber = document.getElementById('booking-insurancecardnumber')?.value.trim() || '';

    const btnSubmit = document.getElementById('btn-submit-booking');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đăng ký...';

    // If booking a package, append selected local branch name to symptoms for admin notification
    if (symptoms.includes('[Gói khám:')) {
        const branchSelect = document.getElementById('booking-branch');
        const selectedBranchText = branchSelect ? branchSelect.options[branchSelect.selectedIndex]?.text : '';
        let selectedBranchName = selectedBranchText ? selectedBranchText.split(' (')[0] : '';
        if (selectedBranchName && !symptoms.includes('|Cơ sở:')) {
            symptoms = symptoms.replace(/\[Gói khám:\s*([^\]]*?)\]/, (match, pkgName) => {
                return `[Gói khám: ${pkgName}|Cơ sở: ${selectedBranchName}]`;
            });
        }
    }

    // Pack relative details if "relative" radio is checked
    const bookingTarget = document.querySelector('input[name="booking-target"]:checked')?.value;
    if (bookingTarget === 'relative') {
        const relName = document.getElementById('relative-fullname').value.trim();
        const relPhone = document.getElementById('relative-phone').value.trim();
        const relRelation = document.getElementById('relative-relationship').value;
        const relGender = document.getElementById('relative-gender').value;
        const relDob = document.getElementById('relative-dob').value;

        if (!relName || !relPhone || !relRelation || !relGender || !relDob) {
            showToast('Vui lòng điền đầy đủ thông tin người thân!', 'warning');
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận đặt lịch';
            return;
        }

        symptoms = `[Đặt cho người thân: ${relName} | SĐT: ${relPhone} | Mối quan hệ: ${relRelation} | Năm sinh: ${relDob} | Giới tính: ${relGender}]\n${symptoms}`;
    }

    try {
        // 1. Cập nhật thông tin bệnh nhân trước (chỉ khi đặt cho bản thân và là Patient)
        if (userRole === 'Patient' && bookingTarget === 'self') {
            const profileRes = await fetch(`${API_BASE}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    fullName: userName,
                    phoneNumber,
                    dateOfBirth,
                    address,
                    gender,
                    bloodType,
                    nationalId,
                    patientType,
                    insuranceCardNumber,
                    serviceTier: document.getElementById('booking-servicetier')?.value || 'Standard',
                    isPriority: document.getElementById('booking-ispriority')?.checked || false,
                    priorityReason: (document.getElementById('booking-priority-reason')?.value || '').trim() || null
                })
            });

            if (!profileRes.ok) {
                const errData = await profileRes.json();
                showToast(errData.message || 'Cập nhật thông tin hành chính thất bại.', 'error');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận đặt lịch';
                return;
            }
        }

        // 2. Tiến hành đặt lịch hẹn
        let reqBody = {
            doctorId,
            appointmentDate,
            timeSlot,
            symptoms,
            serviceTier: document.getElementById('booking-servicetier')?.value || 'Standard',
            isPriority: document.getElementById('booking-ispriority')?.checked || false,
            priorityReason: (document.getElementById('booking-priority-reason')?.value || '').trim() || null,
            aiChatHistory: aiHistory && aiHistory.length > 0 ? JSON.stringify(aiHistory) : null
        };
        if (userRole === 'Admin' || userRole === 'Receptionist') {
            const adminPatientId = parseInt(document.getElementById('booking-admin-patient-id').value);
            if (isNaN(adminPatientId) || adminPatientId <= 0) {
                showToast('Vui lòng điền mã số Patient ID hợp lệ!', 'warning');
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận đặt lịch';
                return;
            }
            reqBody.patientId = adminPatientId;
        }

        const response = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(reqBody)
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Đặt lịch khám thành công!', 'success');
            
            if (window.bookingTourActive) {
                completeBookingTour();
            } else {
                closeBookingModal();
            }
            
            bookingForm.reset();
            
            // Re-load profile to keep booking fields populated after form reset
            await loadPatientProfileIntoBookingForm();
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            document.getElementById('booking-date').value = tomorrow.toISOString().split('T')[0];

            goToDashboard();
            switchTab('appointments');
            loadAppointments();

            const bookedAppId = data.appointmentId || data.AppointmentId || data.id || data.Id;
            if (bookedAppId) {
                showAppointmentQrModal(bookedAppId);
            }
        } else {
            showToast(data.message || 'Đăng ký lịch khám thất bại.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác nhận đặt lịch';
    }
}

// Handle Update Status call
async function updateStatus(appId, status) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Lịch khám đã chuyển sang: ${translateStatus(status)}`, 'success');
            loadAppointments();
        } else {
            showToast(data.message || 'Cập nhật trạng thái thất bại.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    }
}

// --- MEDICAL RECORDS LOGIC ---

// Open Medical Record Modal
function openRecordModal(patientId, patientName, appointmentId) {
    document.getElementById('record-patient-id').value = patientId;
    document.getElementById('record-appointment-id').value = appointmentId;
    document.getElementById('record-patient-name').innerText = patientName;
    
    document.getElementById('record-diagnosis').value = '';
    document.getElementById('record-treatment').value = '';
    document.getElementById('record-prescription').value = '';
    
    // Reset lab checkboxes
    document.querySelectorAll('input[name="doctor-labs"]').forEach(cb => cb.checked = false);
    
    // Reset prescribed list
    window.currentDoctorPrescription = [];
    updateDoctorPrescribedListUI();
    loadMedicinesIntoDoctorSelect();
    
    // Load Vitals Display
    const vitalsDisplay = document.getElementById('record-vitals-display');
    if (vitalsDisplay) {
        vitalsDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải sinh hiệu...';
        const app = window.allAppointments ? window.allAppointments.find(a => (a.appointmentId || a.id || a.AppointmentId) === appointmentId) : null;
        if (app && (app.bloodPressure || app.temperature || app.weight || app.heartRate || app.BloodPressure || app.Temperature || app.Weight || app.HeartRate)) {
            const bp = app.bloodPressure || app.BloodPressure || 'Chưa đo';
            const temp = app.temperature || app.Temperature || 'Chưa đo';
            const weight = app.weight || app.Weight || 'Chưa đo';
            const hr = app.heartRate || app.HeartRate || 'Chưa đo';
            
            let paymentStr = '';
            if (app.paymentMethod || app.PaymentMethod) {
                paymentStr = `<div style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 11.5px;">` +
                            `<strong>Thanh toán:</strong> ${app.paymentMethod || app.PaymentMethod}` +
                            `${(app.paymentTransactionId || app.PaymentTransactionId) ? ` (Mã GD: ${app.paymentTransactionId || app.PaymentTransactionId})` : ''}</div>`;
            }
            
            vitalsDisplay.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                    <div><strong>Huyết áp:</strong> ${bp} mmHg</div>
                    <div><strong>Nhiệt độ:</strong> ${temp} °C</div>
                    <div><strong>Cân nặng:</strong> ${weight} kg</div>
                    <div><strong>Nhịp tim:</strong> ${hr} bpm</div>
                </div>
                ${paymentStr}
            `;
        } else {
            vitalsDisplay.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Chưa ghi nhận chỉ số sinh hiệu khi check-in</span>';
        }
    }
    
    // Load Patient History Display
    const historyDisplay = document.getElementById('record-history-display');
    if (historyDisplay) {
        historyDisplay.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải lịch sử bệnh án...';
        fetch(`${API_BASE}/medicalrecords/patient/${patientId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
        .then(res => res.json())
        .then(records => {
            if (records.length === 0) {
                historyDisplay.innerHTML = '<span style="color: var(--text-muted); font-style: italic;">Không có lịch sử bệnh án trước đây.</span>';
                return;
            }
            let historyHtml = '';
            records.forEach(rec => {
                const dateStr = new Date(rec.recordDate || rec.RecordDate).toLocaleDateString('vi-VN');
                historyHtml += `
                    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; margin-bottom: 10px; border-left: 3px solid var(--primary);">
                        <div style="display: flex; justify-content: space-between; font-weight: 700; margin-bottom: 4px; font-size:11.5px;">
                            <span>${dateStr}</span>
                            <span style="color: var(--text-muted);">BS. ${rec.doctorName || rec.DoctorName}</span>
                        </div>
                        <div><strong>Chẩn đoán:</strong> ${rec.diagnosis || rec.Diagnosis}</div>
                        <div style="margin-top: 3px;"><strong>Lời khuyên:</strong> ${rec.treatment || rec.Treatment}</div>
                        ${(rec.prescription || rec.Prescription) ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; font-family: monospace; font-size: 11px;"><strong>Đơn thuốc:</strong> ${rec.prescription || rec.Prescription}</div>` : ''}
                    </div>
                `;
            });
            historyDisplay.innerHTML = historyHtml;
        })
        .catch(err => {
            historyDisplay.innerHTML = '<span style="color: var(--danger);"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi tải lịch sử bệnh án</span>';
        });
    }
    
    document.getElementById('record-modal').style.display = 'flex';
}

// Close Medical Record Modal
function closeRecordModal() {
    document.getElementById('record-modal').style.display = 'none';
}

// Handle Creating Medical Record
async function handleCreateRecord(e) {
    e.preventDefault();
    const patientId = parseInt(document.getElementById('record-patient-id').value);
    const appointmentId = parseInt(document.getElementById('record-appointment-id').value);
    const diagnosis = document.getElementById('record-diagnosis').value.trim();
    const treatment = document.getElementById('record-treatment').value.trim();
    const prescription = document.getElementById('record-prescription').value.trim();

    // Thu thập đơn thuốc chi tiết (prescriptionDetails)
    const prescriptionDetails = (window.currentDoctorPrescription || []).map(item => ({
        medicineId: item.medicineId,
        quantity: item.quantity,
        usageInstruction: item.usageInstruction
    }));

    // Thu thập danh sách chỉ định cận lâm sàng (labRequests)
    const labRequests = [];
    document.querySelectorAll('input[name="doctor-labs"]:checked').forEach(cb => {
        labRequests.push({
            labType: cb.value,
            fee: parseFloat(cb.getAttribute('data-fee'))
        });
    });

    const btnSubmit = document.getElementById('btn-submit-record');
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang lưu hồ sơ...';

    try {
        const response = await fetch(`${API_BASE}/medicalrecords`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ patientId, appointmentId, diagnosis, treatment, prescription, prescriptionDetails, labRequests })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Lập hồ sơ bệnh án thành công! Ca khám đã kết thúc.', 'success');
            closeRecordModal();
            loadAppointments();
        } else {
            showToast(data.message || 'Lập bệnh án thất bại.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu Hồ Sơ & Kết Thúc Khám';
    }
}

// Load Medical Records from server
async function loadMedicalRecords() {
    const searchInput = document.getElementById('record-search');
    if (searchInput) searchInput.value = '';

    const container = document.getElementById('records-list-container');
    container.innerHTML = `
        <div class="loading-placeholder">
            <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách bệnh án...
        </div>
    `;

    try {
        const response = await fetch(`${API_BASE}/medicalrecords/my-records`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        const records = await response.json();
        window.allMedicalRecords = records; // Save globally for searching and printing
        renderMedicalRecords(records, container);
    } catch (error) {
        container.innerHTML = `
            <div class="empty-placeholder">
                <i class="fa-solid fa-circle-exclamation" style="color: var(--danger);"></i>
                <p>Không thể tải lịch sử bệnh án.</p>
            </div>
        `;
    }
}

// Render Medical Records list
function renderMedicalRecords(records, container) {
    if (records.length === 0) {
        container.innerHTML = `
            <div class="empty-placeholder">
                <i class="fa-solid fa-file-medical"></i>
                <p>Chưa có hồ sơ bệnh án nào.</p>
            </div>
        `;
        return;
    }

    let html = '';
    records.forEach(rec => {
        const recDate = new Date(rec.recordDate).toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        html += `
            <div class="appointment-card glass-card">
                <div class="app-card-header" style="display: flex; justify-content: space-between; align-items: center; width: 100%; flex-wrap: wrap; gap: 12px;">
                    <div class="app-meta-group" style="flex: 1;">
                        <h3 style="color: var(--success); font-weight: 700;">
                            <i class="fa-solid fa-file-medical"></i> BỆNH ÁN: #BA-${rec.medicalRecordId}
                        </h3>
                        <span><i class="fa-solid fa-calendar-check"></i> Ngày khám: <strong>${recDate}</strong></span>
                        ${rec.appointmentId ? `<span><i class="fa-solid fa-link"></i> Liên kết Lịch khám: #${rec.appointmentId}</span>` : ''}
                    </div>
                    <button class="btn btn-sm btn-secondary" onclick="printPrescription(${rec.medicalRecordId})" style="padding: 6px 12px; font-size: 12.5px; border-radius: var(--radius-sm); display: flex; align-items: center; gap: 6px; font-weight: 600; cursor: pointer; border: 1px solid var(--border-color); background: #fff;">
                        <i class="fa-solid fa-print"></i> In Đơn Thuốc / Bệnh Án
                    </button>
                </div>
                
                <div class="app-details" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                    <div class="detail-item">
                        <strong>Bệnh nhân</strong>
                        <span>${rec.patientName} (${rec.patientEmail})</span>
                    </div>
                    <div class="detail-item">
                        <strong>Bác sĩ khám bệnh</strong>
                        <span>${rec.doctorName} (${rec.doctorEmail})</span>
                    </div>
                    
                    ${(() => {
                        const bp = rec.bloodPressure || rec.BloodPressure;
                        const temp = rec.temperature || rec.Temperature;
                        const weight = rec.weight || rec.Weight;
                        const hr = rec.heartRate || rec.HeartRate;
                        if (bp || temp || weight || hr) {
                            return `
                            <div class="detail-item" style="grid-column: 1 / -1; background: rgba(16, 185, 129, 0.05); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid #10b981; display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;">
                                <strong style="color: #10b981;"><i class="fa-solid fa-heart-pulse"></i> Chỉ số sinh hiệu tiếp nhận</strong>
                                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; font-size: 13px; margin-top: 4px; color: var(--text-main);">
                                    <div><strong>Huyết áp:</strong> ${bp || '—'} mmHg</div>
                                    <div><strong>Nhiệt độ:</strong> ${temp || '—'} °C</div>
                                    <div><strong>Cân nặng:</strong> ${weight || '—'} kg</div>
                                    <div><strong>Nhịp tim:</strong> ${hr || '—'} bpm</div>
                                </div>
                            </div>
                            `;
                        }
                        return '';
                    })()}
                    
                    <div class="detail-item" style="grid-column: 1 / -1;">
                        <strong><i class="fa-solid fa-stethoscope"></i> Chẩn đoán</strong>
                        <span style="font-weight: 600; color: var(--dark); font-size: 15px;">${rec.diagnosis}</span>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1; background: var(--primary-light); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid var(--primary);">
                        <strong><i class="fa-solid fa-hand-holding-medical"></i> Phương án điều trị & Lời khuyên</strong>
                        <span style="color: var(--text-main); font-weight: 500;">${rec.treatment}</span>
                    </div>
                    <div class="detail-item" style="grid-column: 1 / -1; background: var(--success-light); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid var(--success);">
                        <strong><i class="fa-solid fa-pills"></i> Đơn thuốc kèm theo</strong>
                        <span style="font-family: monospace; white-space: pre-line; color: var(--text-main); font-weight: 500;">${rec.prescription || '<i>Không kê đơn thuốc</i>'}</span>
                    </div>

                    ${(() => {
                        if (rec.prescription && rec.prescriptionFee > 0) {
                            if (rec.billingStatus === 'Paid') {
                                return `
                                <div class="detail-item" style="grid-column: 1 / -1; background: rgba(32, 201, 151, 0.08); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid var(--success); display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
                                    <div>
                                        <strong><i class="fa-solid fa-file-invoice-dollar"></i> Viện phí & Tiền thuốc đơn kê:</strong>
                                        <span style="color: var(--success); font-weight: 700; margin-left: 4px;">${Number(rec.prescriptionFee).toLocaleString('vi-VN')} VNĐ (Đã thanh toán)</span>
                                    </div>
                                    <span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: rgba(40,167,69,0.15); color: var(--success); font-weight: 700;">Đã nhận thuốc</span>
                                </div>
                                `;
                            } else {
                                const roleLower = (userRole || '').toLowerCase();
                                const payButton = roleLower === 'patient'
                                    ? `<button class="btn btn-sm btn-danger" onclick="payPrescriptionVietQr(${rec.medicalRecordId}, ${rec.prescriptionFee})" style="padding: 6px 14px; font-weight: 700; background: #dc3545; color: #fff; border: none; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 6px;">
                                        <i class="fa-solid fa-qrcode"></i> Thanh toán VietQR
                                       </button>`
                                    : '';

                                return `
                                <div class="detail-item" style="grid-column: 1 / -1; background: rgba(220, 53, 69, 0.08); padding: 12px; border-radius: var(--radius-sm); border-left: 4px solid #dc3545; display: flex; justify-content: space-between; align-items: center; margin-top: 8px; flex-wrap: wrap; gap: 10px;">
                                    <div>
                                        <strong><i class="fa-solid fa-file-invoice-dollar"></i> Viện phí & Tiền thuốc đơn kê:</strong>
                                        <span style="color: #dc3545; font-weight: 700; margin-left: 4px;">${Number(rec.prescriptionFee).toLocaleString('vi-VN')} VNĐ (Chưa thanh toán)</span>
                                    </div>
                                    ${payButton}
                                </div>
                                `;
                            }
                        }
                        return '';
                    })()}
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
}

// Filter medical records list client-side
function filterMedicalRecords() {
    if (!window.allMedicalRecords) return;
    
    const searchVal = document.getElementById('record-search').value.toLowerCase().trim();
    const container = document.getElementById('records-list-container');
    
    if (!searchVal) {
        renderMedicalRecords(window.allMedicalRecords, container);
        return;
    }
    
    const filtered = window.allMedicalRecords.filter(rec => {
        const docName = (rec.doctorName || '').toLowerCase();
        const patName = (rec.patientName || '').toLowerCase();
        const diagnosis = (rec.diagnosis || '').toLowerCase();
        const treatment = (rec.treatment || '').toLowerCase();
        
        return docName.includes(searchVal) || patName.includes(searchVal) || diagnosis.includes(searchVal) || treatment.includes(searchVal);
    });
    
    renderMedicalRecords(filtered, container);
}

// Print prescription and medical record details in a separate printable tab window
function printPrescription(recordId) {
    if (!window.allMedicalRecords) {
        showToast('Không thể truy cập danh sách bệnh án.', 'error');
        return;
    }
    
    const rec = window.allMedicalRecords.find(r => r.medicalRecordId === recordId);
    if (!rec) {
        showToast('Không tìm thấy thông tin bệnh án.', 'error');
        return;
    }

    const bp = rec.bloodPressure || rec.BloodPressure;
    const temp = rec.temperature || rec.Temperature;
    const weight = rec.weight || rec.Weight;
    const hr = rec.heartRate || rec.HeartRate;
    let vitalsHtml = '';
    if (bp || temp || weight || hr) {
        vitalsHtml = `
            <div class="section">
                <div class="section-title">CHỈ SỐ SINH HIỆU TIẾP NHẬN</div>
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 13.5px; background: #f8fafc; padding: 12px 16px; border-radius: 4px; border-left: 4px solid #10b981; margin-bottom: 15px;">
                    <div><strong>Huyết áp:</strong> ${bp || '—'} mmHg</div>
                    <div><strong>Nhiệt độ:</strong> ${temp || '—'} °C</div>
                    <div><strong>Cân nặng:</strong> ${weight || '—'} kg</div>
                    <div><strong>Nhịp tim:</strong> ${hr || '—'} bpm</div>
                </div>
            </div>
        `;
    }
    
    const printWindow = window.open('', '_blank', 'width=800,height=700');
    if (!printWindow) {
        showToast('Vui lòng cho phép popup để in đơn thuốc.', 'warning');
        return;
    }
    
    const recDateStr = new Date(rec.recordDate).toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
    
    const branchName = rec.hospitalBranch || 'CareConnect Clinic';
    
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Đơn Thuốc & Bệnh Án - CareConnect</title>
            <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700;900&display=swap" rel="stylesheet">
            <style>
                body {
                    font-family: 'Roboto', sans-serif;
                    padding: 40px;
                    color: #1a202c;
                    line-height: 1.6;
                    background: #fff;
                }
                .header {
                    display: flex;
                    justify-content: space-between;
                    border-bottom: 2px solid #0669ef;
                    padding-bottom: 18px;
                    margin-bottom: 25px;
                }
                .header-logo {
                    font-size: 26px;
                    font-weight: 800;
                    color: #0669ef;
                }
                .header-logo span {
                    color: #27c93f;
                }
                .header-branch {
                    text-align: right;
                    font-size: 13px;
                    color: #4a5568;
                    line-height: 1.4;
                }
                .title {
                    text-align: center;
                    font-size: 22px;
                    font-weight: 800;
                    text-transform: uppercase;
                    margin-bottom: 30px;
                    color: #2d3748;
                    letter-spacing: 0.5px;
                }
                .section {
                    margin-bottom: 22px;
                }
                .section-title {
                    font-weight: 700;
                    font-size: 14px;
                    border-bottom: 1px solid #e2e8f0;
                    padding-bottom: 6px;
                    margin-bottom: 12px;
                    color: #0669ef;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 20px;
                }
                .info-item {
                    font-size: 14px;
                    margin-bottom: 6px;
                }
                .info-item strong {
                    color: #4a5568;
                }
                .content-box {
                    background: #f7fafc;
                    border-left: 4px solid #0669ef;
                    padding: 12px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    margin-bottom: 15px;
                }
                .content-box.prescription {
                    border-left-color: #27c93f;
                    font-family: monospace;
                    white-space: pre-line;
                    font-size: 14px;
                    background: #f0fff4;
                }
                .footer {
                    margin-top: 60px;
                    display: flex;
                    justify-content: space-between;
                }
                .signature-box {
                    text-align: center;
                    width: 220px;
                }
                .signature-title {
                    font-size: 13px;
                    color: #718096;
                    margin-bottom: 70px;
                }
                .signature-name {
                    font-weight: 700;
                    font-size: 14.5px;
                    color: #2d3748;
                }
                @media print {
                    body { padding: 10px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div class="header-logo">Care<span>Connect</span></div>
                <div class="header-branch">
                    <strong>HỆ THỐNG PHÒNG KHÁM CARECONNECT</strong><br>
                    Chi nhánh: ${branchName}<br>
                    Hotline: 0919 241 283
                </div>
            </div>
            
            <div class="title">BỆNH ÁN & ĐƠN THUỐC</div>
            
            <div class="section">
                <div class="section-title">THÔNG TIN HÀNH CHÍNH</div>
                <div class="grid-2">
                    <div>
                        <div class="info-item"><strong>Mã hồ sơ:</strong> #BA-${rec.medicalRecordId}</div>
                        <div class="info-item"><strong>Họ và tên bệnh nhân:</strong> ${rec.patientName}</div>
                        <div class="info-item"><strong>Email bệnh nhân:</strong> ${rec.patientEmail}</div>
                    </div>
                    <div>
                        <div class="info-item"><strong>Ngày khám bệnh:</strong> ${recDateStr}</div>
                        <div class="info-item"><strong>Bác sĩ thăm khám:</strong> ${rec.doctorName}</div>
                        <div class="info-item"><strong>Email bác sĩ:</strong> ${rec.doctorEmail}</div>
                    </div>
                </div>
            </div>

            ${vitalsHtml}
            
            <div class="section">
                <div class="section-title">CHẨN ĐOÁN LÂM SÀNG</div>
                <div class="content-box">
                    <strong>${rec.diagnosis}</strong>
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">PHƯƠNG ÁN ĐIỀU TRỊ & LỜI KHUYÊN</div>
                <div class="content-box">
                    ${rec.treatment}
                </div>
            </div>
            
            <div class="section">
                <div class="section-title">CHỈ ĐỊNH ĐƠN THUỐC</div>
                <div class="content-box prescription">
                    ${rec.prescription || 'Không kê đơn thuốc.'}
                </div>
            </div>
            
            <div class="footer">
                <div class="signature-box">
                    <div class="signature-title">Bệnh nhân ký tên</div>
                    <div class="signature-name">${rec.patientName}</div>
                </div>
                <div class="signature-box">
                    <div class="signature-title">Bác sĩ khám bệnh<br>(Ký, ghi rõ họ tên)</div>
                    <div class="signature-name">${rec.doctorName}</div>
                </div>
            </div>
            
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }
            </script>
        </body>
        </html>
    `;
    
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
}

// Calculate and render Dashboard statistics
function calculateStats(appointments) {
    let total = appointments.length;
    let pending = 0;
    let confirmed = 0;
    let cancelled = 0;

    appointments.forEach(app => {
        if (app.status === 'Pending') pending++;
        else if (app.status === 'Confirmed') confirmed++;
        else if (app.status === 'Cancelled') cancelled++;
    });

    document.getElementById('stat-total').innerText = total;
    document.getElementById('stat-pending').innerText = pending;
    document.getElementById('stat-confirmed').innerText = confirmed;
    document.getElementById('stat-cancelled').innerText = cancelled;
}

// Helper: Translate Role string to Vietnamese
function translateRole(role) {
    if (role === 'Patient') return 'Bệnh nhân';
    if (role === 'Doctor') return 'Bác sĩ';
    if (role === 'Admin') return 'Quản trị viên';
    return role;
}

// Helper: Translate Status string to Vietnamese
function translateStatus(status) {
    if (status === 'Pending' || status === 'Requested') return 'Chờ duyệt';
    if (status === 'Confirmed') return 'Đã xác nhận';
    if (status === 'CheckedIn') return 'Đã tiếp đón';
    if (status === 'Completed') return 'Hoàn thành';
    if (status === 'Cancelled') return 'Đã hủy lịch';
    return status;
}

// Helper: Get localized branch name using GPS geolocation nearest clinic mapping
function getLocalizedBranchName(dbBranchName) {
    if (!dbBranchName) return '—';
    if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
        if (dbBranchName === 'CareConnect Quận 1') return window.nearbyHospitals[0].name;
        if (dbBranchName === 'CareConnect Quận 3') return window.nearbyHospitals[1].name;
        if (dbBranchName === 'CareConnect Thủ Đức') return window.nearbyHospitals[2].name;
    }
    return dbBranchName;
}

// Navigation: Switch to Dashboard Screen
function goToDashboard() {
    // Hide sidebars on dashboard
    document.body.classList.add('no-sidebars');

    document.getElementById('landing-screen').style.display = 'none';
    document.getElementById('public-header').style.display = 'none';
    
    // Hide new standalone screens
    const aiTools = document.getElementById('ai-tools-screen');
    const hospScreen = document.getElementById('hospitals-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (hospScreen) hospScreen.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Hide public footer in Dashboard
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'none';
    
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'block';
    appHeader.style.display = 'flex';

    // Update URL hash and clear active public nav
    updateAppHash('#/dashboard');
    setActivePublicNavLink(null);

    forceScrollToTop();
}

// Navigation: Switch to Landing Page (Home) Screen while logged in
function goToLandingPage() {
    if (userRole && userRole !== 'Patient') {
        goToDashboard();
        return;
    }
    // Show news sidebar for landing page
    document.body.classList.remove('no-sidebars');

    document.getElementById('landing-screen').style.display = 'flex';
    document.getElementById('public-header').style.display = 'flex';
    
    // Hide new standalone screens
    const aiTools = document.getElementById('ai-tools-screen');
    const hospScreen = document.getElementById('hospitals-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (hospScreen) hospScreen.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Show public footer
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';
    
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    appHeader.style.display = 'none';
    
    // Initialize default tool on landing page
    selectLandingTool('bmi');
    // Load dynamic trending medical news
    loadTrendingNews();
    initPromoCarousel();

    // Update URL hash and active nav
    updateAppHash('#/home');
    setActivePublicNavLink('pub-nav-home');

    forceScrollToTop();

    // Check if the user just registered and trigger Onboarding Tour
    if (localStorage.getItem('just_registered') === 'true') {
        localStorage.removeItem('just_registered');
        setTimeout(() => {
            showOnboardingTour();
        }, 800);
    }
}

// Standalone Screens Routing
function showAiToolsScreen(defaultTool = 'bmi') {
    // Hide sidebars on AI Tools screen
    document.body.classList.add('no-sidebars');

    // Hide other screens
    document.getElementById('landing-screen').style.display = 'none';
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    appHeader.style.display = 'none';
    
    const hospScreen = document.getElementById('hospitals-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (hospScreen) hospScreen.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Show AI Tools screen
    const aiTools = document.getElementById('ai-tools-screen');
    if (aiTools) aiTools.style.display = 'block';
    
    // Select desired tool (suppress carousel switching since carousel only exists on landing)
    const tools = ['bmi', 'symptom', 'drug'];
    let toolId = defaultTool;
    if (defaultTool === 'screener') toolId = 'symptom';
    if (defaultTool === 'interaction') toolId = 'drug';
    if (!tools.includes(toolId)) toolId = 'bmi';
    
    tools.forEach(t => {
        const card = document.getElementById(`landing-tool-card-${t}`);
        const view = document.getElementById(`landing-tool-view-${t}`);
        if (card) card.classList.toggle('active', t === toolId);
        if (view) view.style.display = t === toolId ? 'block' : 'none';
    });

    // Show public header and footer
    document.getElementById('public-header').style.display = 'flex';
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';

    // Update URL hash and active nav
    updateAppHash(`#/ai-tools/${toolId}`);
    setActivePublicNavLink('pub-nav-ai');
    
    forceScrollToTop();
}

function showHospitalSystemScreen() {
    // Hide sidebars on Hospital screen
    document.body.classList.add('no-sidebars');

    // Hide other screens
    document.getElementById('landing-screen').style.display = 'none';
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    appHeader.style.display = 'none';
    
    const aiTools = document.getElementById('ai-tools-screen');
    const newsScreen = document.getElementById('knowledge-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (newsScreen) newsScreen.style.display = 'none';
    
    // Show Hospital system screen
    const hospScreen = document.getElementById('hospitals-screen');
    if (hospScreen) hospScreen.style.display = 'block';
    
    // Show public header and footer
    document.getElementById('public-header').style.display = 'flex';
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';
    
    // Initialize embedded map on the page
    initPublicHospitalsMap();
    
    // Force Leaflet map layout recalculation after DOM has been painted
    setTimeout(() => {
        if (publicHospitalsMapInstance) {
            publicHospitalsMapInstance.invalidateSize();
        }
    }, 200);
    
    // Restore nearby hospitals from previous session if available
    restoreNearbyHospitals();

    // Update URL hash and active nav
    updateAppHash('#/hospitals');
    setActivePublicNavLink('pub-nav-hospitals');
    
    forceScrollToTop();
}

let publicHospitalsMapInstance = null;
let publicRoutePolylineBacking = null;
let publicRoutePolyline = null;
let publicUserMarker = null;

function initPublicHospitalsMap() {
    const mapDiv = document.getElementById('hospitals-routing-map');
    if (!mapDiv) return;

    if (publicHospitalsMapInstance) {
        publicHospitalsMapInstance.invalidateSize();
        return;
    }

    // Default center at Ho Chi Minh City center
    const defaultLat = 10.7769;
    const defaultLng = 106.7009;

    publicHospitalsMapInstance = L.map(mapDiv, {
        zoomControl: true,
        attributionControl: false
    }).setView([defaultLat, defaultLng], 12);
    
    window.map = publicHospitalsMapInstance;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(publicHospitalsMapInstance);

    // Add markers for branches
    const clinics = window.nearbyHospitals || [
        { name: 'CareConnect Quận 1', address: '123 Lê Lợi, Quận 1, TP.HCM', lat: 10.7769, lng: 106.7009 },
        { name: 'CareConnect Quận 3', address: '456 Võ Văn Tần, Quận 3, TP.HCM', lat: 10.7745, lng: 106.6889 },
        { name: 'CareConnect Thủ Đức', address: '789 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', lat: 10.8526, lng: 106.7720 }
    ];

    const bounds = [];
    clinics.forEach(clinic => {
        const branchIcon = L.divIcon({
            className: 'custom-map-marker-branch',
            html: `<div style="background:#16a34a; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid fa-hospital"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });

        const lat = clinic.lat;
        const lng = clinic.lng;
        bounds.push([lat, lng]);

        L.marker([lat, lng], { icon: branchIcon })
            .addTo(publicHospitalsMapInstance)
            .bindPopup(`<strong>${clinic.name}</strong><br><span style="font-size:11px;">${clinic.address || clinic.addr}</span>`);
    });

    if (bounds.length > 0) {
        publicHospitalsMapInstance.fitBounds(bounds, { padding: [50, 50] });
    }
}

async function showPublicRoute(branchName, branchLat, branchLng, branchAddress) {
    if (!publicHospitalsMapInstance) {
        initPublicHospitalsMap();
    }
    
    if (publicRoutePolylineBacking) {
        publicHospitalsMapInstance.removeLayer(publicRoutePolylineBacking);
        publicRoutePolylineBacking = null;
    }
    if (publicRoutePolyline) {
        publicHospitalsMapInstance.removeLayer(publicRoutePolyline);
        publicRoutePolyline = null;
    }
    if (publicUserMarker) {
        publicHospitalsMapInstance.removeLayer(publicUserMarker);
        publicUserMarker = null;
    }

    const destLat = parseFloat(branchLat);
    const destLng = parseFloat(branchLng);

    const processRoute = async (userLat, userLng) => {
        const userIcon = L.divIcon({
            className: 'custom-map-marker-user',
            html: `<div style="background:#0669ef; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid fa-street-view"></i></div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15]
        });
        publicUserMarker = L.marker([userLat, userLng], { icon: userIcon }).addTo(publicHospitalsMapInstance)
            .bindPopup(`<strong>Vị trí của bạn</strong>`);

        const infoBox = document.getElementById('hospitals-route-info-box');
        const infoEl = document.getElementById('hospitals-route-info');
        if (infoBox && infoEl) {
            infoBox.style.display = 'block';
            infoEl.innerHTML = `<span><i class="fa-solid fa-spinner fa-spin" style="color:var(--primary);"></i> Đang tìm đường đến ${branchName}...</span>`;
        }

        const routeUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson`;
        let distanceKm = 0;
        let durationMin = 0;
        let success = false;

        try {
            const response = await fetch(routeUrl);
            if (response.ok) {
                const data = await response.json();
                if (data.routes && data.routes.length > 0) {
                    const route = data.routes[0];
                    distanceKm = (route.distance / 1000).toFixed(1);
                    durationMin = Math.round(route.duration / 60);

                    const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                    
                    publicRoutePolylineBacking = L.polyline(coords, {
                        color: '#bae6fd',
                        weight: 8,
                        opacity: 0.5
                    }).addTo(publicHospitalsMapInstance);

                    publicRoutePolyline = L.polyline(coords, {
                        color: '#0669ef',
                        weight: 4,
                        opacity: 0.8,
                        dashArray: '2, 6'
                    }).addTo(publicHospitalsMapInstance);

                    publicRoutePolyline.bringToFront();
                    publicHospitalsMapInstance.fitBounds(publicRoutePolyline.getBounds(), { padding: [50, 50] });
                    success = true;
                }
            }
        } catch (e) {
            console.error('OSM Routing API error:', e);
        }

        if (!success) {
            publicRoutePolyline = L.polyline([[userLat, userLng], [destLat, destLng]], {
                color: '#0669ef',
                weight: 3,
                dashArray: '5, 8',
                opacity: 0.7
            }).addTo(publicHospitalsMapInstance);
            
            distanceKm = getHaversineDistance(userLat, userLng, destLat, destLng).toFixed(1);
            durationMin = Math.round(distanceKm * 2.5);
            publicHospitalsMapInstance.fitBounds(publicRoutePolyline.getBounds(), { padding: [50, 50] });
        }

        if (infoEl) {
            infoEl.innerHTML = `<div style="display:flex;align-items:center;gap:10px;">
                <div style="font-size:24px;color:var(--primary);"><i class="fa-solid fa-car-side"></i></div>
                <div style="text-align:left;">
                    <div style="font-weight:700;color:var(--dark);">Dẫn đường đến ${branchName}</div>
                    <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Khoảng cách: <strong>${distanceKm} km</strong> | Thời gian di chuyển: <strong>${durationMin} phút</strong></div>
                </div>
            </div>`;
        }
    };

    let uLat = null;
    let uLng = null;
    if (token && userRole === 'Patient' && cachedPatientCoords) {
        uLat = cachedPatientCoords.lat;
        uLng = cachedPatientCoords.lng;
    }

    if (uLat && uLng) {
        processRoute(uLat, uLng);
    } else if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => processRoute(pos.coords.latitude, pos.coords.longitude),
            () => processRoute(10.76262, 106.68231),
            { timeout: 5000 }
        );
    } else {
        processRoute(10.76262, 106.68231);
    }
}

function showBranchMapRoute(name, lat, lng, address) {
    const hospScreen = document.getElementById('hospitals-screen');
    if (hospScreen && hospScreen.style.display !== 'none') {
        showPublicRoute(name, lat, lng, address);
        
        // Scroll map into view on mobile
        const mapContainer = document.getElementById('hospitals-routing-map');
        if (mapContainer && window.innerWidth < 992) {
            mapContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    } else {
        viewBranchMap(name, lat, lng, address);
    }
}

function showKnowledgeScreen() {
    // Hide sidebars on Knowledge screen
    document.body.classList.add('no-sidebars');

    // Hide other screens
    document.getElementById('landing-screen').style.display = 'none';
    loginScreen.style.display = 'none';
    dashboardScreen.style.display = 'none';
    appHeader.style.display = 'none';
    
    const aiTools = document.getElementById('ai-tools-screen');
    const hospScreen = document.getElementById('hospitals-screen');
    if (aiTools) aiTools.style.display = 'none';
    if (hospScreen) hospScreen.style.display = 'none';
    
    // Show Medical Knowledge screen
    const newsScreen = document.getElementById('knowledge-screen');
    if (newsScreen) newsScreen.style.display = 'block';
    
    // Show public header and footer
    document.getElementById('public-header').style.display = 'flex';
    const footer = document.getElementById('public-footer');
    if (footer) footer.style.display = 'block';
    
    // Auto-load knowledge news if not loaded yet
    if (typeof window.loadKnowledgeNews === 'function') {
        const hasContent = document.getElementById('knowledge-news-container')?.children.length > 0;
        if (!hasContent) {
            window.loadKnowledgeNews();
        }
    }

    // Update URL hash and active nav
    updateAppHash('#/knowledge');
    setActivePublicNavLink('pub-nav-knowledge');
    
    forceScrollToTop();
}

function handleFooterCallback(e) {
    if (e) e.preventDefault();
    const phoneInput = document.getElementById('footer-callback-phone');
    if (phoneInput && phoneInput.value.trim()) {
        showToast(`Đã ghi nhận yêu cầu liên hệ từ số điện thoại: ${phoneInput.value.trim()}. CareConnect sẽ gọi lại cho bạn trong giây lát.`, 'success');
        phoneInput.value = '';
    } else {
        showToast('Vui lòng nhập số điện thoại hợp lệ.', 'error');
    }
}

// Helper: Show Toast Notifications
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    let icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-circle-exclamation';
    
    toast.innerHTML = `
        <i class="fa-solid ${icon}"></i>
        <div class="toast-message">${message}</div>
    `;
    
    container.appendChild(toast);
    
    toast.style.display = 'flex';
    
    // Auto-remove after 4 seconds
    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease-in reverse forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Admin Specific Functions
async function loadAdminStats() {
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            const stats = await response.json();
            document.getElementById('stat-total').innerText = stats.totalAppointments;
            document.getElementById('stat-pending').innerText = stats.statusBreakdown.Pending || 0;
            document.getElementById('stat-confirmed').innerText = stats.statusBreakdown.Confirmed || 0;
            document.getElementById('stat-cancelled').innerText = stats.statusBreakdown.Cancelled || 0;
            
            document.getElementById('stat-patients').innerText = stats.totalPatients;
            document.getElementById('stat-doctors').innerText = stats.totalDoctors;
        }
    } catch (error) {
        console.error("Lỗi tải thống kê admin:", error);
    }
}

// ============================================
//  ĐĂNG KÝ — Hiện/Ẩn fields theo vai trò
// ============================================
function onRegRoleChange(role) {
    const patientFields = document.getElementById('reg-patient-fields');
    const doctorFields  = document.getElementById('reg-doctor-fields');
    if (role === 'Patient') {
        patientFields.style.display = 'block';
        doctorFields.style.display  = 'none';
    } else {
        patientFields.style.display = 'none';
        doctorFields.style.display  = 'block';
    }
}

// ============================================
//  USERS TAB — Sub-Tab Switching
// ============================================
let currentUserSubTab = 'staff';

function switchUserSubTab(subTab) {
    currentUserSubTab = subTab;
    // Update buttons
    document.querySelectorAll('.user-subtab').forEach(b => b.classList.remove('active'));
    document.getElementById(`subtab-btn-${subTab}`).classList.add('active');
    // Show/hide panels
    document.getElementById('subtab-staff').style.display    = subTab === 'staff'    ? 'block' : 'none';
    document.getElementById('subtab-patients').style.display = subTab === 'patients' ? 'block' : 'none';
    // Load data for the selected sub-tab
    if (subTab === 'staff')    loadStaff();
    else                       loadPatients();
}

// ============================================
//  LOAD STAFF (Bác sĩ + Admin)
// ============================================
async function loadStaff() {
    const tbody = document.getElementById('staff-list-tbody');
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách nhân viên...</td></tr>`;
    try {
        const res = await fetch(`${API_BASE}/admin/staff`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const staff = await res.json();
        document.getElementById('staff-count').textContent = staff.length;
        renderStaff(staff);
    } catch {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:var(--danger);">Lỗi tải dữ liệu</td></tr>`;
    }
}

function renderStaff(list) {
    const tbody = document.getElementById('staff-list-tbody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);">Chưa có nhân viên nào</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((u, i) => {
        let roleBadge = '';
        if (u.role === 'Admin') {
            roleBadge = `<span class="badge badge-admin" style="background:hsl(280,80%,93%);color:hsl(280,70%,40%);"><i class="fa-solid fa-shield-halved"></i> Quản trị viên</span>`;
        } else if (u.role === 'Receptionist') {
            roleBadge = `<span class="badge badge-receptionist" style="background:var(--warning-light);color:var(--warning);border:1px solid rgba(255,193,7,0.3);"><i class="fa-solid fa-user-gear"></i> Lễ tân</span>`;
        } else if (u.role === 'Finance') {
            roleBadge = `<span class="badge badge-finance" style="background:rgba(16, 185, 129, 0.1);color:#10b981;border:1px solid rgba(16, 185, 129, 0.2);"><i class="fa-solid fa-file-invoice-dollar"></i> Kế toán</span>`;
        } else if (u.role === 'Pharmacist') {
            roleBadge = `<span class="badge badge-pharmacist" style="background:rgba(6, 182, 212, 0.1);color:#06b6d4;border:1px solid rgba(6, 182, 212, 0.2);"><i class="fa-solid fa-prescription-bottle-medical"></i> Dược sĩ</span>`;
        } else if (u.role === 'LabTechnician') {
            roleBadge = `<span class="badge badge-labtech" style="background:rgba(236, 72, 153, 0.1);color:#ec4899;border:1px solid rgba(236, 72, 153, 0.2);"><i class="fa-solid fa-microscope"></i> KTV Xét nghiệm</span>`;
        } else if (u.role === 'Doctor') {
            roleBadge = `<span class="badge badge-doctor" style="background:hsl(175,70%,90%);color:hsl(175,65%,35%);"><i class="fa-solid fa-user-doctor"></i> Bác sĩ</span>`;
        } else {
            roleBadge = `<span class="badge badge-secondary" style="background:#e2e8f0;color:#64748b;"><i class="fa-solid fa-user"></i> ${u.role}</span>`;
        }
        const spec = u.specialization
            ? `<span style="font-size:13px;color:var(--text-muted);">${u.specialization}</span>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const branchHtml = u.hospitalBranch
            ? `<span style="font-size:13px;color:var(--text-muted);">${getLocalizedBranchName(u.hospitalBranch) || '—'}</span>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const phone = u.phoneNumber
            ? `<a href="tel:${u.phoneNumber}" style="color:var(--primary);font-size:13px;">${u.phoneNumber}</a>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const canDelete = u.role !== 'Admin';
        return `<tr>
            <td style="color:var(--text-muted);font-size:13px;">${i + 1}</td>
            <td><strong>${u.fullName}</strong><br><span style="font-size:12px;color:var(--text-muted);">${u.email}</span></td>
            <td style="font-size:13px;">${u.email}</td>
            <td>${roleBadge}</td>
            <td>${spec}</td>
            <td>${branchHtml}</td>
            <td>${phone}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" style="margin-right:4px;" onclick="openAdminEditUserModal(${u.userId}, 'staff')"><i class="fa-solid fa-user-pen"></i> Sửa</button>
                ${canDelete
                    ? `<button class="btn btn-sm btn-danger" onclick="deleteUser(${u.userId},'${u.fullName}','staff')"><i class="fa-solid fa-trash"></i> Xóa</button>`
                    : `<span style="color:var(--text-muted);font-size:12px;">—</span>`}
            </td>
        </tr>`;
    }).join('');
}

// ============================================
//  LOAD PATIENTS
// ============================================
async function loadPatients() {
    const tbody = document.getElementById('patients-list-tbody');
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">
        <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách bệnh nhân...</td></tr>`;
    try {
        const res = await fetch(`${API_BASE}/admin/patients`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const patients = await res.json();
        document.getElementById('patients-count').textContent = patients.length;
        renderPatients(patients);
    } catch {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--danger);">Lỗi tải dữ liệu</td></tr>`;
    }
}

function renderPatients(list) {
    const tbody = document.getElementById('patients-list-tbody');
    if (!list.length) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">Chưa có bệnh nhân nào</td></tr>`;
        return;
    }
    tbody.innerHTML = list.map((u, i) => {
        const age = u.age !== null ? `${u.age} tuổi` : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const phone = u.phoneNumber
            ? `<a href="tel:${u.phoneNumber}" style="color:var(--primary);font-size:13px;">${u.phoneNumber}</a>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const gender = u.gender
            ? `<span class="badge" style="background:hsl(200,80%,95%);color:hsl(200,80%,30%);padding:2px 6px;border-radius:4px;font-size:12px;">${u.gender}</span>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const bloodType = u.bloodType
            ? `<span class="badge" style="background:hsl(0,80%,95%);color:hsl(0,80%,30%);padding:2px 6px;border-radius:4px;font-size:12px;font-weight:700;"><i class="fa-solid fa-droplet"></i> ${u.bloodType}</span>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const address = u.address
            ? `<span style="font-size:13px;color:var(--text-muted);" title="${u.address}">${u.address}</span>`
            : `<span style="color:var(--border-color);font-size:12px;">—</span>`;
        const appointmentsCount = `<span class="badge" style="background:rgba(0,0,0,0.05);color:var(--text);font-weight:600;padding:2px 6px;border-radius:4px;font-size:12px;">${u.totalAppointments} lịch</span>`;
        return `<tr>
            <td style="color:var(--text-muted);font-size:13px;">${i + 1}</td>
            <td><strong>${u.fullName}</strong><br><span style="font-size:12px;color:var(--text-muted);">${u.email}</span></td>
            <td>${phone}</td>
            <td>${age}</td>
            <td>${gender}</td>
            <td>${bloodType}</td>
            <td>${address}</td>
            <td>${appointmentsCount}</td>
            <td>
                <button class="btn btn-sm btn-outline-primary" style="margin-right:4px;" onclick="openAdminEditUserModal(${u.userId}, 'patients')"><i class="fa-solid fa-user-pen"></i> Sửa</button>
                <button class="btn btn-sm btn-danger" onclick="deleteUser(${u.userId},'${u.fullName}','patients')"><i class="fa-solid fa-trash"></i> Xóa</button>
            </td>
        </tr>`;
    }).join('');
}

async function deleteUser(id, name, listType) {
    if (!confirm(`Bạn có chắc chắn muốn xóa người dùng "${name}" (ID: #${id}) không? Hành động này không thể hoàn tác.`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast(data.message || 'Xóa người dùng thành công.', 'success');
            if (listType === 'staff') {
                loadStaff();
            } else if (listType === 'patients') {
                loadPatients();
            } else {
                switchUserSubTab(currentUserSubTab);
            }
            loadAdminStats();
        } else {
            showToast(data.message || 'Không thể xóa người dùng.', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

// Schedule Management Functions
async function loadAvailableSlots() {
    const doctorIdSelect = document.getElementById('booking-doctor');
    const dateInput = document.getElementById('booking-date');
    const slotSelect = document.getElementById('booking-slot');
    const slotsInteractiveContainer = document.getElementById('booking-slots-interactive-container');
    const slotsMessage = document.getElementById('booking-slots-message');
    const slotsMessageText = document.getElementById('booking-slots-message-text');
    const morningGrid = document.getElementById('booking-morning-slots-grid');
    const afternoonGrid = document.getElementById('booking-afternoon-slots-grid');

    if (!doctorIdSelect || !dateInput || !slotSelect) return;

    const doctorId = doctorIdSelect.value;
    const date = dateInput.value;

    if (!doctorId || !date) {
        if (slotsInteractiveContainer) slotsInteractiveContainer.style.display = 'none';
        if (slotsMessage) slotsMessage.style.display = 'flex';
        if (slotsMessageText) slotsMessageText.innerText = 'Vui lòng chọn Bác sĩ và Ngày khám để hiển thị ca khám trống.';
        return;
    }

    slotSelect.innerHTML = '<option value="" disabled selected>Đang tải ca khám trống...</option>';
    if (slotsInteractiveContainer) slotsInteractiveContainer.style.display = 'none';
    if (slotsMessage) slotsMessage.style.display = 'flex';
    if (slotsMessageText) slotsMessageText.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách ca khám trống...';

    try {
        const response = await fetch(`${API_BASE}/schedule/doctor/${doctorId}/date/${date}`);
        const slots = await response.json();

        if (!response.ok) {
            slotSelect.innerHTML = '<option value="" disabled selected>Lỗi tải ca khám</option>';
            if (slotsMessageText) slotsMessageText.innerText = 'Lỗi tải danh sách ca khám từ hệ thống.';
            return;
        }

        if (slots.length === 0) {
            slotSelect.innerHTML = '<option value="" disabled selected>Bác sĩ không có ca trực trống nào trong ngày này</option>';
            if (slotsMessageText) slotsMessageText.innerHTML = '<i class="fa-solid fa-circle-xmark" style="color:var(--danger);"></i> Bác sĩ không có ca trực trống nào trong ngày này. Vui lòng chọn ngày khác.';
            return;
        }

        let html = '<option value="" disabled selected>Chọn ca khám</option>';
        slots.forEach(slot => {
            html += `<option value="${slot}">${slot}</option>`;
        });
        slotSelect.innerHTML = html;

        // Populate interactive grids
        if (morningGrid && afternoonGrid) {
            morningGrid.innerHTML = '';
            afternoonGrid.innerHTML = '';

            const morningSlots = ["08:00 - 09:00", "09:00 - 10:00", "10:00 - 11:00", "11:00 - 12:00"];
            const afternoonSlots = ["14:00 - 15:00", "15:00 - 16:00", "16:00 - 17:00", "17:00 - 18:00"];

            // Combine slots from API and standard list
            let allSlots = [...new Set([...slots, ...morningSlots, ...afternoonSlots])];
            
            // Sort slots by time
            allSlots.sort();

            allSlots.forEach(slot => {
                const isAvailable = slots.includes(slot);
                const buttonHtml = `
                    <button type="button" class="booking-slot-btn ${isAvailable ? '' : 'disabled'}" 
                            data-slot="${slot}" 
                            ${isAvailable ? `onclick="selectBookingSlot('${slot}', this)"` : 'disabled'}>
                        <i class="fa-solid ${isAvailable ? 'fa-clock' : 'fa-lock'}"></i>
                        <span>${slot}</span>
                    </button>
                `;

                // Categorize by time
                const hour = parseInt(slot.split(':')[0]);
                if (hour < 12) {
                    morningGrid.insertAdjacentHTML('beforeend', buttonHtml);
                } else {
                    afternoonGrid.insertAdjacentHTML('beforeend', buttonHtml);
                }
            });

            // Display containers accordingly
            if (slotsInteractiveContainer) slotsInteractiveContainer.style.display = 'block';
            if (slotsMessage) slotsMessage.style.display = 'none';
        }
    } catch (error) {
        slotSelect.innerHTML = '<option value="" disabled selected>Lỗi kết nối máy chủ</option>';
        if (slotsMessageText) slotsMessageText.innerText = 'Lỗi kết nối máy chủ. Vui lòng thử lại sau.';
    }
}

function getLocalDateString(dateStr) {
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

async function loadDoctorScheduleForDate() {
    const dateInput = document.getElementById('schedule-date');
    if (!dateInput) return;

    const date = dateInput.value;
    if (!date) return;

    // Reset all checkboxes first
    const checkboxes = document.querySelectorAll('input[name="doctor-slots"]');
    checkboxes.forEach(cb => {
        cb.checked = false;
        cb.disabled = false;
    });

    try {
        const response = await fetch(`${API_BASE}/schedule/my-schedule`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (response.ok) {
            const schedules = await response.json();
            const daySchedules = schedules.filter(s => s && s.availableDate && getLocalDateString(s.availableDate) === date);
            
            daySchedules.forEach(ds => {
                const cb = Array.from(checkboxes).find(c => c.value.toLowerCase() === ds.timeSlot.toLowerCase());
                if (cb) {
                    cb.checked = true;
                }
            });

            // Lấy các ca đã có lịch hẹn để vô hiệu hóa
            const appointmentsRes = await fetch(`${API_BASE}/appointments/my-appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (appointmentsRes.ok) {
                const appointments = await appointmentsRes.json();
                const bookedSlots = appointments
                    .filter(a => a && a.appointmentDate && getLocalDateString(a.appointmentDate) === date && a.status !== 'Cancelled')
                    .map(a => a.timeSlot.toLowerCase());

                bookedSlots.forEach(slot => {
                    const cb = Array.from(checkboxes).find(c => c.value.toLowerCase() === slot);
                    if (cb) {
                        cb.checked = true;
                        cb.disabled = true;
                    }
                });
            }
        }
    } catch (error) {
        console.error("Lỗi tải lịch trực:", error);
    }
}

async function handleSaveSchedule(e) {
    e.preventDefault();
    const dateInput = document.getElementById('schedule-date');
    if (!dateInput) return;

    const date = dateInput.value;
    if (!date) return;

    const checkboxes = document.querySelectorAll('input[name="doctor-slots"]');
    const selectedSlots = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    try {
        const response = await fetch(`${API_BASE}/schedule`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                availableDate: date,
                timeSlots: selectedSlots
            })
        });

        const data = await response.json();

        if (response.ok) {
            showToast('Lưu cấu hình ca trực rảnh thành công!', 'success');
            loadDoctorScheduleForDate();
        } else {
            showToast(data.message || 'Lưu cấu hình ca trực thất bại.', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối máy chủ.', 'error');
    }
}

// ============================================
//  OVERVIEW DASHBOARD FUNCTIONS
// ============================================

async function loadOverviewData() {
    // Reset KPI to loading state
    ['ov-patients','ov-doctors','ov-appointments','ov-records'].forEach(id => {
        document.getElementById(id).innerText = '…';
    });

    try {
        const response = await fetch(`${API_BASE}/admin/overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) { logout(); return; }
        if (!response.ok) throw new Error('API error');

        const data = await response.json();
        const s = data.summary;

        // KPI Cards
        document.getElementById('ov-patients').innerText      = s.totalPatients;
        document.getElementById('ov-doctors').innerText       = s.totalDoctors;
        document.getElementById('ov-appointments').innerText  = s.totalAppointments;
        document.getElementById('ov-records').innerText       = s.totalRecords;

        // Completion Rate
        const rate = s.completionRate;
        document.getElementById('ov-completion-rate').innerText = `${rate}%`;
        // Animate progress bar after a tiny delay so the tab transition finishes
        setTimeout(() => {
            document.getElementById('ov-progress-bar').style.width = `${rate}%`;
        }, 80);

        // Status Breakdown Pills
        const sb = s.statusBreakdown;
        document.getElementById('ov-s-pending').innerText   = sb.Pending   || 0;
        document.getElementById('ov-s-confirmed').innerText = sb.Confirmed || 0;
        document.getElementById('ov-s-completed').innerText = sb.Completed || 0;
        document.getElementById('ov-s-cancelled').innerText = sb.Cancelled || 0;

        // Top Doctors Leaderboard
        const topDoctorsEl = document.getElementById('ov-top-doctors');
        if (!data.topDoctors || data.topDoctors.length === 0) {
            topDoctorsEl.innerHTML = `<div class="empty-placeholder" style="padding:20px;"><i class="fa-solid fa-user-doctor"></i><p>Chưa có dữ liệu.</p></div>`;
        } else {
            const rankClasses = ['gold', 'silver', 'bronze', 'other', 'other'];
            topDoctorsEl.innerHTML = data.topDoctors.map((doc, i) => `
                <div class="doctor-rank-item">
                    <div class="rank-badge ${rankClasses[i] || 'other'}">#${i + 1}</div>
                    <div class="rank-name">${doc.fullName}</div>
                    <div style="text-align:right;">
                        <div class="rank-count">${doc.completedCount}</div>
                        <div class="rank-label">ca hoàn thành</div>
                    </div>
                </div>
            `).join('');
        }

        // Recent Appointments Mini-Table
        const apptTbody = document.getElementById('ov-recent-appointments');
        if (!data.recentAppointments || data.recentAppointments.length === 0) {
            apptTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--text-muted);">Chưa có lịch hẹn.</td></tr>`;
        } else {
            apptTbody.innerHTML = data.recentAppointments.map(a => {
                const apptDate = new Date(a.appointmentDate).toLocaleDateString('vi-VN');
                const statusClass = `status-${a.status.toLowerCase()}`;
                return `
                    <tr>
                        <td><strong>#${a.appointmentId}</strong></td>
                        <td>${a.patientName}</td>
                        <td>${a.doctorName}</td>
                        <td style="font-size:12px;">${apptDate}<br><em>${a.timeSlot}</em></td>
                        <td><span class="status-badge ${statusClass}" style="font-size:11px;padding:3px 9px;">${translateStatus(a.status)}</span></td>
                    </tr>
                `;
            }).join('');
        }

        // Recent Records Mini-Table
        const recTbody = document.getElementById('ov-recent-records');
        if (!data.recentRecords || data.recentRecords.length === 0) {
            recTbody.innerHTML = `<tr><td colspan="4" style="text-align:center;color:var(--text-muted);">Chưa có bệnh án.</td></tr>`;
        } else {
            recTbody.innerHTML = data.recentRecords.map(r => {
                const recDate = new Date(r.recordDate).toLocaleDateString('vi-VN');
                return `
                    <tr>
                        <td><strong>#BA-${r.medicalRecordId}</strong><br><small style="color:var(--text-muted);">${recDate}</small></td>
                        <td>${r.patientName}</td>
                        <td>${r.doctorName}</td>
                        <td style="font-size:13px;font-style:italic;color:var(--dark);">${r.diagnosis}</td>
                    </tr>
                `;
            }).join('');
        }

    } catch (error) {
        console.error('Lỗi tải dữ liệu tổng quan:', error);
        showToast('Không thể tải dữ liệu tổng quan.', 'error');
    }
}

async function resetDatabase() {
    const confirmed1 = confirm(
        '⚠️ CẢNH BÁO: Thao tác này sẽ XÓA TOÀN BỘ DỮ LIỆU trong hệ thống và không thể hoàn tác!\n\nBạn có chắc chắn muốn tiếp tục?'
    );
    if (!confirmed1) return;

    const confirmed2 = confirm(
        '🔴 XÁC NHẬN LẦN CUỐI\n\nToàn bộ lịch hẹn, hồ sơ bệnh án và tài khoản người dùng sẽ bị xóa vĩnh viễn.\n\nNhấn OK để xác nhận đặt lại cơ sở dữ liệu.'
    );
    if (!confirmed2) return;

    const btn = document.getElementById('btn-reset-db');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đặt lại...';

    try {
        const response = await fetch(`${API_BASE}/admin/reset-db`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
            showToast('✅ ' + (data.message || 'Cơ sở dữ liệu đã được đặt lại thành công!'), 'success');
            // Force logout because all user accounts are gone
            setTimeout(() => {
                showToast('Phiên đăng nhập của bạn đã hết hạn. Vui lòng đăng nhập lại.', 'error');
                logout();
            }, 2500);
        } else {
            showToast(data.message || 'Đặt lại cơ sở dữ liệu thất bại.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Đặt Lại Database';
        }
    } catch (error) {
        showToast('Lỗi kết nối máy chủ.', 'error');
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-rotate-left"></i> Đặt Lại Database';
    }
}

// ============================================
//  ADMIN QUICK REGISTER MODAL
// ============================================

function openAdminRegisterModal(role) {
    const modal = document.getElementById('admin-register-modal');
    const titleEl = document.getElementById('admin-modal-title');
    const roleInput = document.getElementById('admin-reg-role');
    const roleBadge = document.getElementById('admin-reg-role-badge');
    const specGroup = document.getElementById('admin-reg-specialization-group');
    const branchGroup = document.getElementById('admin-reg-branch-group');
    const specInput = document.getElementById('admin-reg-specialization');
    const branchSelect = document.getElementById('admin-reg-branch');

    // Reset form
    document.getElementById('admin-register-form').reset();
    roleInput.value = role;

    if (role === 'Doctor') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-doctor"></i> Thêm Tài Khoản Bác Sĩ';
        roleBadge.innerHTML = '<i class="fa-solid fa-user-doctor"></i> Bác sĩ (Doctor)';
        roleBadge.className = 'role-display-badge doctor';
        roleBadge.style.background = '';
        roleBadge.style.color = '';
        roleBadge.style.borderColor = '';
        if (specGroup) specGroup.style.display = 'block';
        if (branchGroup) branchGroup.style.display = 'block';
        if (specInput) specInput.required = true;
        if (branchSelect) {
            branchSelect.required = true;
            if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
                branchSelect.options[1].text = `${window.nearbyHospitals[0].name} (Quận 1)`;
                branchSelect.options[2].text = `${window.nearbyHospitals[1].name} (Quận 3)`;
                branchSelect.options[3].text = `${window.nearbyHospitals[2].name} (Thủ Đức)`;
            } else {
                branchSelect.options[1].text = 'CareConnect Quận 1';
                branchSelect.options[2].text = 'CareConnect Quận 3';
                branchSelect.options[3].text = 'CareConnect Thủ Đức';
            }
        }
    } else if (role === 'Receptionist') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-gear"></i> Thêm Tài Khoản Lễ Tân';
        roleBadge.innerHTML = '<i class="fa-solid fa-user-gear"></i> Lễ tân (Receptionist)';
        roleBadge.className = 'role-display-badge receptionist';
        roleBadge.style.background = 'var(--warning-light)';
        roleBadge.style.color = 'var(--warning)';
        roleBadge.style.borderColor = 'rgba(255,193,7,0.3)';
        if (specGroup) specGroup.style.display = 'none';
        if (branchGroup) branchGroup.style.display = 'none';
        if (specInput) specInput.required = false;
        if (branchSelect) branchSelect.required = false;
    } else if (role === 'Admin') {
        titleEl.innerHTML = '<i class="fa-solid fa-user-shield"></i> Thêm Tài Khoản Admin';
        roleBadge.innerHTML = '<i class="fa-solid fa-user-shield"></i> Quản trị viên (Admin)';
        roleBadge.className = 'role-display-badge admin';
        roleBadge.style.background = 'rgba(139, 92, 246, 0.1)';
        roleBadge.style.color = '#8b5cf6';
        roleBadge.style.borderColor = 'rgba(139, 92, 246, 0.3)';
        if (specGroup) specGroup.style.display = 'none';
        if (branchGroup) branchGroup.style.display = 'none';
        if (specInput) specInput.required = false;
        if (branchSelect) branchSelect.required = false;
    } else if (role === 'Finance') {
        titleEl.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Thêm Tài Khoản Tài Chính';
        roleBadge.innerHTML = '<i class="fa-solid fa-file-invoice-dollar"></i> Tài chính (Finance)';
        roleBadge.className = 'role-display-badge finance';
        roleBadge.style.background = 'rgba(16, 185, 129, 0.1)';
        roleBadge.style.color = '#10b981';
        roleBadge.style.borderColor = 'rgba(16, 185, 129, 0.3)';
        if (specGroup) specGroup.style.display = 'none';
        if (branchGroup) branchGroup.style.display = 'none';
        if (specInput) specInput.required = false;
        if (branchSelect) branchSelect.required = false;
    } else {
        titleEl.innerHTML = '<i class="fa-solid fa-user"></i> Thêm Tài Khoản Bệnh Nhân';
        roleBadge.innerHTML = '<i class="fa-solid fa-user"></i> Bệnh nhân (Patient)';
        roleBadge.className = 'role-display-badge patient';
        roleBadge.style.background = '';
        roleBadge.style.color = '';
        roleBadge.style.borderColor = '';
        if (specGroup) specGroup.style.display = 'none';
        if (branchGroup) branchGroup.style.display = 'none';
        if (specInput) specInput.required = false;
        if (branchSelect) branchSelect.required = false;
    }

    modal.style.display = 'flex';
}

function closeAdminRegisterModal() {
    document.getElementById('admin-register-modal').style.display = 'none';
}

async function handleAdminRegister(e) {
    e.preventDefault();
    const fullName = document.getElementById('admin-reg-fullname').value.trim();
    const email    = document.getElementById('admin-reg-email').value.trim();
    const password = document.getElementById('admin-reg-password').value;
    const role     = document.getElementById('admin-reg-role').value;
    
    let specialization = null;
    let hospitalBranch = null;
    
    if (role === 'Doctor') {
        specialization = document.getElementById('admin-reg-specialization').value.trim();
        hospitalBranch = document.getElementById('admin-reg-branch').value;
    }

    const btn = document.getElementById('btn-submit-admin-register');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo tài khoản...';

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/admin/users`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fullName, email, password, role, specialization, hospitalBranch })
        });

        const data = await response.json();

        if (response.ok) {
            const roleVi = role === 'Doctor' ? 'Bác sĩ' : (role === 'Receptionist' ? 'Lễ tân' : (role === 'Admin' ? 'Admin' : (role === 'Finance' ? 'Tài chính' : 'Bệnh nhân')));
            showToast(`✅ Tạo tài khoản ${roleVi} "${fullName}" thành công!`, 'success');
            closeAdminRegisterModal();
            // Làm mới dữ liệu overview và danh sách người dùng
            loadOverviewData();
            loadAdminStats();
            loadStaff();
        } else {
            showToast(data.message || 'Tạo tài khoản thất bại.', 'error');
        }
    } catch (error) {
        showToast('Lỗi kết nối máy chủ.', 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tạo Tài Khoản';
    }
}

// ============================================
//  CARECONNECT AI ASSISTANT WIDGET LOGIC
// ============================================
let aiHistory = [];

function toggleAiChat(show) {
    const container = document.getElementById('ai-chat-container');
    
    if (show) {
        if (container) {
            container.style.display = 'flex';
            // Scroll to latest message
            const body = document.getElementById('ai-chat-body');
            if (body) body.scrollTop = body.scrollHeight;
        }

    } else {
        if (container) {
            container.style.display = 'none';
        }
    }
}

async function handleAiSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('ai-chat-input');
    const text = input.value.trim();
    if (!text) return;
    
    input.value = '';
    appendAiMessage(text, 'user');
    showAiTyping(true);
    
    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: text, history: aiHistory })
        });
        
        showAiTyping(false);
        
        if (response.ok) {
            const data = await response.json();
            appendAiMessage(data.response, 'bot', data.isRAGGrounded, data.groundingSources);
            
            // Lưu ngữ cảnh hội thoại (giới hạn 6 cặp hội thoại = 12 tin nhắn)
            aiHistory.push(`User: ${text}`);
            aiHistory.push(`Bot: ${data.response}`);
            if (aiHistory.length > 12) {
                aiHistory.shift();
                aiHistory.shift();
            }
            
            // Hiển thị các gợi ý trả lời nhanh mới
            renderAiQuickReplies(data.quickReplies || []);
        } else {
            appendAiMessage('🤖 Xin lỗi, tôi gặp chút sự cố khi xử lý câu hỏi này. Bạn thử lại nhé!', 'bot');
        }
    } catch {
        showAiTyping(false);
        appendAiMessage('🤖 Không thể kết nối với máy chủ AI. Bạn hãy thử lại sau.', 'bot');
    }
}

function appendAiMessage(text, sender, isRAGGrounded = false, groundingSources = []) {
    const body = document.getElementById('ai-chat-body');
    const msgDiv = document.createElement('div');
    msgDiv.className = `ai-message ai-msg-${sender}`;
    
    // Convert basic markdown format (bold, line breaks)
    let html = text
        .replace(/\n/g, '<br>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>');
        
    let badgeHtml = '';
    if (sender === 'bot' && isRAGGrounded) {
        badgeHtml = `
            <div class="rag-verified-badge" style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; color: #0d9488; background: #f0fdfa; border: 1px solid #99f6e4; padding: 4px 8px; border-radius: 6px; margin-bottom: 8px;">
                <span>🛡️ Đã xác thực tri thức nội bộ CareConnect (RAG Grounded)</span>
            </div>
        `;
    }

    let sourcesHtml = '';
    if (sender === 'bot' && groundingSources && groundingSources.length > 0) {
        const sourceTags = groundingSources.map(s => 
            `<button type="button" class="rag-source-chip" onclick="openRagDocDetail('${s.id}')" title="Bấm để xem chi tiết tài liệu: ${s.sourceDocument}">📄 ${s.title} (${Math.round(s.confidence * 100)}%) <i class="fa-solid fa-arrow-up-right-from-square" style="font-size: 9px; opacity: 0.7;"></i></button>`
        ).join(' ');
        sourcesHtml = `
            <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(0,0,0,0.1); font-size: 11px; color: #64748b; display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">
                <span style="font-weight: 600;">Căn cứ tài liệu:</span> ${sourceTags}
            </div>
        `;
    }

    msgDiv.innerHTML = `<div class="ai-msg-content">${badgeHtml}<div>${html}</div>${sourcesHtml}</div>`;
    body.appendChild(msgDiv);
    
    // Cuộn mượt hợp lý: nếu là bot trả lời thì cuộn đến đầu tin nhắn để người dùng dễ đọc từ đầu
    if (sender === 'bot') {
        msgDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    } else {
        body.scrollTop = body.scrollHeight;
    }
}

function renderAiQuickReplies(replies) {
    const container = document.getElementById('ai-quick-replies');
    if (!replies || replies.length === 0) {
        container.style.display = 'none';
        return;
    }
    container.style.display = 'flex';
    container.innerHTML = replies.map(r => {
        const safeText = r.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
        return `<button type="button" class="quick-reply-btn" onclick="sendQuickReply(this.getAttribute('data-reply'))" data-reply="${safeText}">${r}</button>`;
    }).join('');
}

function sendQuickReply(text) {
    document.getElementById('ai-chat-input').value = text;
    // bubbles: true ensures the event propagates to the listener registered via addEventListener
    document.getElementById('ai-chat-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

// ==========================================================
// CARECONNECT RAG KNOWLEDGE BASE EXPLORER & CITATION LOGIC
// ==========================================================
let ragKnowledgeCache = [];
let currentRagCategory = 'all';

async function openRagKnowledgeModal() {
    const modal = document.getElementById('rag-knowledge-modal');
    if (!modal) return;
    modal.style.display = 'flex';
    
    if (ragKnowledgeCache.length === 0) {
        await loadRagKnowledgeBase();
    } else {
        renderRagCards(ragKnowledgeCache);
    }
}

function closeRagKnowledgeModal() {
    const modal = document.getElementById('rag-knowledge-modal');
    if (modal) modal.style.display = 'none';
}

async function loadRagKnowledgeBase() {
    const container = document.getElementById('rag-knowledge-cards');
    if (!container) return;
    
    container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 24px; color: var(--primary);"></i>
            <p style="margin-top: 10px; font-size: 13px;">Đang tải 12 tài liệu tri thức CareConnect đã kiểm duyệt...</p>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/ai/rag/knowledge-base`);
        if (res.ok) {
            const data = await res.json();
            ragKnowledgeCache = data.chunks || [];
            const countEl = document.getElementById('rag-total-count');
            if (countEl) countEl.textContent = ragKnowledgeCache.length;
            renderRagCards(ragKnowledgeCache);
        } else {
            container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 30px;">Không thể tải kho tri thức. Vui lòng thử lại sau.</div>`;
        }
    } catch (err) {
        container.innerHTML = `<div style="text-align: center; color: #ef4444; padding: 30px;">Lỗi kết nối máy chủ tri thức.</div>`;
    }
}

function filterRagCategory(cat, btn) {
    currentRagCategory = cat;
    document.querySelectorAll('#rag-category-pills .rag-filter-pill').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    
    const searchVal = (document.getElementById('rag-modal-search')?.value || '').trim();
    if (searchVal) {
        handleRagSearchInput(searchVal);
    } else {
        const filtered = cat === 'all' 
            ? ragKnowledgeCache 
            : ragKnowledgeCache.filter(c => c.category === cat);
        renderRagCards(filtered);
    }
}

let ragSearchTimeout = null;
function handleRagSearchInput(query) {
    clearTimeout(ragSearchTimeout);
    ragSearchTimeout = setTimeout(async () => {
        const trimmed = query.trim();
        if (!trimmed) {
            const filtered = currentRagCategory === 'all' 
                ? ragKnowledgeCache 
                : ragKnowledgeCache.filter(c => c.category === currentRagCategory);
            renderRagCards(filtered);
            return;
        }

        const container = document.getElementById('rag-knowledge-cards');
        container.innerHTML = `
            <div style="text-align: center; padding: 30px; color: var(--text-muted);">
                <i class="fa-solid fa-circle-notch fa-spin" style="font-size: 20px; color: var(--primary);"></i>
                <p style="margin-top: 8px; font-size: 12.5px;">Đang tìm kiếm ngữ nghĩa theo Vector Cosine...</p>
            </div>
        `;

        try {
            const res = await fetch(`${API_BASE}/ai/rag/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: trimmed, topK: 10, minScore: 0.15 })
            });

            if (res.ok) {
                const data = await res.json();
                let results = data.results || [];
                if (currentRagCategory !== 'all') {
                    results = results.filter(r => r.category === currentRagCategory);
                }
                renderRagSearchResults(results, trimmed);
            } else {
                fallbackLocalSearch(trimmed);
            }
        } catch {
            fallbackLocalSearch(trimmed);
        }
    }, 300);
}

function removeVietnameseTones(str) {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd')
        .replace(/Đ/g, 'D')
        .toLowerCase();
}

function fallbackLocalSearch(query) {
    const lower = query.toLowerCase();
    const unaccented = removeVietnameseTones(lower);
    const filtered = ragKnowledgeCache.filter(c => {
        if (currentRagCategory !== 'all' && c.category !== currentRagCategory) return false;
        const titleLower = (c.title || '').toLowerCase();
        const titleUnaccented = removeVietnameseTones(titleLower);
        const matchTitle = titleLower.includes(lower) || titleUnaccented.includes(unaccented);
        const matchKeywords = c.keywords && c.keywords.some(k => {
            const kLower = k.toLowerCase();
            return kLower.includes(lower) || removeVietnameseTones(kLower).includes(unaccented);
        });
        const matchContent = c.content && (c.content.toLowerCase().includes(lower) || removeVietnameseTones(c.content.toLowerCase()).includes(unaccented));
        return matchTitle || matchKeywords || matchContent;
    });
    renderRagCards(filtered);
}

function renderRagCards(chunks) {
    const container = document.getElementById('rag-knowledge-cards');
    if (!container) return;

    if (!chunks || chunks.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-regular fa-folder-open" style="font-size: 32px; opacity: 0.5; margin-bottom: 8px;"></i>
                <p style="font-size: 13.5px;">Không tìm thấy tài liệu nào phù hợp với bộ lọc hiện tại.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = chunks.map(c => `
        <div class="rag-knowledge-card">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="background: #e0f2fe; color: #0369a1; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">${c.category}</span>
                        <span style="color: #94a3b8; font-size: 10.5px; font-family: monospace;">${c.id}</span>
                    </div>
                    <h4 style="font-size: 14.5px; font-weight: 750; color: #1e293b; margin: 0;">${c.title}</h4>
                </div>
                <button type="button" class="btn btn-secondary" onclick="openRagDocDetail('${c.id}')" style="padding: 4px 10px; font-size: 11.5px; border-radius: 6px; white-space: nowrap;">
                    Chi tiết <i class="fa-solid fa-arrow-right" style="font-size: 10px; margin-left: 2px;"></i>
                </button>
            </div>
            <p style="font-size: 12.5px; color: #475569; margin: 0; line-height: 1.55;">${c.preview || (c.content ? c.content.substring(0, 160) + '...' : '')}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                <span style="font-size: 11px; color: #0d9488; font-weight: 600;" title="${c.sourceDocument}">
                    🛡️ ${c.sourceDocument}
                </span>
                <button type="button" onclick="askAiAboutDoc('${c.id}', '${(c.title || '').replace(/'/g, "\\'")}')" style="background: none; border: none; color: #0284c7; font-size: 11.5px; font-weight: 600; cursor: pointer; padding: 2px 4px; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-robot"></i> Hỏi AI
                </button>
            </div>
        </div>
    `).join('');
}

function renderRagSearchResults(results, query) {
    const container = document.getElementById('rag-knowledge-cards');
    if (!container) return;

    if (!results || results.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                <i class="fa-solid fa-magnifying-glass" style="font-size: 28px; opacity: 0.5; margin-bottom: 8px;"></i>
                <p style="font-size: 13.5px;">Không tìm thấy tài liệu khớp với từ khóa "${query}".</p>
            </div>
        `;
        return;
    }

    container.innerHTML = results.map(r => `
        <div class="rag-knowledge-card" style="border-left: 4px solid #0d9488;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
                <div>
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <span style="background: #e0f2fe; color: #0369a1; font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 4px;">${r.category}</span>
                        <span style="background: #f0fdfa; color: #0d9488; font-size: 10.5px; font-weight: 700; border: 1px solid #99f6e4; padding: 1px 6px; border-radius: 4px;">Độ khớp: ${Math.round(r.score * 100)}%</span>
                    </div>
                    <h4 style="font-size: 14.5px; font-weight: 750; color: #1e293b; margin: 0;">${r.title}</h4>
                </div>
                <button type="button" class="btn btn-secondary" onclick="openRagDocDetailByObject(${JSON.stringify(r).replace(/"/g, '&quot;')})" style="padding: 4px 10px; font-size: 11.5px; border-radius: 6px; white-space: nowrap;">
                    Chi tiết <i class="fa-solid fa-arrow-right" style="font-size: 10px;"></i>
                </button>
            </div>
            <p style="font-size: 12.5px; color: #475569; margin: 0; line-height: 1.55;">${r.snippet || (r.fullContent ? r.fullContent.substring(0, 160) + '...' : '')}</p>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px; padding-top: 6px; border-top: 1px dashed #e2e8f0;">
                <span style="font-size: 11px; color: #0d9488; font-weight: 600;">
                    🛡️ ${r.sourceDocument}
                </span>
                <button type="button" onclick="askAiAboutDoc('', '${(r.title || '').replace(/'/g, "\\'")}')" style="background: none; border: none; color: #0284c7; font-size: 11.5px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 4px;">
                    <i class="fa-solid fa-robot"></i> Hỏi AI
                </button>
            </div>
        </div>
    `).join('');
}

async function openRagDocDetail(docId) {
    // Search in cache first
    let doc = ragKnowledgeCache.find(c => c.id === docId);
    if (!doc || !doc.content) {
        try {
            const res = await fetch(`${API_BASE}/ai/rag/chunk/${docId}`);
            if (res.ok) {
                doc = await res.json();
            }
        } catch (e) {
            console.error(e);
        }
    }

    if (doc) {
        displayDocInModal(doc);
    }
}

function openRagDocDetailByObject(obj) {
    displayDocInModal({
        id: obj.id || '',
        title: obj.title,
        category: obj.category,
        sourceDocument: obj.sourceDocument,
        keywords: obj.keywords || [],
        content: obj.fullContent || obj.content || obj.snippet
    });
}

function displayDocInModal(doc) {
    document.getElementById('rag-detail-badge').textContent = doc.category || 'Tài liệu';
    document.getElementById('rag-detail-id').textContent = doc.id || '';
    document.getElementById('rag-detail-title').textContent = doc.title || '';
    document.getElementById('rag-detail-source').textContent = doc.sourceDocument || 'Tài liệu nội bộ CareConnect';
    document.getElementById('rag-detail-content').textContent = doc.content || doc.preview || '';

    const kwContainer = document.getElementById('rag-detail-keywords');
    if (doc.keywords && doc.keywords.length > 0) {
        kwContainer.innerHTML = doc.keywords.map(k => `<span class="rag-keyword-chip">#${k}</span>`).join(' ');
    } else {
        kwContainer.innerHTML = '<span style="font-size: 11px; color: #94a3b8;">Không có từ khóa phụ</span>';
    }

    const askBtn = document.getElementById('rag-detail-ask-btn');
    askBtn.onclick = () => {
        closeRagDocDetailModal();
        closeRagKnowledgeModal();
        askAiAboutDoc(doc.id, doc.title);
    };

    document.getElementById('rag-doc-detail-modal').style.display = 'flex';
}

function closeRagDocDetailModal() {
    const modal = document.getElementById('rag-doc-detail-modal');
    if (modal) modal.style.display = 'none';
}

function askAiAboutDoc(docId, title) {
    closeRagDocDetailModal();
    closeRagKnowledgeModal();
    toggleAiChat(true);
    sendQuickReply(`Cho tôi biết thông tin chi tiết về ${title}`);
}

function showAiTyping(show) {
    const body = document.getElementById('ai-chat-body');
    const existing = document.getElementById('ai-typing-indicator');
    if (existing) existing.remove();
    
    if (show) {
        const indicator = document.createElement('div');
        indicator.id = 'ai-typing-indicator';
        indicator.className = 'typing-indicator';
        indicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        body.appendChild(indicator);
        body.scrollTop = body.scrollHeight;
    }
}

function showAiChatHistory(chatHistoryJson) {
    const modal = document.getElementById('ai-chat-history-modal');
    const content = document.getElementById('ai-chat-history-content');
    if (!modal || !content) return;

    content.innerHTML = '';
    try {
        const decodedJson = decodeURIComponent(chatHistoryJson);
        const history = JSON.parse(decodedJson);
        if (Array.isArray(history)) {
            history.forEach(item => {
                let sender = 'user';
                let text = '';
                
                if (typeof item === 'string') {
                    if (item.startsWith('User: ')) {
                        sender = 'user';
                        text = item.substring(6);
                    } else if (item.startsWith('Bot: ')) {
                        sender = 'ai';
                        text = item.substring(5);
                    } else if (item.startsWith('AI: ')) {
                        sender = 'ai';
                        text = item.substring(4);
                    } else {
                        sender = 'ai';
                        text = item;
                    }
                } else if (typeof item === 'object' && item !== null) {
                    sender = item.sender === 'user' ? 'user' : 'ai';
                    text = item.text || '';
                }

                const msgDiv = document.createElement('div');
                msgDiv.style.padding = '12px 14px';
                msgDiv.style.borderRadius = '12px';
                msgDiv.style.fontSize = '13.5px';
                msgDiv.style.lineHeight = '1.45';
                msgDiv.style.maxWidth = '85%';
                msgDiv.style.wordBreak = 'break-word';

                if (sender === 'user') {
                    msgDiv.style.alignSelf = 'flex-end';
                    msgDiv.style.background = 'hsl(170, 75%, 95%)';
                    msgDiv.style.color = 'hsl(170, 85%, 20%)';
                    msgDiv.style.border = '1px solid hsl(170, 40%, 88%)';
                } else {
                    msgDiv.style.alignSelf = 'flex-start';
                    msgDiv.style.background = '#f1f5f9';
                    msgDiv.style.color = '#1e293b';
                    msgDiv.style.border = '1px solid #e2e8f0';
                }

                let html = text
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>');

                msgDiv.innerHTML = `<strong style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; opacity: 0.8;">${sender === 'user' ? 'Bệnh nhân' : 'Trợ lý AI'}:</strong><div style="margin-top: 4px;">${html}</div>`;
                content.appendChild(msgDiv);
            });
        } else {
            content.innerHTML = `<p style="color: var(--text-muted); font-style: italic;">Không có lịch sử hội thoại.</p>`;
        }
    } catch (e) {
        content.innerHTML = `<p style="color: var(--text-muted); font-style: italic; white-space: pre-wrap;">Lịch sử tư vấn: ${chatHistoryJson}</p>`;
    }

    modal.style.display = 'flex';
}

function closeAiChatHistoryModal() {
    const modal = document.getElementById('ai-chat-history-modal');
    if (modal) modal.style.display = 'none';
}

// ============================================
//  SYMPTOM ANALYZER LOGIC
// ============================================
let suggestedSpecialization = '';

async function analyzeSymptomsWithAi() {
    const symptoms = document.getElementById('booking-symptoms').value.trim();
    if (!symptoms) {
        showToast('Vui lòng nhập triệu chứng y tế để AI hỗ trợ phân tích.', 'error');
        return;
    }
    
    const btn = document.getElementById('btn-ai-analyze');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang phân tích...';
    
    try {
        const response = await fetch(`${API_BASE}/ai/analyze-symptoms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ symptoms })
        });
        
        btn.disabled = false;
        btn.innerHTML = originalText;
        
        if (response.ok) {
            const data = await response.json();
            
            // Lấy chuyên khoa từ AI trả về
            suggestedSpecialization = data.suggestedSpecialization || '';
            const box = document.getElementById('ai-suggestion-box');
            const specSpan = document.getElementById('ai-suggested-spec');
            
            if (suggestedSpecialization) {
                specSpan.textContent = suggestedSpecialization;
                box.style.display = 'block';
            } else {
                specSpan.textContent = 'Nội khoa tổng quát (Đề xuất gợi ý)';
                suggestedSpecialization = 'Nội khoa tổng quát';
                box.style.display = 'block';
            }
            
            showToast('AI phân tích triệu chứng thành công!', 'success');
        } else {
            showToast('Gặp lỗi khi phân tích triệu chứng y khoa.', 'error');
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        showToast('Lỗi kết nối máy chủ phân tích y tế.', 'error');
    }
}

function applySuggestedSpec(e) {
    if (e) e.preventDefault();
    if (!suggestedSpecialization) return;
    
    const specialtySelect = document.getElementById('booking-specialty');
    if (specialtySelect) {
        // Normalize name to match option value
        const opts = Array.from(specialtySelect.options);
        const match = opts.find(o => 
            o.value.toLowerCase().includes(suggestedSpecialization.toLowerCase()) || 
            o.text.toLowerCase().includes(suggestedSpecialization.toLowerCase())
        );
        if (match) {
            specialtySelect.value = match.value;
        } else {
            specialtySelect.value = "";
        }
    }
    
    // Filter doctors
    filterDoctorsBySelectedBranch();
    
    const doctorSelect = document.getElementById('booking-doctor');
    const selectedDocId = parseInt(doctorSelect.value);
    
    if (!isNaN(selectedDocId)) {
        const selectedDoc = (window.allDoctors || []).find(d => d.userId === selectedDocId);
        if (selectedDoc) {
            showToast(`Đã áp dụng chuyên khoa: ${suggestedSpecialization} (${selectedDoc.fullName})`, 'success');
            return;
        }
    }
    
    showToast(`Hiện tại chưa có bác sĩ trực thuộc chuyên khoa ${suggestedSpecialization}.`, 'warning');
}

// ============================================
// HEALTH AI TOOLS LOGIC (CareConnect Tools)
// ============================================
let activeToolId = 'bmi';
let computedBmiData = null;
let suggestedSymptomSpecialty = '';

function selectTool(toolId) {
    activeToolId = toolId;
    
    // Toggle active classes on cards
    document.querySelectorAll('.tool-select-card').forEach(card => card.classList.remove('active'));
    document.getElementById(`tool-card-${toolId}`).classList.add('active');
    
    // Toggle visible section
    document.querySelectorAll('.tool-view-section').forEach(sec => sec.style.display = 'none');
    document.getElementById(`tool-view-${toolId}`).style.display = 'block';
}

function calculateBmi(e) {
    if (e) e.preventDefault();
    
    const gender = document.getElementById('bmi-gender').value;
    const age = parseInt(document.getElementById('bmi-age').value);
    const height = parseFloat(document.getElementById('bmi-height').value);
    const weight = parseFloat(document.getElementById('bmi-weight').value);
    const activity = parseFloat(document.getElementById('bmi-activity').value);
    
    if (!height || !weight || !age) {
        showToast('Vui lòng điền đầy đủ chiều cao, cân nặng và tuổi.', 'error');
        return;
    }
    
    // BMI = weight / (height/100)^2
    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    
    // BMR (Mifflin-St Jeor)
    let bmr = 0;
    if (gender === 'male') {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    
    // TDEE
    const tdee = Math.round(bmr * activity);
    
    // Determine BMI Status & Color
    let status = 'Bình thường';
    let statusClass = 'bg-success';
    let barWidth = 50;
    let barColor = 'var(--success)';
    
    if (bmi < 18.5) {
        status = 'Thiếu cân';
        statusClass = 'bg-info';
        barWidth = Math.max(10, (bmi / 18.5) * 25);
        barColor = '#0284c7';
    } else if (bmi >= 18.5 && bmi < 25) {
        status = 'Bình thường';
        statusClass = 'bg-success';
        barWidth = 25 + ((bmi - 18.5) / 6.5) * 25;
        barColor = 'var(--success)';
    } else if (bmi >= 25 && bmi < 30) {
        status = 'Thừa cân';
        statusClass = 'bg-warning';
        barWidth = 50 + ((bmi - 25) / 5) * 25;
        barColor = 'var(--warning)';
    } else {
        status = 'Béo phì';
        statusClass = 'bg-danger';
        barWidth = Math.min(100, 75 + ((bmi - 30) / 15) * 25);
        barColor = 'var(--danger)';
    }
    
    // Store globally
    computedBmiData = { gender, age, height, weight, bmi, status, bmr, tdee };
    
    // Render outputs
    document.getElementById('bmi-value-text').textContent = bmi;
    document.getElementById('bmr-value-text').textContent = `${bmr} kcal`;
    document.getElementById('tdee-value-text').textContent = `${tdee} kcal`;
    
    const badge = document.getElementById('bmi-status-badge');
    badge.textContent = status;
    badge.className = `badge ${statusClass}`;
    
    const progressBar = document.getElementById('bmi-progress-bar');
    progressBar.style.width = `${barWidth}%`;
    progressBar.style.backgroundColor = barColor;
    
    // Show results box, hide placeholder
    document.getElementById('bmi-results-placeholder').style.display = 'none';
    document.getElementById('bmi-results-box').style.display = 'block';
    
    // Hide diet advice output since data changed
    document.getElementById('ai-diet-box').style.display = 'none';
    
    showToast('Đã tính toán các chỉ số sức khỏe cơ thể!', 'success');
}

async function getAiDietAdvice() {
    if (!computedBmiData) return;
    
    const box = document.getElementById('ai-diet-box');
    const content = document.getElementById('ai-diet-content');
    const btn = document.getElementById('btn-ai-diet');
    
    box.style.display = 'block';
    content.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang lập thực đơn & chế độ tập luyện...';
    btn.disabled = true;
    
    const genderVi = computedBmiData.gender === 'male' ? 'Nam' : 'Nữ';
    const prompt = `Tôi cần lời khuyên dinh dưỡng và chế độ tập luyện y tế cho bệnh nhân có thông tin:\n` +
                   `- Giới tính: ${genderVi}\n` +
                   `- Tuổi: ${computedBmiData.age} tuổi\n` +
                   `- Chiều cao: ${computedBmiData.height} cm\n` +
                   `- Cân nặng: ${computedBmiData.weight} kg\n` +
                   `- Chỉ số BMI: ${computedBmiData.bmi} (${computedBmiData.status})\n` +
                   `- Chỉ số BMR: ${computedBmiData.bmr} kcal (Năng lượng chuyển hóa nền)\n` +
                   `- Chỉ số TDEE: ${computedBmiData.tdee} kcal (Nhu cầu tiêu thụ năng lượng hàng ngày)\n\n` +
                   `Hãy đề xuất:\n` +
                   `1. Thực đơn dinh dưỡng mẫu 1 ngày (gồm Sáng, Trưa, Tối, Bữa phụ) để giúp họ duy trì sức khỏe hoặc đạt mức cân lý tưởng tốt nhất.\n` +
                   `2. Chế độ luyện tập thể dục phù hợp (tần suất, các bài tập khuyên dùng).\n` +
                   `3. Khuyến cáo y khoa cụ thể dựa trên chỉ số BMI.\n` +
                   `Yêu cầu: Viết ngắn gọn, trực quan bằng tiếng Việt dưới dạng gạch đầu dòng rõ ràng, chuyên nghiệp.`;
                   
    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        btn.disabled = false;
        if (response.ok) {
            const data = await response.json();
            
            // Convert simple Markdown text to HTML basic format
            let formattedResponse = data.response
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/-\s(.*?)(<br>|$)/g, '<li>$1</li>');
                
            content.innerHTML = formattedResponse;
            showToast('Đã nhận thực đơn dinh dưỡng AI!', 'success');
        } else {
            content.innerHTML = 'Không thể kết nối đến máy chủ AI để lấy thực đơn. Vui lòng thử lại sau.';
            showToast('Lỗi lấy thực đơn AI.', 'error');
        }
    } catch (error) {
        btn.disabled = false;
        content.innerHTML = 'Lỗi kết nối máy chủ AI. Vui lòng kiểm tra mạng.';
        showToast('Lỗi kết nối AI.', 'error');
    }
}

// ==========================================
// #region HEALTH TOOLS ON LANDING PAGE & DASHBOARD DRUG LOOKUP
// ==========================================

let computedLandingBmiData = null;

function selectLandingTool(toolName) {
    // Normalize aliases that might be sent from index.html (like 'screener' or 'interaction')
    let toolId = toolName;
    if (toolName === 'screener') toolId = 'symptom';
    if (toolName === 'interaction') toolId = 'drug';

    const tools = ['bmi', 'symptom', 'drug'];
    tools.forEach(t => {
        const card = document.getElementById(`landing-tool-card-${t}`);
        const view = document.getElementById(`landing-tool-view-${t}`);
        if (card) card.classList.remove('active');
        if (view) view.style.display = 'none';
    });
    
    const activeCard = document.getElementById(`landing-tool-card-${toolId}`);
    const activeView = document.getElementById(`landing-tool-view-${toolId}`);
    if (activeCard) activeCard.classList.add('active');
    if (activeView) activeView.style.display = 'block';

    // Also switch the corresponding carousel slide
    if (typeof switchPromoSlide === 'function') {
        let slideIndex = 0; // symptom
        if (toolId === 'bmi') slideIndex = 1;
        if (toolId === 'drug') slideIndex = 2;
        switchPromoSlide(slideIndex, true);
    }
}

function calculateLandingBmi(e) {
    if (e) e.preventDefault();
    
    const gender = document.getElementById('landing-bmi-gender').value;
    const age = parseInt(document.getElementById('landing-bmi-age').value);
    const height = parseFloat(document.getElementById('landing-bmi-height').value);
    const weight = parseFloat(document.getElementById('landing-bmi-weight').value);
    const activity = parseFloat(document.getElementById('landing-bmi-activity').value);
    
    if (!height || !weight || !age) {
        showToast('Vui lòng điền đầy đủ chiều cao, cân nặng và tuổi.', 'error');
        return;
    }
    
    const heightM = height / 100;
    const bmi = (weight / (heightM * heightM)).toFixed(1);
    
    let bmr = 0;
    if (gender === 'male') {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
        bmr = Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
    
    const tdee = Math.round(bmr * activity);
    
    let status = 'Bình thường';
    let statusClass = 'bg-success';
    let barWidth = 50;
    let barColor = 'var(--success)';
    
    if (bmi < 18.5) {
        status = 'Thiếu cân';
        statusClass = 'bg-info';
        barWidth = Math.max(10, (bmi / 18.5) * 25);
        barColor = '#0284c7';
    } else if (bmi >= 18.5 && bmi < 25) {
        status = 'Bình thường';
        statusClass = 'bg-success';
        barWidth = 25 + ((bmi - 18.5) / 6.5) * 25;
        barColor = 'var(--success)';
    } else if (bmi >= 25 && bmi < 30) {
        status = 'Thừa cân';
        statusClass = 'bg-warning';
        barWidth = 50 + ((bmi - 25) / 5) * 25;
        barColor = 'var(--warning)';
    } else {
        status = 'Béo phì';
        statusClass = 'bg-danger';
        barWidth = Math.min(100, 75 + ((bmi - 30) / 15) * 25);
        barColor = 'var(--danger)';
    }
    
    computedLandingBmiData = { gender, age, height, weight, bmi, status, bmr, tdee };
    
    document.getElementById('landing-bmi-value-text').textContent = bmi;
    document.getElementById('landing-bmr-value-text').textContent = `${bmr} kcal`;
    document.getElementById('landing-tdee-value-text').textContent = `${tdee} kcal`;
    
    const badge = document.getElementById('landing-bmi-status-badge');
    badge.textContent = status;
    badge.className = `badge ${statusClass}`;
    
    const progressBar = document.getElementById('landing-bmi-progress-bar');
    progressBar.style.width = `${barWidth}%`;
    progressBar.style.backgroundColor = barColor;
    
    document.getElementById('landing-bmi-results-placeholder').style.display = 'none';
    document.getElementById('landing-bmi-results-box').style.display = 'block';
    document.getElementById('landing-ai-diet-box').style.display = 'none';
    
    showToast('Đã tính toán chỉ số sức khỏe!', 'success');
}

async function getLandingAiDietAdvice() {
    if (!computedLandingBmiData) return;
    
    const box = document.getElementById('landing-ai-diet-box');
    const content = document.getElementById('landing-ai-diet-content');
    const btn = document.getElementById('landing-btn-ai-diet');
    
    box.style.display = 'block';
    content.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang lập thực đơn & chế độ tập luyện...';
    btn.disabled = true;
    
    const genderVi = computedLandingBmiData.gender === 'male' ? 'Nam' : 'Nữ';
    const prompt = `Tôi cần lời khuyên dinh dưỡng và chế độ tập luyện y tế cho bệnh nhân có thông tin:\n` +
                   `- Giới tính: ${genderVi}\n` +
                   `- Tuổi: ${computedLandingBmiData.age}\n` +
                   `- Chiều cao: ${computedLandingBmiData.height} cm\n` +
                   `- Cân nặng: ${computedLandingBmiData.weight} kg\n` +
                   `- Chỉ số BMI: ${computedLandingBmiData.bmi} (${computedLandingBmiData.status})\n` +
                   `- Chỉ số BMR: ${computedLandingBmiData.bmr} kcal\n` +
                   `- Chỉ số TDEE: ${computedLandingBmiData.tdee} kcal\n\n` +
                   `Hãy đề xuất:\n` +
                   `1. Thực đơn chi tiết 3 bữa trong ngày (Sáng, Trưa, Tối).\n` +
                   `2. Chế độ luyện tập thể dục thể thao phù hợp (loại hình, thời gian).\n` +
                   `3. Khuyến cáo y khoa cụ thể dựa trên chỉ số BMI.\n` +
                   `Yêu cầu: Viết ngắn gọn, trực quan bằng tiếng Việt dưới dạng gạch đầu dòng rõ ràng, chuyên nghiệp.`;
                   
    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        btn.disabled = false;
        if (response.ok) {
            const data = await response.json();
            
            let formattedResponse = data.response
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>')
                .replace(/-\s(.*?)(<br>|$)/g, '<li>$1</li>');
                
            content.innerHTML = formattedResponse;
            showToast('Đã nhận thực đơn dinh dưỡng AI!', 'success');
        } else {
            content.innerHTML = 'Gặp lỗi khi lấy lời khuyên từ AI. Vui lòng thử lại sau.';
            showToast('Lỗi lấy thực đơn AI.', 'error');
        }
    } catch (error) {
        btn.disabled = false;
        content.innerHTML = 'Lỗi kết nối máy chủ AI. Vui lòng kiểm tra mạng.';
        showToast('Lỗi kết nối AI.', 'error');
    }
}

async function checkDrugInteraction(e) {
    if (e) e.preventDefault();
    
    const drug1 = document.getElementById('drug-select-1').value;
    const drug2 = document.getElementById('drug-select-2').value;
    const extraNotes = document.getElementById('drug-extra-notes').value.trim();
    
    if (!drug1 || !drug2) {
        showToast('Vui lòng chọn đủ hai loại thuốc để kiểm tra tương tác.', 'error');
        return;
    }
    if (drug1 === drug2) {
        showToast('Vui lòng chọn hai loại thuốc khác nhau.', 'warning');
        return;
    }
    
    document.getElementById('drug-results-placeholder').style.display = 'none';
    const box = document.getElementById('drug-results-box');
    box.style.display = 'block';
    
    const alertContainer = document.getElementById('drug-alert-container');
    const alertIcon = document.getElementById('drug-alert-icon');
    const alertTitle = document.getElementById('drug-alert-title');
    const alertDesc = document.getElementById('drug-alert-desc');
    const aiExplanation = document.getElementById('drug-ai-explanation');
    
    aiExplanation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý dược lâm sàng AI đang đối chiếu dữ liệu tương tác...';
    
    let severity = 'safe';
    let title = 'Tương tác an toàn';
    let desc = 'Không tìm thấy tương tác chéo nguy hiểm đã biết giữa hai loại thuốc này ở liều thông thường.';
    let iconClass = 'fa-circle-check';
    
    const drugPair = [drug1, drug2].sort().join('+');
    
    const interactionMatrix = {
        'Aspirin+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm (Chống chỉ định)',
            desc: 'Cả hai thuốc đều làm giảm khả năng đông máu. Sử dụng đồng thời làm tăng cực mạnh nguy cơ xuất huyết tiêu hóa và chảy máu nội tạng nguy kịch.'
        },
        'Aspirin+Ibuprofen': {
            severity: 'moderate',
            title: 'Tương tác trung bình (Cần thận trọng)',
            desc: 'Ibuprofen có thể làm giảm tác dụng bảo vệ tim mạch của Aspirin liều thấp và tăng nguy cơ gây viêm loét dạ dày tá tràng.'
        },
        'Ibuprofen+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm',
            desc: 'Kháng viêm NSAID (Ibuprofen) kết hợp với thuốc chống đông (Warfarin) gây nguy cơ chảy máu dạ dày nghiêm trọng.'
        },
        'Amlodipine+Simvastatin': {
            severity: 'moderate',
            title: 'Tương tác trung bình',
            desc: 'Amlodipine có thể làm tăng nồng độ Simvastatin trong máu, làm tăng nguy cơ tổn thương cơ (tiêu cơ vân).'
        },
        'Ciprofloxacin+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm',
            desc: 'Ciprofloxacin có thể làm tăng tác dụng chống đông của Warfarin, dẫn đến tăng nguy cơ chảy máu bất thường.'
        }
    };
    
    if (interactionMatrix[drugPair]) {
        const match = interactionMatrix[drugPair];
        severity = match.severity;
        title = match.title;
        desc = match.desc;
        iconClass = severity === 'severe' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
    }
    
    alertContainer.className = `interaction-alert ${severity}`;
    alertIcon.className = `fa-solid ${iconClass}`;
    alertTitle.textContent = title;
    alertDesc.textContent = desc;
    
    const prompt = `Bạn là Dược sĩ AI hướng dẫn an toàn sử dụng thuốc của CareConnect. Hãy phân tích chuyên sâu mối tương tác giữa hai loại thuốc sau:\n` +
                   `1. Thuốc 1: ${drug1}\n` +
                   `2. Thuốc 2: ${drug2}\n` +
                   `Thông tin bệnh cảnh: ${extraNotes || 'Không có ghi chú gì đặc biệt'}\n\n` +
                   `Hãy giải thích cơ chế tương tác (nếu có), tác dụng phụ tăng thêm, và đưa ra lời khuyên sử dụng an toàn (thời gian giãn cách, dấu hiệu cần đi khám). Trả về câu trả lời ngắn gọn, thiết thực.`;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        if (response.ok) {
            const data = await response.json();
            let formattedText = data.response
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
                
            aiExplanation.innerHTML = formattedText;
            showToast('Đã phân tích tương tác thuốc bằng AI!', 'success');
        } else {
            aiExplanation.innerHTML = 'Lỗi không thể lấy giải thích chi tiết từ AI lúc này.';
            showToast('Lỗi AI phân tích tương tác.', 'error');
        }
    } catch (error) {
        aiExplanation.innerHTML = 'Lỗi kết nối máy chủ AI.';
        showToast('Lỗi kết nối AI.', 'error');
    }
}

// #endregion
async function screenSymptoms(e) {
    if (e) e.preventDefault();
    
    const symptoms = document.getElementById('screener-symptoms').value.trim();
    const duration = document.getElementById('screener-duration').value;
    const severity = document.getElementById('screener-severity').value;
    
    if (!symptoms) {
        showToast('Vui lòng nhập mô tả triệu chứng.', 'error');
        return;
    }
    
    const assocCheckboxes = document.querySelectorAll('.screener-assoc:checked');
    const assocList = Array.from(assocCheckboxes).map(cb => cb.value);
    
    // Show result panel in loading state
    document.getElementById('screener-results-placeholder').style.display = 'none';
    const resultsBox = document.getElementById('screener-results-box');
    resultsBox.style.display = 'block';
    
    const riskBadge  = document.getElementById('screener-risk-badge');
    const specSpan   = document.getElementById('screener-suggest-spec');
    const descBox    = document.getElementById('screener-desc-box');
    const diagText   = document.getElementById('dash-screener-diagnosis-text');
    const diagSub    = document.getElementById('dash-screener-diagnosis-sub');
    const sevBar     = document.getElementById('dash-screener-severity-bar');
    const sevLabel   = document.getElementById('dash-screener-severity-label');
    const sevAdvice  = document.getElementById('dash-screener-severity-advice');
    const hospList   = document.getElementById('dash-screener-hospital-list');
    
    // Set loading state
    riskBadge.textContent = 'Đang phân tích...';
    riskBadge.className   = 'badge bg-secondary';
    specSpan.textContent  = 'Đang xử lý...';
    if (diagText)  diagText.textContent  = 'AI đang chẩn đoán...';
    if (diagSub)   diagSub.textContent   = '';
    if (sevBar)    { sevBar.style.width = '20%'; sevBar.style.background = '#adb5bd'; }
    if (sevLabel)  sevLabel.textContent  = 'Đang đánh giá...';
    if (sevAdvice) sevAdvice.textContent = '';
    descBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang chẩn đoán lâm sàng sơ bộ...';
    if (hospList) hospList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);font-style:italic;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tra cứu...</div>';
    
    // Local risk pre-assessment
    let risk = '🟢 Thấp';
    let riskClass = 'bg-success text-white';
    let severityPct = 25;
    let severityColor = 'var(--success)';
    let severityText = 'Nhẹ — có thể tự theo dõi tại nhà';
    let severityActionLabel = 'Theo dõi triệu chứng, uống đủ nước và nghỉ ngơi';
    
    const symptomsLower = symptoms.toLowerCase();
    const highRiskKeywords = ['đau thắt ngực', 'khó thở dữ dội', 'đau tim', 'liệt', 'mất ý thức', 'ngất', 'nôn ra máu', 'đau đầu dữ dội', 'mất thị lực', 'xuất huyết', 'co giật'];
    const hasHighRiskWord = highRiskKeywords.some(k => symptomsLower.includes(k));
    
    if (severity === 'Nặng' || hasHighRiskWord) {
        risk = '🔴 Cao — Khám khẩn'; riskClass = 'bg-danger text-white';
        severityPct = 90; severityColor = '#dc3545';
        severityText = 'Nặng — cần khám khẩn hoặc cấp cứu';
        severityActionLabel = '⚠️ Đến bệnh viện hoặc cơ sở y tế ngay lập tức';
    } else if (severity === 'Trung bình' || assocList.length >= 2 || duration.includes('Trên 1 tuần')) {
        risk = '🟡 Trung bình'; riskClass = 'bg-warning text-dark';
        severityPct = 58; severityColor = '#fd7e14';
        severityText = 'Trung bình — nên đặt lịch khám sớm';
        severityActionLabel = 'Hẹn bác sĩ trong 1-3 ngày tới';
    }
    
    // Structured AI prompt - NOTE: use 'message' property for backend DTO mapping!
    const prompt =
        `Bạn là bác sĩ AI của hệ thống CareConnect. Dựa vào triệu chứng bệnh nhân cung cấp, hãy phân tích lâm sàng sơ bộ và trả về KẾT QUẢ THEO ĐỊNH DẠNG SAU (bắt buộc):\n\n` +
        `CHAN_DOAN: [Tên bệnh/hội chứng khả năng cao nhất]\n` +
        `CHAN_DOAN_PHU: [2 chẩn đoán phân biệt, cách nhau dấu " | "]\n` +
        `CHUYEN_KHOA: [Chuyên khoa phù hợp nhất]\n` +
        `MUC_DO: [Chỉ dùng 1 trong 3: NHE hoặc TRUNG_BINH hoặc NANG]\n` +
        `LY_DO: [Giải thích ngắn gọn tại sao chẩn đoán đó, 1-2 câu]\n` +
        `KHUYEN_NGHI: [Hướng dẫn cụ thể bệnh nhân nên làm gì ngay bây giờ, 2-3 câu]\n\n` +
        `Thông tin bệnh nhân:\n` +
        `- Triệu chứng chính: "${symptoms}"\n` +
        `- Thời gian: ${duration}\n` +
        `- Mức độ khó chịu (tự đánh giá): ${severity}\n` +
        `- Dấu hiệu kèm theo: ${assocList.join(', ') || 'Không có'}\n\n` +
        `LƯU Ý: Chỉ trả lời đúng theo cấu trúc trên.`;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        if (response.ok) {
            const data = await response.json();
            const aiText = data.response;
            
            const extract = (key) => {
                const match = aiText.match(new RegExp(key + ':\\s*(.*?)(?:\\n|$)', 'i'));
                return match ? match[1].trim().replace(/\*+/g, '').replace(/_+/g, ' ') : '';
            };
            
            const diagnosis  = extract('CHAN_DOAN')     || 'Chưa xác định rõ';
            const diagAlt    = extract('CHAN_DOAN_PHU') || '';
            const spec       = extract('CHUYEN_KHOA')  || 'Nội khoa tổng quát';
            const mucDo      = extract('MUC_DO')        || 'NHE';
            const lyDo       = extract('LY_DO')         || '';
            const khuyenNghi = extract('KHUYEN_NGHI')  || '';
            
            suggestedSymptomSpecialty = spec;
            
            if (mucDo.includes('NANG') || mucDo.includes('NĂNG')) {
                risk = '🔴 Cao — Khám khẩn'; riskClass = 'bg-danger text-white';
                severityPct = 90; severityColor = '#dc3545';
                severityText = 'Nặng — cần khám khẩn hoặc cấp cứu';
                severityActionLabel = '⚠️ Đến cơ sở y tế ngay, không tự điều trị';
            } else if (mucDo.includes('TRUNG')) {
                risk = '🟡 Trung bình'; riskClass = 'bg-warning text-dark';
                severityPct = 58; severityColor = '#fd7e14';
                severityText = 'Trung bình — nên đặt lịch khám sớm';
                severityActionLabel = 'Hẹn bác sĩ trong 1-3 ngày tới';
            } else {
                risk = '🟢 Thấp'; riskClass = 'bg-success text-white';
                severityPct = 25; severityColor = 'var(--success)';
                severityText = 'Nhẹ — có thể tự theo dõi tại nhà';
                severityActionLabel = 'Theo dõi triệu chứng, uống đủ nước và nghỉ ngơi';
            }
            
            if (diagText) diagText.textContent = diagnosis;
            if (diagSub) diagSub.innerHTML = diagAlt
                ? `<i class="fa-solid fa-code-branch" style="color:var(--text-muted)"></i> Có thể cũng là: <em>${diagAlt}</em>` : '';
            
            setTimeout(() => {
                if (sevBar) { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
            }, 100);
            if (sevLabel)  sevLabel.textContent = severityText;
            if (sevAdvice) sevAdvice.innerHTML  = '<i class="fa-solid fa-circle-arrow-right"></i> ' + severityActionLabel;
            
            riskBadge.textContent = risk;
            riskBadge.className   = `badge ${riskClass}`;
            specSpan.textContent  = spec;
            
            let explanation = '';
            if (lyDo)       explanation += `<p style="margin:0 0 8px;"><strong>📋 Lý do chẩn đoán:</strong> ${lyDo}</p>`;
            if (khuyenNghi) explanation += `<p style="margin:0;"><strong>💊 Khuyến nghị:</strong> ${khuyenNghi}</p>`;
            if (!explanation) {
                explanation = aiText.replace(/CHAN_DOAN.*?\n/gi, '').replace(/CHAN_DOAN_PHU.*?\n/gi, '').replace(/CHUYEN_KHOA.*?\n/gi, '').replace(/MUC_DO.*?\n/gi, '').replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            descBox.innerHTML = explanation;
            
            // Render hospital suggestions using dash-screener-hospital-list
            renderDashScreenerHospitals(spec);
            
            showToast('Chẩn đoán AI hoàn tất!', 'success');
        } else {
            riskBadge.textContent = risk; riskBadge.className = `badge ${riskClass}`;
            specSpan.textContent = 'Nội khoa tổng quát';
            if (diagText) diagText.textContent = 'Không thể xác định (lỗi AI)';
            if (sevBar) { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
            if (sevLabel) sevLabel.textContent = severityText;
            descBox.innerHTML = 'Gặp lỗi khi lấy kết quả tư vấn AI. Vui lòng đặt lịch khám Nội khoa tổng quát để bác sĩ kiểm tra.';
            renderDashScreenerHospitals('Nội khoa tổng quát');
            showToast('Lỗi AI chẩn đoán.', 'error');
        }
    } catch (error) {
        riskBadge.textContent = risk; riskBadge.className = `badge ${riskClass}`;
        specSpan.textContent = 'Nội khoa tổng quát';
        if (diagText) diagText.textContent = 'Lỗi kết nối';
        if (sevBar) { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
        if (sevLabel) sevLabel.textContent = severityText;
        descBox.innerHTML = 'Lỗi kết nối máy chủ AI. Vui lòng kiểm tra mạng.';
        renderDashScreenerHospitals('Nội khoa tổng quát');
        showToast('Lỗi kết nối AI.', 'error');
    }
}


async function getPatientProfileCoords() {
    if (cachedPatientCoords) return cachedPatientCoords;
    if (!token || userRole !== 'Patient') return null;

    const fetchCoords = async (query) => {
        let cleanQuery = query.trim();
        if (!cleanQuery.toLowerCase().endsWith("việt nam")) {
            cleanQuery += ", Việt Nam";
        }
        try {
            const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(cleanQuery)}&format=json&limit=1&countrycodes=vn`, {
                headers: { 'Accept-Language': 'vi,en;q=0.9' }
            });
            if (geoRes.ok) {
                const data = await geoRes.json();
                if (data && data.length > 0) {
                    return {
                        lat: parseFloat(data[0].lat),
                        lng: parseFloat(data[0].lon)
                    };
                }
            }
        } catch (e) {
            console.error("Geocoding fetch failed for:", cleanQuery, e);
        }
        return null;
    };

    try {
        const response = await fetch(`${API_BASE}/auth/profile`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return null;
        const profile = await response.json();
        if (profile && profile.address && profile.address.trim()) {
            const addr = profile.address.trim();
            
            // Try 1: Full address
            let coords = await fetchCoords(addr);
            
            // Try 2: Strip first segment (e.g. house number)
            if (!coords) {
                const parts = addr.split(',').map(p => p.trim());
                if (parts.length > 1) {
                    coords = await fetchCoords(parts.slice(1).join(', '));
                }
            }
            
            // Try 3: Strip second segment (keep only city/province/district)
            if (!coords) {
                const parts = addr.split(',').map(p => p.trim());
                if (parts.length > 2) {
                    coords = await fetchCoords(parts.slice(2).join(', '));
                }
            }
            
            // Try 4: Search for just the city/province segment (the last segment)
            if (!coords) {
                const parts = addr.split(',').map(p => p.trim());
                if (parts.length > 0) {
                    coords = await fetchCoords(parts[parts.length - 1]);
                }
            }
            
            // Try 5: Absolute fallback to user's general city
            if (!coords) {
                let defaultCity = "TP. Hồ Chí Minh";
                if (addr.toLowerCase().includes("hà nội") || addr.toLowerCase().includes("ha noi")) {
                    defaultCity = "Thành phố Hà Nội";
                } else if (addr.toLowerCase().includes("đà nẵng") || addr.toLowerCase().includes("da nang")) {
                    defaultCity = "Thành phố Đà Nẵng";
                }
                coords = await fetchCoords(defaultCity);
            }

            if (coords) {
                cachedPatientCoords = {
                    lat: coords.lat,
                    lng: coords.lng,
                    address: addr
                };
                return cachedPatientCoords;
            }
        }
    } catch (e) {
        console.error("Lỗi lấy tọa độ từ địa chỉ hồ sơ bệnh nhân:", e);
    }
    return null;
}

async function initializePatientLocation() {
    if (isInitializingLocation) return;
    if (!token || userRole !== 'Patient') return;
    isInitializingLocation = true;
    try {
        const coords = await getPatientProfileCoords();
        if (coords) {
            let stored = localStorage.getItem('nearbyHospitals');
            if (stored && /[\u4e00-\u9fa5]/.test(stored)) {
                localStorage.removeItem('nearbyHospitals');
                localStorage.removeItem('lastLocalizedAddress');
                stored = null;
            }
            let needsUpdate = true;
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    if (parsed && parsed.length >= 3) {
                        const lastLocalizedAddr = localStorage.getItem('lastLocalizedAddress');
                        if (lastLocalizedAddr === coords.address) {
                            needsUpdate = false;
                            window.nearbyHospitals = parsed;
                            updateHospitalCardsUI();
                        }
                    }
                } catch (e) {}
            }
            
            if (needsUpdate) {
                let clinics = [];
                try {
                    clinics = await fetchOSMNearbyHospitals(coords.lat, coords.lng);
                } catch (e) {
                    console.error('OSM Overpass search failed during patient init, falling back to mock clinics.', e);
                }
                
                if (clinics.length < 3) {
                    const mockClinics = await generateNearbyMockClinics(coords.lat, coords.lng, coords.address);
                    mockClinics.forEach(mock => {
                        if (clinics.length < 3 && !clinics.some(c => c.name === mock.name)) {
                            clinics.push(mock);
                        }
                    });
                }
                
                window.nearbyHospitals = clinics.slice(0, 3);
                
                window.nearbyHospitals.forEach(c => {
                    c.distance = getHaversineDistance(coords.lat, coords.lng, c.lat, c.lng);
                });
                
                localStorage.setItem('nearbyHospitals', JSON.stringify(window.nearbyHospitals));
                localStorage.setItem('lastLocalizedAddress', coords.address);
                
                updateHospitalCardsUI();
            }
        } else {
            // Fallback to browser GPS if profile address is empty or cannot be resolved
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    async (position) => {
                        const userLat = position.coords.latitude;
                        const userLng = position.coords.longitude;
                        let clinics = [];
                        try {
                            clinics = await fetchOSMNearbyHospitals(userLat, userLng);
                        } catch (e) {}
                        if (clinics.length < 3) {
                            const mockClinics = await generateNearbyMockClinics(userLat, userLng, "");
                            mockClinics.forEach(mock => {
                                if (clinics.length < 3 && !clinics.some(c => c.name === mock.name)) {
                                    clinics.push(mock);
                                }
                            });
                        }
                        window.nearbyHospitals = clinics.slice(0, 3);
                        window.nearbyHospitals.forEach(c => {
                            c.distance = getHaversineDistance(userLat, userLng, c.lat, c.lng);
                        });
                        localStorage.setItem('nearbyHospitals', JSON.stringify(window.nearbyHospitals));
                        updateHospitalCardsUI();
                    },
                    (err) => {
                        console.log("GPS localization fallback failed during patient init:", err);
                    },
                    { enableHighAccuracy: true, timeout: 8000 }
                );
            }
        }
    } catch (e) {
        console.error("Lỗi khởi tạo vị trí bệnh nhân:", e);
    } finally {
        isInitializingLocation = false;
    }
}


async function ensureNearbyHospitals(uLat, uLng, addressHint) {
    if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
        // Calculate distance from first clinic to current coordinates
        const dist = getHaversineDistance(uLat, uLng, window.nearbyHospitals[0].lat, window.nearbyHospitals[0].lng);
        // If it's within 15km, we consider it already localized and don't need to re-query
        if (dist < 15) {
            return;
        }
    }
    
    // Otherwise, fetch/generate new local clinics
    let clinics = [];
    try {
        clinics = await fetchOSMNearbyHospitals(uLat, uLng);
    } catch (e) {
        console.error('OSM fetch failed in ensureNearbyHospitals:', e);
    }
    if (clinics.length < 3) {
        const mockClinics = await generateNearbyMockClinics(uLat, uLng, addressHint);
        mockClinics.forEach(mock => {
            if (clinics.length < 3 && !clinics.some(c => c.name === mock.name)) {
                clinics.push(mock);
            }
        });
    }
    window.nearbyHospitals = clinics.slice(0, 3);
    window.nearbyHospitals.forEach(c => {
        c.distance = getHaversineDistance(uLat, uLng, c.lat, c.lng);
    });
    localStorage.setItem('nearbyHospitals', JSON.stringify(window.nearbyHospitals));
    updateHospitalCardsUI();
}

async function renderDashScreenerHospitals(spec) {
    const hospList = document.getElementById('dash-screener-hospital-list');
    if (!hospList) return;
    
    let uLat = null;
    let uLng = null;
    let locationSource = null;
    
    if (token && userRole === 'Patient' && cachedPatientCoords) {
        uLat = cachedPatientCoords.lat;
        uLng = cachedPatientCoords.lng;
        locationSource = 'profile';
    }
    
    const renderCards = async (lat, lng) => {
        if (lat && lng) {
            await ensureNearbyHospitals(lat, lng, cachedPatientCoords?.address);
        }
        
        let branches = [
            { name: 'CareConnect Quận 1', addr: '123 Lê Lợi, Quận 1, TP.HCM', lat: 10.7769, lng: 106.7009, phone: '028 1234 5601' },
            { name: 'CareConnect Quận 3', addr: '456 Võ Văn Tần, Quận 3, TP.HCM', lat: 10.7745, lng: 106.6889, phone: '028 1234 5603' },
            { name: 'CareConnect Thủ Đức', addr: '789 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', lat: 10.8526, lng: 106.7720, phone: '028 1234 5606' },
        ];
        
        if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
            branches = window.nearbyHospitals.map(h => ({
                name: h.name,
                addr: h.address,
                lat: h.lat,
                lng: h.lng,
                phone: h.phone || '1900-CARE-PK'
            }));
        }
        
        let sorted = branches;
        if (lat && lng) {
            sorted = branches.map(b => {
                const d = typeof getHaversineDistance === 'function'
                    ? getHaversineDistance(lat, lng, b.lat, b.lng)
                    : Math.sqrt(Math.pow((b.lat - lat) * 111, 2) + Math.pow((b.lng - lng) * 111 * Math.cos(lat * Math.PI / 180), 2));
                return { ...b, distKm: d };
            }).sort((a, b) => a.distKm - b.distKm);
        }
        
        let htmlContent = sorted.map((b, i) => {
            const distLabel = b.distKm !== undefined
                ? `<span style="color:hsl(175,65%,40%);font-weight:700;font-size:11px;"><i class="fa-solid fa-location-arrow"></i> ${b.distKm.toFixed(1)} km</span>` : '';
            const nearTag = i === 0
                ? `<span style="background:hsl(175,65%,40%);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;">Gần nhất</span>` : '';
            const bn = b.name.replace(/'/g, "\\'");
            const sp = (spec || 'Nội khoa tổng quát').replace(/'/g, "\\'");
            return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px;background:#fff;border-radius:8px;border:1px solid hsl(175,60%,82%);margin-bottom:8px;">
                <div style="width:28px;height:28px;border-radius:7px;background:hsl(175,70%,93%);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
                    <i class="fa-solid fa-hospital-user" style="color:hsl(175,65%,40%);font-size:12px;"></i>
                </div>
                <div style="flex:1;min-width:0;text-align:left;">
                    <div style="font-size:12px;font-weight:700;color:var(--dark);">${b.name}${nearTag}</div>
                    <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.addr}</div>
                    <div style="font-size:11px;color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${b.phone}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                    ${distLabel}
                    <button class="btn btn-primary" style="font-size:11px;padding:3px 8px;border-radius:6px;white-space:nowrap;" onclick="bookFromScreenerWithBranch('${bn}','${sp}')">Đặt lịch</button>
                </div>
            </div>`;
        }).join('');
        
        if (sorted.length > 0 && sorted[0].distKm > 100) {
            let noteText = '';
            if (locationSource === 'profile') {
                noteText = `⚠️ <strong>Lưu ý:</strong> Các chi nhánh CareConnect hiện chỉ có tại TP. Hồ Chí Minh. Khoảng cách được tính dựa trên địa chỉ hồ sơ của bạn (<strong>${cachedPatientCoords?.address || ''}</strong>). Bạn có thể chọn chi nhánh <strong>Tư vấn Trực tuyến (Telehealth)</strong> để nhận tư vấn từ xa tiện lợi hơn.`;
            } else {
                noteText = `⚠️ <strong>Lưu ý:</strong> Các chi nhánh CareConnect hiện chỉ có tại TP. Hồ Chí Minh. Khoảng cách được tính dựa trên vị trí GPS của bạn. Bạn có thể chọn chi nhánh <strong>Tư vấn Trực tuyến (Telehealth)</strong> để nhận tư vấn từ xa tiện lợi hơn.`;
            }
            htmlContent += `<div style="font-size:11px;color:hsl(15,80%,40%);background:hsl(15,100%,96%);border:1px solid hsl(15,80%,88%);padding:8px;border-radius:8px;margin-top:8px;line-height:1.4;text-align:left;">
                ${noteText}
            </div>`;
        }
        hospList.innerHTML = htmlContent;
    };
    
    if (uLat && uLng) {
        await renderCards(uLat, uLng);
    } else if (navigator.geolocation) {
        hospList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);font-style:italic;"><i class="fa-solid fa-spinner fa-spin"></i> Đang xác định vị trí của bạn...</div>';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await renderCards(pos.coords.latitude, pos.coords.longitude);
            },
            async ()  => {
                await renderCards(null, null);
            },
            { timeout: 4000 }
        );
    } else {
        await renderCards(null, null);
    }
}

function bookFromScreenerWithBranch(branchName, spec) {
    const diagEl   = document.getElementById('dash-screener-diagnosis-text');
    const sympField = document.getElementById('screener-symptoms');
    const symptoms = sympField ? sympField.value.trim() : '';
    const diagnosis = diagEl ? diagEl.textContent : '';
    const symptomsVal = `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}\nChi nhánh ưu tiên: ${branchName}`;

    if (!token) {
        window.pendingBookingFromLanding = {
            symptoms: symptomsVal,
            specialty: spec,
            branch: branchName
        };
        showAuthScreen(false);
        showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để lưu kết quả sàng lọc AI và đặt lịch khám.', 'info');
        return;
    }
    openBookingModal();
    const syField = document.getElementById('booking-symptoms');
    if (syField) syField.value = `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}\nChi nhánh ưu tiên: ${branchName}`;
    const doctorSelect = document.getElementById('booking-doctor');
    if (doctorSelect) {
        const opts = Array.from(doctorSelect.options);
        const match = opts.find(o => o.text.toLowerCase().includes(spec.toLowerCase()));
        if (match) { 
            doctorSelect.value = match.value; 
            doctorSelect.dispatchEvent(new Event('change')); 
        }
    }
    const branchSelect = document.getElementById('booking-branch');
    if (branchSelect) {
        const opts = Array.from(branchSelect.options);
        let match = opts.find(o => o.text.toLowerCase().includes(branchName.toLowerCase()) || o.value.toLowerCase().includes(branchName.toLowerCase()));
        if (match) {
            branchSelect.value = match.value;
        } else {
            const opt = document.createElement('option');
            opt.value = branchName;
            opt.text = branchName;
            branchSelect.appendChild(opt);
            branchSelect.value = branchName;
        }
        branchSelect.dispatchEvent(new Event('change'));
    }
    showToast(`Đã chọn ${branchName} — khoa ${spec}. Hoàn tất đặt lịch trong biểu mẫu!`, 'success');
}

function bookFromScreener() {
    if (!suggestedSymptomSpecialty) return;
    const diagEl   = document.getElementById('dash-screener-diagnosis-text');
    const sympField = document.getElementById('screener-symptoms');
    const diagnosis = diagEl ? diagEl.textContent : '';
    const symptoms  = sympField ? sympField.value.trim() : '';
    const symptomsVal = `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}`;

    if (!token) {
        window.pendingBookingFromLanding = {
            symptoms: symptomsVal,
            specialty: suggestedSymptomSpecialty,
            branch: null
        };
        showAuthScreen(false);
        showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để lưu kết quả sàng lọc AI và đặt lịch khám.', 'info');
        return;
    }
    openBookingModal();
    const syField = document.getElementById('booking-symptoms');
    if (syField) syField.value = `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}`;
    const doctorSelect = document.getElementById('booking-doctor');
    if (doctorSelect) {
        const opts = Array.from(doctorSelect.options);
        const match = opts.find(o => o.text.toLowerCase().includes(suggestedSymptomSpecialty.toLowerCase()));
        if (match) {
            doctorSelect.value = match.value;
            doctorSelect.dispatchEvent(new Event('change'));
        }
    }
    showToast(`Đã chọn khoa ${suggestedSymptomSpecialty}. Vui lòng hoàn tất đặt lịch!`, 'success');
}

async function screenLandingSymptoms(e) {
    if (e) e.preventDefault();
    
    const symptoms = document.getElementById('landing-screener-symptoms').value.trim();
    const duration = document.getElementById('landing-screener-duration').value;
    const severity = document.getElementById('landing-screener-severity').value;
    
    if (!symptoms) {
        showToast('Vui lòng nhập mô tả triệu chứng.', 'error');
        return;
    }
    
    const assocCheckboxes = document.querySelectorAll('.landing-screener-assoc:checked');
    const assocList = Array.from(assocCheckboxes).map(cb => cb.value);
    
    // Show result panel in loading state
    document.getElementById('landing-screener-results-placeholder').style.display = 'none';
    const resultsBox = document.getElementById('landing-screener-results-box');
    resultsBox.style.display = 'block';
    
    const riskBadge  = document.getElementById('landing-screener-risk-badge');
    const specSpan   = document.getElementById('landing-screener-suggest-spec');
    const descBox    = document.getElementById('landing-screener-desc-box');
    const diagText   = document.getElementById('screener-diagnosis-text');
    const diagSub    = document.getElementById('screener-diagnosis-sub');
    const sevBar     = document.getElementById('screener-severity-bar');
    const sevLabel   = document.getElementById('screener-severity-label');
    const sevAdvice  = document.getElementById('screener-severity-advice');
    const hospList   = document.getElementById('screener-hospital-list');
    
    // Set loading state
    riskBadge.textContent = 'Đang phân tích...';
    riskBadge.className   = 'badge bg-secondary';
    specSpan.textContent  = 'Đang xử lý...';
    if (diagText) diagText.textContent = 'AI đang chẩn đoán...';
    if (diagSub)  diagSub.textContent  = '';
    if (sevBar)   { sevBar.style.width = '20%'; sevBar.style.background = '#adb5bd'; }
    if (sevLabel) sevLabel.textContent = 'Đang đánh giá...';
    if (sevAdvice) sevAdvice.textContent = '';
    descBox.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý AI đang chẩn đoán lâm sàng sơ bộ...';
    if (hospList) hospList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);font-style:italic;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tra cứu...</div>';
    
    // Local risk pre-assessment
    let risk = '🟢 Thấp';
    let riskClass = 'bg-success text-white';
    let severityPct = 25;
    let severityColor = 'var(--success)';
    let severityText = 'Nhẹ — có thể tự theo dõi tại nhà';
    let severityActionLabel = 'Theo dõi triệu chứng, uống đủ nước và nghỉ ngơi';
    
    const symptomsLower = symptoms.toLowerCase();
    const highRiskKeywords = ['đau thắt ngực', 'khó thở dữ dội', 'đau tim', 'liệt', 'mất ý thức', 'ngất', 'nôn ra máu', 'đau đầu dữ dội', 'mất thị lực', 'xuất huyết', 'co giật'];
    const hasHighRiskWord = highRiskKeywords.some(k => symptomsLower.includes(k));
    
    if (severity === 'Nặng' || hasHighRiskWord) {
        risk = '🔴 Cao — Khám khẩn';
        riskClass = 'bg-danger text-white';
        severityPct = 90;
        severityColor = '#dc3545';
        severityText = 'Nặng — cần khám khẩn hoặc cấp cứu';
        severityActionLabel = '⚠️ Đến bệnh viện hoặc cơ sở y tế ngay lập tức';
    } else if (severity === 'Trung bình' || assocList.length >= 2 || duration.includes('Trên 1 tuần')) {
        risk = '🟡 Trung bình';
        riskClass = 'bg-warning text-dark';
        severityPct = 58;
        severityColor = '#fd7e14';
        severityText = 'Trung bình — nên đặt lịch khám sớm';
        severityActionLabel = 'Hẹn bác sĩ trong 1-3 ngày tới';
    }
    
    // Structured AI prompt - NOTE: use 'message' property for backend DTO mapping!
    const prompt =
        `Bạn là bác sĩ AI của hệ thống CareConnect. Dựa vào triệu chứng bệnh nhân cung cấp, hãy phân tích lâm sàng sơ bộ và trả về KẾT QUẢ THEO ĐỊNH DẠNG SAU (bắt buộc):\n\n` +
        `CHAN_DOAN: [Tên bệnh/hội chứng khả năng cao nhất]\n` +
        `CHAN_DOAN_PHU: [2 chẩn đoán phân biệt, cách nhau dấu " | "]\n` +
        `CHUYEN_KHOA: [Chuyên khoa phù hợp nhất]\n` +
        `MUC_DO: [Chỉ dùng 1 trong 3: NHE hoặc TRUNG_BINH hoặc NANG]\n` +
        `LY_DO: [Giải thích ngắn gọn tại sao chẩn đoán đó, 1-2 câu]\n` +
        `KHUYEN_NGHI: [Hướng dẫn cụ thể bệnh nhân nên làm gì ngay bây giờ, 2-3 câu]\n\n` +
        `Thông tin bệnh nhân:\n` +
        `- Triệu chứng chính: "${symptoms}"\n` +
        `- Thời gian: ${duration}\n` +
        `- Mức độ khó chịu (tự đánh giá): ${severity}\n` +
        `- Dấu hiệu kèm theo: ${assocList.join(', ') || 'Không có'}\n\n` +
        `LƯU Ý: Chỉ trả lời đúng theo cấu trúc trên, không thêm phần mở đầu hay lời chào.`;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        if (response.ok) {
            const data = await response.json();
            const aiText = data.response;
            
            // Parse structured AI response
            const extract = (key) => {
                const match = aiText.match(new RegExp(key + ':\\s*(.*?)(?:\\n|$)', 'i'));
                return match ? match[1].trim().replace(/\*+/g, '').replace(/_+/g, ' ') : '';
            };
            
            const diagnosis   = extract('CHAN_DOAN')     || 'Chưa xác định rõ';
            const diagAlt     = extract('CHAN_DOAN_PHU') || '';
            const spec        = extract('CHUYEN_KHOA')  || 'Nội khoa tổng quát';
            const mucDo       = extract('MUC_DO')        || 'NHE';
            const lyDo        = extract('LY_DO')         || '';
            const khuyenNghi  = extract('KHUYEN_NGHI')  || '';
            
            suggestedLandingSymptomSpecialty = spec;
            
            // Override severity from AI
            if (mucDo.includes('NANG') || mucDo.includes('NĂNG')) {
                risk = '🔴 Cao — Khám khẩn';
                riskClass = 'bg-danger text-white';
                severityPct = 90;
                severityColor = '#dc3545';
                severityText = 'Nặng — cần khám khẩn hoặc cấp cứu';
                severityActionLabel = '⚠️ Đến cơ sở y tế ngay, không tự điều trị';
            } else if (mucDo.includes('TRUNG')) {
                risk = '🟡 Trung bình';
                riskClass = 'bg-warning text-dark';
                severityPct = 58;
                severityColor = '#fd7e14';
                severityText = 'Trung bình — nên đặt lịch khám sớm';
                severityActionLabel = 'Hẹn bác sĩ trong 1-3 ngày tới';
            } else {
                risk = '🟢 Thấp';
                riskClass = 'bg-success text-white';
                severityPct = 25;
                severityColor = 'var(--success)';
                severityText = 'Nhẹ — có thể tự theo dõi tại nhà';
                severityActionLabel = 'Theo dõi triệu chứng, uống đủ nước và nghỉ ngơi';
            }
            
            // Render diagnosis
            if (diagText) diagText.textContent = diagnosis;
            if (diagSub) diagSub.innerHTML = diagAlt
                ? `<i class="fa-solid fa-code-branch" style="color:var(--text-muted)"></i> Có thể cũng là: <em>${diagAlt}</em>`
                : '';
            
            // Render severity
            setTimeout(() => {
                if (sevBar)  { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
            }, 100);
            if (sevLabel)  sevLabel.textContent = severityText;
            if (sevAdvice) sevAdvice.innerHTML  = '<i class="fa-solid fa-circle-arrow-right"></i> ' + severityActionLabel;
            
            // Render risk badge & spec
            riskBadge.textContent = risk;
            riskBadge.className   = `badge ${riskClass}`;
            specSpan.textContent  = spec;
            
            // Render AI explanation
            let explanation = '';
            if (lyDo)       explanation += `<p style="margin:0 0 8px;"><strong>📋 Lý do chẩn đoán:</strong> ${lyDo}</p>`;
            if (khuyenNghi) explanation += `<p style="margin:0;"><strong>💊 Khuyến nghị:</strong> ${khuyenNghi}</p>`;
            if (!explanation) {
                explanation = aiText
                    .replace(/CHAN_DOAN.*?\n/gi, '')
                    .replace(/CHAN_DOAN_PHU.*?\n/gi, '')
                    .replace(/CHUYEN_KHOA.*?\n/gi, '')
                    .replace(/MUC_DO.*?\n/gi, '')
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            }
            descBox.innerHTML = explanation;
            
            // Render hospital suggestions
            renderScreenerHospitals(spec);
            
            showToast('Chẩn đoán AI hoàn tất!', 'success');
        } else {
            riskBadge.textContent = risk;
            riskBadge.className   = `badge ${riskClass}`;
            specSpan.textContent  = 'Nội khoa tổng quát';
            if (diagText) diagText.textContent = 'Không thể xác định (lỗi AI)';
            if (sevBar)   { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
            if (sevLabel) sevLabel.textContent = severityText;
            descBox.innerHTML = 'Gặp lỗi khi lấy kết quả tư vấn AI. Vui lòng đặt lịch khám Nội khoa tổng quát để bác sĩ kiểm tra.';
            renderScreenerHospitals('Nội khoa tổng quát');
            showToast('Lỗi AI chẩn đoán.', 'error');
        }
    } catch (error) {
        riskBadge.textContent = risk;
        riskBadge.className   = `badge ${riskClass}`;
        specSpan.textContent  = 'Nội khoa tổng quát';
        if (diagText) diagText.textContent = 'Lỗi kết nối';
        if (sevBar)   { sevBar.style.width = severityPct + '%'; sevBar.style.background = severityColor; }
        if (sevLabel) sevLabel.textContent = severityText;
        descBox.innerHTML = 'Lỗi kết nối máy chủ AI. Vui lòng kiểm tra mạng.';
        renderScreenerHospitals('Nội khoa tổng quát');
        showToast('Lỗi kết nối AI.', 'error');
    }
}

async function renderScreenerHospitals(spec) {
    const hospList = document.getElementById('screener-hospital-list');
    if (!hospList) return;
    
    let uLat = null;
    let uLng = null;
    let locationSource = null;
    
    if (token && userRole === 'Patient' && cachedPatientCoords) {
        uLat = cachedPatientCoords.lat;
        uLng = cachedPatientCoords.lng;
        locationSource = 'profile';
    }
    
    const renderCards = async (lat, lng) => {
        if (lat && lng) {
            await ensureNearbyHospitals(lat, lng, cachedPatientCoords?.address);
        }
        
        let branches = [
            { name: 'CareConnect Quận 1', addr: '123 Lê Lợi, Quận 1, TP.HCM', lat: 10.7769, lng: 106.7009, phone: '028 1234 5601' },
            { name: 'CareConnect Quận 3', addr: '456 Võ Văn Tần, Quận 3, TP.HCM', lat: 10.7745, lng: 106.6889, phone: '028 1234 5603' },
            { name: 'CareConnect Thủ Đức', addr: '789 Võ Văn Ngân, TP. Thủ Đức, TP.HCM', lat: 10.8526, lng: 106.7720, phone: '028 1234 5606' },
        ];
        
        if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
            branches = window.nearbyHospitals.map(h => ({
                name: h.name,
                addr: h.address,
                lat: h.lat,
                lng: h.lng,
                phone: h.phone || '1900-CARE-PK'
            }));
        }
        
        let sorted = branches;
        if (lat && lng) {
            sorted = branches.map(b => {
                const d = typeof getHaversineDistance === 'function'
                    ? getHaversineDistance(lat, lng, b.lat, b.lng)
                    : Math.sqrt(Math.pow((b.lat - lat) * 111, 2) + Math.pow((b.lng - lng) * 111 * Math.cos(lat * Math.PI / 180), 2));
                return { ...b, distKm: d };
            }).sort((a, b) => a.distKm - b.distKm);
        }
        
        let htmlContent = sorted.map((b, i) => {
            const distLabel = b.distKm !== undefined
                ? `<span style="color:hsl(175,65%,40%);font-weight:700;font-size:11px;"><i class="fa-solid fa-location-arrow"></i> &nbsp;${b.distKm.toFixed(1)} km</span>`
                : '';
            const nearTag = i === 0
                ? `<span style="background:hsl(175,65%,40%);color:#fff;font-size:10px;font-weight:700;padding:2px 7px;border-radius:10px;margin-left:6px;">Gần nhất</span>`
                : '';
            const bn = b.name.replace(/'/g, "\\'");
            const sp = (spec || 'Nội khoa tổng quát').replace(/'/g, "\\'");
            return `<div style="display:flex;align-items:flex-start;gap:8px;padding:8px;background:#fff;border-radius:8px;border:1px solid hsl(175,60%,82%);margin-bottom:8px;">
                <div style="width:28px;height:28px;border-radius:7px;background:hsl(175,70%,93%);display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:2px;">
                    <i class="fa-solid fa-hospital-user" style="color:hsl(175,65%,40%);font-size:12px;"></i>
                </div>
                <div style="flex:1;min-width:0;text-align:left;">
                    <div style="font-size:12px;font-weight:700;color:var(--dark);">${b.name}${nearTag}</div>
                    <div style="font-size:11px;color:var(--text-muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${b.addr}</div>
                    <div style="font-size:11px;color:var(--text-muted);"><i class="fa-solid fa-phone"></i> ${b.phone}</div>
                </div>
                <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
                    ${distLabel}
                    <button class="btn btn-primary" style="font-size:11px;padding:3px 8px;border-radius:6px;white-space:nowrap;" onclick="bookFromScreenerBranch('${bn}','${sp}')">Đặt lịch</button>
                </div>
            </div>`;
        }).join('');
        
        if (sorted.length > 0 && sorted[0].distKm > 100) {
            let noteText = '';
            if (locationSource === 'profile') {
                noteText = `⚠️ <strong>Lưu ý:</strong> Các chi nhánh CareConnect hiện chỉ có tại TP. Hồ Chí Minh. Khoảng cách được tính dựa trên địa chỉ hồ sơ của bạn (<strong>${cachedPatientCoords?.address || ''}</strong>). Bạn có thể chọn chi nhánh <strong>Tư vấn Trực tuyến (Telehealth)</strong> để nhận tư vấn từ xa tiện lợi hơn.`;
            } else {
                noteText = `⚠️ <strong>Lưu ý:</strong> Các chi nhánh CareConnect hiện chỉ có tại TP. Hồ Chí Minh. Khoảng cách được tính dựa trên vị trí GPS của bạn. Bạn có thể chọn chi nhánh <strong>Tư vấn Trực tuyến (Telehealth)</strong> để nhận tư vấn từ xa tiện lợi hơn.`;
            }
            htmlContent += `<div style="font-size:11px;color:hsl(15,80%,40%);background:hsl(15,100%,96%);border:1px solid hsl(15,80%,88%);padding:8px;border-radius:8px;margin-top:8px;line-height:1.4;text-align:left;">
                ${noteText}
            </div>`;
        }
        
        hospList.innerHTML = htmlContent;
    };
    
    if (uLat && uLng) {
        await renderCards(uLat, uLng);
    } else if (navigator.geolocation) {
        hospList.innerHTML = '<div style="font-size:12px;color:var(--text-muted);font-style:italic;"><i class="fa-solid fa-spinner fa-spin"></i> Đang xác định vị trí của bạn...</div>';
        navigator.geolocation.getCurrentPosition(
            async (pos) => {
                await renderCards(pos.coords.latitude, pos.coords.longitude);
            },
            async ()  => {
                await renderCards(null, null);
            },
            { timeout: 4000 }
        );
    } else {
        await renderCards(null, null);
    }
}

function bookFromScreenerBranch(branchName, spec) {
    const sympField = document.getElementById('landing-screener-symptoms');
    const diagEl    = document.getElementById('screener-diagnosis-text');
    const symptoms  = sympField ? sympField.value.trim() : '';
    const diagnosis = diagEl   ? diagEl.textContent      : '';
    
    window.pendingBookingFromLanding = {
        symptoms: `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}`,
        specialty: spec,
        branch: branchName
    };
    
    if (token && userRole === 'Patient') {
        openBookingModal();
        setTimeout(() => {
            const syField = document.getElementById('booking-symptoms');
            if (syField) syField.value = window.pendingBookingFromLanding.symptoms;
            const doctorSelect = document.getElementById('booking-doctor');
            if (doctorSelect) {
                const opts = Array.from(doctorSelect.options);
                const match = opts.find(o => o.text.toLowerCase().includes(spec.toLowerCase()));
                if (match) { doctorSelect.value = match.value; doctorSelect.dispatchEvent(new Event('change')); }
            }
            const branchSelect = document.getElementById('booking-branch');
            if (branchSelect) {
                const opts = Array.from(branchSelect.options);
                let match = opts.find(o => o.text.toLowerCase().includes(branchName.toLowerCase()) || o.value.toLowerCase().includes(branchName.toLowerCase()));
                if (match) {
                    branchSelect.value = match.value;
                } else {
                    const opt = document.createElement('option');
                    opt.value = branchName;
                    opt.text = branchName;
                    branchSelect.appendChild(opt);
                    branchSelect.value = branchName;
                }
                branchSelect.dispatchEvent(new Event('change'));
            }
            showToast(`Đã chọn ${branchName} — khoa ${spec}. Hoàn tất đặt lịch trong biểu mẫu!`, 'success');
        }, 400);
    } else {
        showAuthScreen(false);
        showToast(`Vui lòng đăng nhập để đặt lịch tại ${branchName}. Thông tin đã được lưu!`, 'info');
    }
}

function bookFromLandingScreener() {
    const spec     = suggestedLandingSymptomSpecialty || 'Nội khoa tổng quát';
    const sympField = document.getElementById('landing-screener-symptoms');
    const diagEl    = document.getElementById('screener-diagnosis-text');
    const symptoms  = sympField ? sympField.value.trim() : '';
    const diagnosis = diagEl   ? diagEl.textContent      : '';
    
    window.pendingBookingFromLanding = {
        symptoms: `[AI Sàng Lọc]\nChẩn đoán: ${diagnosis}\nTriệu chứng: ${symptoms}`,
        specialty: spec
    };
    
    if (token && userRole === 'Patient') {
        openBookingModal();
        setTimeout(() => {
            const syField = document.getElementById('booking-symptoms');
            if (syField) syField.value = window.pendingBookingFromLanding.symptoms;
            const doctorSelect = document.getElementById('booking-doctor');
            if (doctorSelect) {
                const opts = Array.from(doctorSelect.options);
                const match = opts.find(o => o.text.toLowerCase().includes(spec.toLowerCase()));
                if (match) { doctorSelect.value = match.value; doctorSelect.dispatchEvent(new Event('change')); }
            }
            showToast(`Đã điền thông tin sàng lọc AI cho chuyên khoa: ${spec}`, 'success');
        }, 400);
    } else {
        showAuthScreen(false);
        showToast('Vui lòng đăng nhập tài khoản bệnh nhân để tiếp tục đặt lịch khám. Triệu chứng sàng lọc sẽ tự động được điền!', 'info');
    }
}

async function checkLandingDrugInteraction(e) {
    if (e) e.preventDefault();
    
    const drug1 = document.getElementById('landing-drug-select-1').value;
    const drug2 = document.getElementById('landing-drug-select-2').value;
    const extraNotes = document.getElementById('landing-drug-extra-notes').value.trim();
    
    if (!drug1 || !drug2) {
        showToast('Vui lòng chọn đủ hai loại thuốc để kiểm tra tương tác.', 'error');
        return;
    }
    if (drug1 === drug2) {
        showToast('Vui lòng chọn hai loại thuốc khác nhau.', 'warning');
        return;
    }
    
    document.getElementById('landing-drug-results-placeholder').style.display = 'none';
    const box = document.getElementById('landing-drug-results-box');
    box.style.display = 'block';
    
    const alertContainer = document.getElementById('landing-drug-alert-container');
    const alertIcon = document.getElementById('landing-drug-alert-icon');
    const alertTitle = document.getElementById('landing-drug-alert-title');
    const alertDesc = document.getElementById('landing-drug-alert-desc');
    const aiExplanation = document.getElementById('landing-drug-ai-explanation');
    
    aiExplanation.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Trợ lý dược lâm sàng AI đang đối chiếu dữ liệu tương tác...';
    
    let severity = 'safe';
    let title = 'Tương tác an toàn';
    let desc = 'Không tìm thấy tương tác chéo nguy hiểm đã biết giữa hai loại thuốc này ở liều thông thường.';
    let iconClass = 'fa-circle-check';
    
    const drugPair = [drug1, drug2].sort().join('+');
    
    const interactionMatrix = {
        'Aspirin+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm (Chống chỉ định)',
            desc: 'Cả hai thuốc đều làm giảm khả năng đông máu. Sử dụng đồng thời làm tăng cực mạnh nguy cơ xuất huyết tiêu hóa và chảy máu nội tạng nguy kịch.'
        },
        'Aspirin+Ibuprofen': {
            severity: 'moderate',
            title: 'Tương tác trung bình (Cần thận trọng)',
            desc: 'Ibuprofen có thể làm giảm tác dụng bảo vệ tim mạch của Aspirin liều thấp và tăng nguy cơ gây viêm loét dạ dày tá tràng.'
        },
        'Ibuprofen+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm',
            desc: 'Kháng viêm NSAID (Ibuprofen) kết hợp với thuốc chống đông (Warfarin) gây nguy cơ chảy máu dạ dày nghiêm trọng.'
        },
        'Amlodipine+Simvastatin': {
            severity: 'moderate',
            title: 'Tương tác trung bình',
            desc: 'Amlodipine có thể làm tăng nồng độ Simvastatin trong máu, làm tăng nguy cơ tổn thương cơ (tiêu cơ vân).'
        },
        'Ciprofloxacin+Warfarin': {
            severity: 'severe',
            title: 'Tương tác Rất Nguy Hiểm',
            desc: 'Ciprofloxacin có thể làm tăng tác dụng chống đông của Warfarin, dẫn đến tăng nguy cơ chảy máu bất thường.'
        }
    };
    
    if (interactionMatrix[drugPair]) {
        const match = interactionMatrix[drugPair];
        severity = match.severity;
        title = match.title;
        desc = match.desc;
        iconClass = severity === 'severe' ? 'fa-triangle-exclamation' : 'fa-circle-exclamation';
    }
    
    alertContainer.className = `interaction-alert ${severity}`;
    alertIcon.className = `fa-solid ${iconClass}`;
    alertTitle.textContent = title;
    alertDesc.textContent = desc;
    
    const prompt = `Tôi muốn kiểm tra tương tác thuốc giữa hai loại thuốc sau:\n` +
                   `1. Thuốc 1: ${drug1}\n` +
                   `2. Thuốc 2: ${drug2}\n` +
                   `Thông tin bệnh cảnh: ${extraNotes || 'Không có ghi chú gì đặc biệt'}\n\n` +
                   `Hãy giải thích cơ chế tương tác (nếu có), tác dụng phụ tăng thêm, và đưa ra lời khuyên sử dụng an toàn (thời gian giãn cách, dấu hiệu cần đi khám). Trả về câu trả lời ngắn gọn, thiết thực.`;

    try {
        const response = await fetch(`${API_BASE}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: prompt, history: [] })
        });
        
        if (response.ok) {
            const data = await response.json();
            let formattedText = data.response
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.*?)\*/g, '<em>$1</em>');
                
            aiExplanation.innerHTML = formattedText;
            showToast('Đã phân tích tương tác thuốc bằng AI!', 'success');
        } else {
            aiExplanation.innerHTML = 'Không thể lấy giải thích chi tiết từ AI lúc này. Vui lòng tuân thủ cảnh báo tương tác của hệ thống ở trên.';
        }
    } catch (error) {
        aiExplanation.innerHTML = 'Lỗi kết nối máy chủ AI để giải thích chi tiết tương tác thuốc.';
    }
}

// Các biến điều khiển Floating News Carousel
window.currentNewsSlideIndex = 0;
window.totalNewsSlides = 0;
window.newsCarouselIntervalId = null;
window.isNewsCarouselPaused = false;

// Đóng/Thu nhỏ widget tin tức
// Đóng/Thu nhỏ widget tin tức
function minimizeNewsWidget() {
    const sidebar = document.getElementById('left-news-sidebar');
    const bubble = document.getElementById('news-widget-bubble');
    
    if (sidebar) {
        sidebar.classList.add('collapsed');
        sidebar.classList.remove('active'); // ẩn đi trên mobile
    }
    document.body.classList.add('left-collapsed');
    
    if (bubble && window.innerWidth <= 991) {
        bubble.style.display = 'flex';
    }
}

// Khôi phục hiển thị widget tin tức
function restoreNewsWidget() {
    const sidebar = document.getElementById('left-news-sidebar');
    const bubble = document.getElementById('news-widget-bubble');
    
    if (sidebar) {
        sidebar.classList.remove('collapsed');
        sidebar.classList.add('active'); // hiển thị trên mobile
    }
    document.body.classList.remove('left-collapsed');
    
    if (bubble) {
        bubble.style.display = 'none';
    }
}

// Đóng/Thu nhỏ/Mở rộng widget liên hệ (Không dùng nữa vì dùng floating stack trực tiếp)
function minimizeContactWidget() { }
function restoreContactWidget() { }
function toggleContactSidebarMobile() { }

// Giữ tương thích với các trigger cũ
function toggleNewsSidebarMobile() {
    const sidebar = document.getElementById('left-news-sidebar');
    if (sidebar) {
        if (sidebar.classList.contains('collapsed') || (window.innerWidth <= 991 && !sidebar.classList.contains('active'))) {
            restoreNewsWidget();
        } else {
            minimizeNewsWidget();
        }
    }
}

// Làm nổi bật Widget tin tức
function highlightNewsSidebar() {
    restoreNewsWidget();
    const sidebar = document.getElementById('left-news-sidebar');
    if (sidebar) {
        sidebar.classList.remove('highlight-pulse');
        void sidebar.offsetWidth; // Trigger reflow
        sidebar.classList.add('highlight-pulse');
        setTimeout(() => {
            sidebar.classList.remove('highlight-pulse');
        }, 1500);
        showToast('Xem cập nhật tin tức y tế mới nhất ở cột dọc bên trái!', 'info');
    }
}

// Fetch trending medical news từ backend API
async function loadSidebarNews(force = false) {
    const container = document.getElementById('sidebar-news-container');
    const btn = document.getElementById('btn-refresh-sidebar');
    const icon = document.getElementById('icon-refresh-sidebar');
    
    if (!container) return;
    
    // Dừng auto-play cũ nếu có
    if (window.newsCarouselIntervalId) {
        clearInterval(window.newsCarouselIntervalId);
        window.newsCarouselIntervalId = null;
    }
    
    if (icon) icon.classList.add('fa-spin');
    if (btn) btn.disabled = true;
    
    container.innerHTML = `
        <div class="news-sidebar-loading" style="padding: 40px; text-align: center; color: var(--text-muted); width: 100%;">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 20px; color: var(--primary); margin-bottom: 8px;"></i>
            <div style="font-size: 11px;">Đang tải tin y khoa...</div>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/ai/trending-news?force=${force}`);
        if (response.ok) {
            const articles = await response.json();
            renderSidebarNews(articles);
        } else {
            renderSidebarFallback();
        }
    } catch (error) {
        console.error("Lỗi fetch tin tức widget:", error);
        renderSidebarFallback();
    } finally {
        if (icon) icon.classList.remove('fa-spin');
        if (btn) btn.disabled = false;
    }
}

// Proxy duy trì tương thích
async function loadTrendingNews() {
    await loadSidebarNews();
}

const extraNewsArticles = [
    {
        title: "Bệnh tay chân miệng ở trẻ em: Dấu hiệu nhận biết và cách chăm sóc",
        category: "Nhi khoa",
        summary: "Tay chân miệng là bệnh truyền nhiễm thường gặp ở trẻ dưới 5 tuổi. Cha mẹ cần theo dõi sát sao để phát hiện sớm các dấu hiệu biến chứng nguy hiểm.",
        content: "Trẻ mắc bệnh cần được cách ly, giữ vệ sinh tay chân và các đồ chơi sạch sẽ. Cho trẻ ăn thức ăn lỏng, dễ tiêu và hạ sốt đúng cách. Đưa trẻ đến viện ngay nếu thấy giật mình, run chi hoặc quấy khóc liên tục.",
        author: "ThS. BS. Nguyễn Minh H (Nhi khoa)",
        publishDate: "2 giờ trước",
        hotTag: "NHI KHOA",
        themeColor: "primary",
        icon: "fa-baby",
        imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Huyết áp cao và những nguy cơ tiềm ẩn đối với hệ tim mạch",
        category: "Tim mạch",
        summary: "Huyết áp cao được ví như 'kẻ giết người thầm lặng'. Kiểm soát huyết áp giúp giảm đáng kể nguy cơ đột quỵ và nhồi máu cơ tim.",
        content: "Nên duy trì chế độ ăn nhạt, hạn chế chất béo bão hòa, tập thể dục ít nhất 30 phút mỗi ngày và đo huyết áp định kỳ. Không tự ý ngưng thuốc điều trị khi chưa có chỉ định của bác sĩ chuyên khoa tim mạch.",
        author: "TS. BS. Phạm Thanh T (Tim mạch)",
        publishDate: "3 giờ trước",
        hotTag: "TIM MẠCH",
        themeColor: "danger",
        icon: "fa-heart-pulse",
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    }
];

function renderSidebarNews(articles) {
    const container = document.getElementById('sidebar-news-container');
    if (!container || !articles) return;
    
    // Dừng auto-play cũ
    if (window.newsCarouselIntervalId) {
        clearInterval(window.newsCarouselIntervalId);
        window.newsCarouselIntervalId = null;
    }
    
    const normalizedArticles = articles.map(art => ({
        title: art.title || art.Title || '',
        category: art.category || art.Category || 'Nội khoa tổng quát',
        summary: art.summary || art.Summary || '',
        content: art.content || art.Content || '',
        author: art.author || art.Author || 'Bác sĩ CareConnect',
        publishDate: art.publishDate || art.PublishDate || 'Vừa xong',
        hotTag: art.hotTag || art.HotTag || '',
        themeColor: art.themeColor || art.ThemeColor || 'primary',
        icon: art.icon || art.Icon || 'fa-prescription-bottle-medical',
        imageUrl: art.imageUrl || art.ImageUrl || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500',
        sourceUrl: art.sourceUrl || art.SourceUrl || 'https://suckhoe.vnexpress.net/'
    }));
    
    const allArticles = normalizedArticles.length > 0 ? normalizedArticles : extraNewsArticles;
    
    let html = '';
    allArticles.forEach(art => {
        let themeColor = art.themeColor || 'primary';
        let bgStyle = 'var(--primary)';
        if (themeColor === 'success') bgStyle = 'var(--success)';
        else if (themeColor === 'warning') bgStyle = 'var(--warning)';
        else if (themeColor === 'danger') bgStyle = 'var(--danger)';
        else if (themeColor === 'info') bgStyle = '#0ea5e9';
        else if (themeColor === 'secondary') bgStyle = '#64748b';
        
        let hotTagHtml = art.hotTag ? `<span class="sidebar-news-cat-badge" style="background: ${bgStyle}">${art.hotTag}</span>` : `<span class="sidebar-news-cat-badge" style="background: ${bgStyle}">${art.category}</span>`;
        
        html += `
            <div class="sidebar-news-card">
                <div class="sidebar-news-img-wrapper">
                    <img src="${art.imageUrl}" alt="${art.title}" class="sidebar-news-img" onerror="this.src='https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500'">
                    ${hotTagHtml}
                </div>
                <div class="sidebar-news-info">
                    <a href="${art.sourceUrl}" target="_blank" style="text-decoration:none;"><h4 title="${art.title}">${art.title}</h4></a>
                    <p class="sidebar-news-summary">${art.summary}</p>
                    
                    <div class="sidebar-news-advice-box">
                        <strong>Bác sĩ tư vấn:</strong> ${art.content.replace(/ \(Thông tin chi tiết được cập nhật từ VnExpress Sức Khỏe\..*?\)/g, '')}
                    </div>

                    <div class="sidebar-news-meta">
                        <span><i class="fa-solid fa-user-doctor"></i> ${art.author}</span>
                        <span><i class="fa-solid fa-clock"></i> ${art.publishDate}</span>
                    </div>
                    <div style="text-align:right; margin-top: 4px;">
                        <a href="${art.sourceUrl}" target="_blank" class="sidebar-news-source-link">Đọc tin gốc <i class="fa-solid fa-arrow-up-right-from-square" style="font-size:8px;"></i></a>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
    
    // Thiết lập Carousel
    window.totalNewsSlides = allArticles.length;
    window.currentNewsSlideIndex = 0;
    
    // Render chấm tròn (dots)
    const dotsContainer = document.getElementById('news-carousel-dots');
    if (dotsContainer) {
        let dotsHtml = '';
        for (let i = 0; i < window.totalNewsSlides; i++) {
            dotsHtml += `<span class="news-carousel-dot ${i === 0 ? 'active' : ''}" onclick="goToNewsSlide(${i})" title="Tin ${i + 1}"></span>`;
        }
        dotsContainer.innerHTML = dotsHtml;
    }
    
    updateNewsCarousel();
    startNewsCarouselAutoPlay();
}

function renderSidebarFallback() {
    renderSidebarNews(extraNewsArticles);
}

// Logic bộ trượt News Carousel
window.updateNewsCarousel = function() {
    const container = document.getElementById('sidebar-news-container');
    if (container) {
        container.style.transform = `translateX(-${window.currentNewsSlideIndex * 100}%)`;
    }
    
    // Update active dot
    const dots = document.querySelectorAll('#news-carousel-dots .news-carousel-dot');
    dots.forEach((dot, index) => {
        if (index === window.currentNewsSlideIndex) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });
};

window.goToNewsSlide = function(index) {
    if (index < 0 || index >= window.totalNewsSlides) return;
    window.currentNewsSlideIndex = index;
    window.updateNewsCarousel();
};

window.prevNewsSlide = function() {
    let prevIndex = window.currentNewsSlideIndex - 1;
    if (prevIndex < 0) {
        prevIndex = window.totalNewsSlides - 1;
    }
    window.goToNewsSlide(prevIndex);
};

window.nextNewsSlide = function() {
    let nextIndex = window.currentNewsSlideIndex + 1;
    if (nextIndex >= window.totalNewsSlides) {
        nextIndex = 0;
    }
    window.goToNewsSlide(nextIndex);
};

window.startNewsCarouselAutoPlay = function() {
    if (window.newsCarouselIntervalId) {
        clearInterval(window.newsCarouselIntervalId);
    }
    window.newsCarouselIntervalId = setInterval(() => {
        if (!window.isNewsCarouselPaused) {
            window.nextNewsSlide();
        }
    }, 5000);
};

window.pauseNewsCarousel = function() {
    window.isNewsCarouselPaused = true;
};

window.resumeNewsCarousel = function() {
    window.isNewsCarouselPaused = false;
};


// ============================================
// MEDICAL KNOWLEDGE SCREEN LOGIC
// ============================================

const richFallbackKnowledgeArticles = [
    {
        title: "Bệnh tay chân miệng ở trẻ em: Dấu hiệu nhận biết và cách chăm sóc",
        category: "Nhi khoa",
        summary: "Tay chân miệng là bệnh truyền nhiễm thường gặp ở trẻ dưới 5 tuổi. Cha mẹ cần theo dõi sát sao để phát hiện sớm các dấu hiệu biến chứng nguy hiểm.",
        content: "Trẻ mắc bệnh cần được cách ly, giữ vệ sinh tay chân và các đồ chơi sạch sẽ. Cho trẻ ăn thức ăn lỏng, dễ tiêu và hạ sốt đúng cách. Đưa trẻ đến viện ngay nếu thấy giật mình, run chi hoặc quấy khóc liên tục.",
        author: "ThS. BS. Nguyễn Minh H (Nhi khoa)",
        publishDate: "2 giờ trước",
        hotTag: "NHI KHOA",
        themeColor: "primary",
        icon: "fa-baby",
        imageUrl: "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Sốt xuất huyết ở trẻ nhỏ: Cảnh báo sớm các dấu hiệu nguy kịch",
        category: "Nhi khoa",
        summary: "Sốt xuất huyết Dengue có diễn tiến rất nhanh và nguy hiểm ở trẻ em. Nhận biết sớm các dấu hiệu trở nặng để kịp thời đưa trẻ đi cấp cứu.",
        content: "Sốt xuất huyết thường có biểu hiện sốt cao liên tục từ 2-7 ngày kèm đau đầu, phát ban. Giai đoạn nguy hiểm thường rơi vào ngày thứ 3-7 của bệnh, khi trẻ hết sốt nhưng có nguy cơ thoát huyết tương, giảm tiểu cầu. Đưa trẻ đi viện ngay nếu có các biểu hiện: đau bụng dữ dội, nôn ói liên tục, chảy máu cam/chân răng, lờ đờ hoặc vật vã.",
        author: "BS. Lê Thị T (Nhi khoa)",
        publishDate: "1 ngày trước",
        hotTag: "NHI KHOA",
        themeColor: "primary",
        icon: "fa-baby",
        imageUrl: "https://images.unsplash.com/photo-1622445262465-2481c4574875?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Huyết áp cao và những nguy cơ tiềm ẩn đối với hệ tim mạch",
        category: "Tim mạch",
        summary: "Huyết áp cao được ví như 'kẻ giết người thầm lặng'. Kiểm soát huyết áp giúp giảm đáng kể nguy cơ đột quỵ và nhồi máu cơ tim.",
        content: "Nên duy trì chế độ ăn nhạt, hạn chế chất béo bão hòa, tập thể dục ít nhất 30 phút mỗi ngày và đo huyết áp định kỳ. Không tự ý ngưng thuốc điều trị khi chưa có chỉ định của bác sĩ chuyên khoa tim mạch.",
        author: "TS. BS. Phạm Thanh T (Tim mạch)",
        publishDate: "3 giờ trước",
        hotTag: "TIM MẠCH",
        themeColor: "danger",
        icon: "fa-heart-pulse",
        imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Chế độ ăn uống tốt nhất để bảo vệ sức khỏe tim mạch của bạn",
        category: "Tim mạch",
        summary: "Một chế độ ăn uống giàu chất xơ, chất béo lành mạnh như omega-3 sẽ bảo vệ thành mạch và ngăn ngừa các mảng xơ vữa.",
        content: "Chế độ ăn Địa Trung Hải với các nguyên liệu chính như rau xanh, cá hồi, quả bơ, dầu oliu và các loại hạt được chứng minh giúp làm giảm 30% nguy cơ biến cố tim mạch. Tránh ăn thực phẩm chế biến sẵn, nhiều muối và đường tinh luyện.",
        author: "PGS. TS. Trần Văn K (Tim mạch)",
        publishDate: "2 ngày trước",
        hotTag: "TIM MẠCH",
        themeColor: "danger",
        icon: "fa-heart-pulse",
        imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Chế độ ăn uống lành mạnh giảm mỡ máu cho người trung niên",
        category: "Dinh dưỡng",
        summary: "Rối loạn lipid máu là nguyên nhân chính dẫn đến xơ vữa động mạch. Thay đổi chế độ ăn uống là bước đầu tiên và quan trọng nhất để điều trị.",
        content: "Tăng cường chất xơ hòa tan từ yến mạch, các loại đậu, táo. Sử dụng chất béo không bão hòa từ dầu thực vật. Hạn chế tối đa mỡ động vật, phủ tạng và đồ chiên rán. Tập thể dục đều đặn 150 phút mỗi tuần.",
        author: "ThS. BS. Nguyễn Thùy L (Dinh dưỡng)",
        publishDate: "5 giờ trước",
        hotTag: "DINH DƯỠNG",
        themeColor: "success",
        icon: "fa-leaf",
        imageUrl: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Sự thật về chế độ ăn giảm cân Keto và những lưu ý y khoa quan trọng",
        category: "Dinh dưỡng",
        summary: "Chế độ ăn Ketogenic (giảm carb, tăng béo) rất phổ biến để giảm cân, nhưng có thực sự an toàn dài hạn cho cơ thể?",
        content: "Keto giúp giảm cân nhanh nhờ đốt cháy mỡ tạo ketone làm năng lượng. Tuy nhiên, ăn Keto kéo dài có thể gây gánh nặng cho gan, thận, tăng cholesterol xấu (LDL) và thiếu hụt vi chất. Người bị bệnh đái tháo đường, suy gan thận cần tham khảo ý kiến bác sĩ trước khi áp dụng.",
        author: "BS. Trần Thị M (Dinh dưỡng)",
        publishDate: "3 ngày trước",
        hotTag: "DINH DƯỠNG",
        themeColor: "success",
        icon: "fa-leaf",
        imageUrl: "https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Những mốc khám thai quan trọng mẹ bầu không được bỏ qua",
        category: "Sản phụ khoa",
        summary: "Khám thai định kỳ đúng lịch giúp phát hiện sớm các dị tật thai nhi bẩm sinh và các biến chứng sản khoa nguy hiểm.",
        content: "Mẹ bầu cần lưu ý 3 mốc siêu âm đặc biệt quan trọng: Tuần 11-13 (đo độ mờ da gáy), Tuần 20-24 (khảo sát hình thái học thai nhi), và Tuần 30-32 (đánh giá tăng trưởng thai). Đồng thời thực hiện xét nghiệm dung nạp đường ở tuần 24-28 để tầm soát tiểu đường thai kỳ.",
        author: "BSCKII. Nguyễn Thị V (Sản phụ khoa)",
        publishDate: "6 giờ trước",
        hotTag: "SẢN PHỤ KHOA",
        themeColor: "warning",
        icon: "fa-person-pregnant",
        imageUrl: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Chăm sóc sức khỏe phụ nữ sau sinh: Dinh dưỡng và hồi phục thể trạng",
        category: "Sản phụ khoa",
        summary: "Hồi phục sau sinh là quá trình đòi hỏi sự kết hợp giữa dinh dưỡng khoa học, vận động nhẹ nhàng và chăm sóc tâm lý.",
        content: "Phụ nữ sau sinh cần ăn uống đủ chất, giàu đạm, sắt và canxi để tái tạo máu và tạo sữa. Uống nhiều nước, giữ vệ sinh vết mổ/vết khâu tầng sinh môn sạch sẽ. Chú ý vận động nhẹ nhàng để tránh bế sản dịch. Gia đình cần quan tâm tránh trầm cảm sau sinh.",
        author: "ThS. BS. Phan Hoàng Y (Sản phụ khoa)",
        publishDate: "4 ngày trước",
        hotTag: "SẢN PHỤ KHOA",
        themeColor: "warning",
        icon: "fa-person-pregnant",
        imageUrl: "https://images.unsplash.com/photo-1531983412531-1f49a365f698?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Cập nhật tình hình dịch cúm mùa và khuyến cáo tiêm chủng mới nhất",
        category: "Dịch tễ học",
        summary: "Dịch cúm mùa (cúm A, cúm B) đang có xu hướng gia tăng vào giai đoạn giao mùa. Tiêm phòng là biện pháp phòng ngừa hữu hiệu nhất.",
        content: "Cúm mùa có thể gây biến chứng viêm phổi nặng, đặc biệt ở người già và trẻ nhỏ. Bộ Y tế khuyến cáo người dân nên tiêm nhắc lại vắc xin cúm mỗi năm một lần. Rửa tay thường xuyên, đeo khẩu trang nơi đông người và hạn chế tiếp xúc trực tiếp với người đang có triệu chứng sốt, ho.",
        author: "PGS. TS. Lê Hoàng G (Dịch tễ học)",
        publishDate: "1 ngày trước",
        hotTag: "DỊCH TỄ HỌC",
        themeColor: "info",
        icon: "fa-shield-virus",
        imageUrl: "https://images.unsplash.com/photo-1584036561566-baf2418b7c2a?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Đau đầu và các dấu hiệu cảnh báo cần đi khám bác sĩ ngay lập tức",
        category: "Y học thường thức",
        summary: "Không phải mọi cơn đau đầu đều lành tính. Một số dấu hiệu cảnh báo nguy cơ tai biến mạch máu não hoặc u não.",
        content: "Đi khám ngay nếu đau đầu dữ dội đột ngột (đau đầu như búa bổ), đau kèm sốt, cứng cổ, lơ mơ hoặc co giật. Đau đầu kèm yếu liệt chi, méo miệng hoặc khó nói cũng là dấu hiệu cấp cứu đột quỵ não.",
        author: "TS. BS. Nguyễn Văn Doanh (Thần kinh)",
        publishDate: "12 giờ trước",
        hotTag: "THƯỜNG THỨC",
        themeColor: "secondary",
        icon: "fa-brain",
        imageUrl: "https://images.unsplash.com/photo-1559757175-5700dde675bc?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    },
    {
        title: "Nguy hại từ thói quen tự ý mua thuốc kháng sinh điều trị tại nhà",
        category: "Y học thường thức",
        summary: "Lạm dụng kháng sinh là nguyên nhân chính dẫn đến tình trạng kháng thuốc cực kỳ nguy hiểm, đe dọa sức khỏe cộng đồng.",
        content: "Kháng sinh chỉ tiêu diệt được vi khuẩn, không có tác dụng với virus (như cúm, viêm họng do virus). Việc tự ý mua kháng sinh uống khi bị ho, sốt thông thường không giúp khỏi bệnh mà còn làm tăng nguy cơ tác dụng phụ và đề kháng kháng sinh.",
        author: "Dược sĩ Nguyễn Thị L (Dược lâm sàng)",
        publishDate: "5 ngày trước",
        hotTag: "THƯỜNG THỨC",
        themeColor: "secondary",
        icon: "fa-capsules",
        imageUrl: "https://images.unsplash.com/photo-1471864190281-a93a3070b6de?w=500",
        sourceUrl: "https://suckhoe.vnexpress.net/"
    }
];

window.currentKnowledgeArticles = [];
window.selectedKnowledgeCategory = 'Tất cả';
window.knowledgeSearchQuery = '';

window.loadKnowledgeNews = async function(force = false) {
    const container = document.getElementById('knowledge-news-container');
    const btn = document.getElementById('knowledge-refresh-btn');
    const icon = document.getElementById('knowledge-refresh-icon');
    
    if (!container) return;
    
    if (icon) icon.classList.add('fa-spin');
    if (btn) btn.disabled = true;
    
    container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 60px; text-align: center; color: var(--text-muted);">
            <i class="fa-solid fa-spinner fa-spin" style="font-size: 32px; color: var(--primary); margin-bottom: 16px;"></i>
            <div style="font-size: 15px; font-weight: 600;">Đang tải và cập nhật tin tức y khoa từ AI...</div>
        </div>
    `;
    
    try {
        const response = await fetch(`${API_BASE}/ai/trending-news?force=${force}`);
        let articles = [];
        if (response.ok) {
            articles = await response.json();
        }
        
        const apiArticlesNormalized = (articles || []).map(art => ({
            title: art.title || art.Title || '',
            category: art.category || art.Category || 'Y học thường thức',
            summary: art.summary || art.Summary || '',
            content: art.content || art.Content || '',
            author: art.author || art.Author || 'Bác sĩ CareConnect',
            publishDate: art.publishDate || art.PublishDate || 'Vừa xong',
            hotTag: art.hotTag || art.HotTag || '',
            themeColor: art.themeColor || art.ThemeColor || 'primary',
            icon: art.icon || art.Icon || 'fa-prescription-bottle-medical',
            imageUrl: art.imageUrl || art.ImageUrl || 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500',
            sourceUrl: art.sourceUrl || art.SourceUrl || 'https://suckhoe.vnexpress.net/'
        }));

        const allArticles = [...apiArticlesNormalized, ...richFallbackKnowledgeArticles];
        
        // Remove duplicates based on Title
        const uniqueArticles = [];
        const seenTitles = new Set();
        allArticles.forEach(art => {
            const cleanTitle = art.title.trim().toLowerCase();
            if (!seenTitles.has(cleanTitle)) {
                seenTitles.add(cleanTitle);
                uniqueArticles.push(art);
            }
        });
        
        window.currentKnowledgeArticles = uniqueArticles;
        window.renderKnowledgeArticles();
    } catch (error) {
        console.error("Lỗi tải kiến thức y khoa:", error);
        window.currentKnowledgeArticles = richFallbackKnowledgeArticles;
        window.renderKnowledgeArticles();
    } finally {
        if (icon) icon.classList.remove('fa-spin');
        if (btn) btn.disabled = false;
    }
};

window.filterKnowledgeCategory = function(category, element) {
    window.selectedKnowledgeCategory = category;
    
    const buttons = document.querySelectorAll('.news-categories-bar .news-cat-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    if (element) {
        element.classList.add('active');
    }
    
    window.renderKnowledgeArticles();
};

window.onKnowledgeSearch = function(val) {
    window.knowledgeSearchQuery = val;
    const clearBtn = document.getElementById('knowledge-search-clear-btn');
    if (clearBtn) {
        clearBtn.style.display = val.trim() ? 'block' : 'none';
    }
    window.renderKnowledgeArticles();
};

window.clearKnowledgeSearch = function() {
    const input = document.getElementById('knowledge-search-input');
    if (input) input.value = '';
    window.knowledgeSearchQuery = '';
    const clearBtn = document.getElementById('knowledge-search-clear-btn');
    if (clearBtn) clearBtn.style.display = 'none';
    window.renderKnowledgeArticles();
};

window.renderKnowledgeArticles = function() {
    const container = document.getElementById('knowledge-news-container');
    if (!container) return;
    
    let filtered = window.currentKnowledgeArticles;
    if (window.selectedKnowledgeCategory !== 'Tất cả') {
        filtered = filtered.filter(art => art.category === window.selectedKnowledgeCategory);
    }
    
    if (window.knowledgeSearchQuery) {
        const query = window.knowledgeSearchQuery.toLowerCase().trim();
        filtered = filtered.filter(art => 
            art.title.toLowerCase().includes(query) || 
            art.summary.toLowerCase().includes(query) ||
            art.category.toLowerCase().includes(query)
        );
    }
    
    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="grid-column: 1 / -1; padding: 40px; text-align: center; color: var(--text-muted); background: rgba(255, 255, 255, 0.5); border-radius: 12px; border: 1px dashed var(--border-color); width: 100%;">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; margin-bottom: 12px; color: var(--text-muted);"></i>
                <div style="font-size: 15px; font-weight: 600;">Không tìm thấy bài viết y khoa nào phù hợp.</div>
                <div style="font-size: 13px; margin-top: 4px;">Hãy thử chọn chuyên khoa khác hoặc tìm kiếm với từ khóa khác.</div>
            </div>
        `;
        return;
    }
    
    let html = '';
    filtered.forEach((art, index) => {
        let themeColor = art.themeColor || 'primary';
        let bgStyle = 'var(--primary)';
        if (themeColor === 'success') bgStyle = 'var(--success)';
        else if (themeColor === 'warning') bgStyle = 'var(--warning)';
        else if (themeColor === 'danger') bgStyle = 'var(--danger)';
        else if (themeColor === 'info') bgStyle = '#0ea5e9';
        else if (themeColor === 'secondary') bgStyle = '#64748b';
        
        let iconName = art.icon || 'fa-prescription-bottle-medical';
        if (art.category === 'Nhi khoa') iconName = 'fa-baby';
        else if (art.category === 'Tim mạch') iconName = 'fa-heart-pulse';
        else if (art.category === 'Dinh dưỡng') iconName = 'fa-leaf';
        else if (art.category === 'Sản phụ khoa') iconName = 'fa-person-pregnant';
        else if (art.category === 'Dịch tễ học') iconName = 'fa-shield-virus';
        else if (art.category === 'Y học thường thức') iconName = 'fa-brain';

        const artJsonEscaped = JSON.stringify(art).replace(/"/g, '&quot;');
        
        html += `
            <div class="card" style="display: flex; flex-direction: column; overflow: hidden; border-radius: 12px; border: 1px solid var(--border-color); background: #ffffff; box-shadow: var(--shadow-sm); transition: all 0.3s ease; height: 100%;" onmouseover="this.style.transform='translateY(-4px)'; this.style.boxShadow='var(--shadow-md)'" onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='var(--shadow-sm)'">
                <div style="position: relative; height: 180px; overflow: hidden;">
                    <img src="${art.imageUrl}" alt="${art.title}" style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.5s;" onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'" onerror="this.src='https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=500'">
                    <span style="position: absolute; top: 12px; left: 12px; background: ${bgStyle}; color: #fff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; box-shadow: 0 2px 4px rgba(0,0,0,0.15);"><i class="fa-solid ${iconName}"></i> ${art.category}</span>
                </div>
                
                <div style="padding: 20px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
                    <div>
                        <h3 style="font-size: 15.5px; font-weight: 800; line-height: 1.4; color: var(--dark); margin-bottom: 10px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; min-height: 44px;">
                            ${art.title}
                        </h3>
                        <p style="font-size: 13.5px; color: var(--text-muted); line-height: 1.5; margin-bottom: 16px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; min-height: 60px;">
                            ${art.summary}
                        </p>
                    </div>
                    
                    <div>
                        <div style="background: var(--bg-light); border-left: 3px solid ${bgStyle}; padding: 10px 12px; border-radius: 0 6px 6px 0; margin-bottom: 16px; font-size: 12.5px; color: var(--text-main);">
                            <span style="font-weight: 700; color: var(--dark);">Lời khuyên:</span> ${art.content.length > 100 ? art.content.substring(0, 100) + '...' : art.content}
                        </div>
                        
                        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; color: var(--text-muted); border-top: 1px solid var(--border-color); padding-top: 12px;">
                            <span><i class="fa-solid fa-user-doctor" style="color: ${bgStyle}; margin-right: 4px;"></i> ${art.author}</span>
                            <span><i class="fa-regular fa-clock" style="margin-right: 4px;"></i> ${art.publishDate}</span>
                        </div>
                        
                        <div style="display: flex; gap: 8px; margin-top: 12px;">
                            <button class="btn btn-primary" onclick="showKnowledgeDetailModal(${artJsonEscaped})" style="flex: 1; padding: 8px 12px; font-size: 12.5px; font-weight: 700; border-radius: 6px; display: flex; align-items: center; justify-content: center; gap: 6px; background: ${bgStyle}; border-color: ${bgStyle}; color: #fff;">
                                <i class="fa-solid fa-book-open"></i> Đọc chi tiết
                            </button>
                            <a href="${art.sourceUrl}" target="_blank" class="btn btn-secondary" style="padding: 8px 12px; font-size: 12.5px; font-weight: 700; border-radius: 6px; background: #fff; border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; color: var(--text-main); text-decoration: none;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Tin gốc
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
};

window.showKnowledgeDetailModal = function(art) {
    let modal = document.getElementById('knowledge-detail-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'knowledge-detail-modal';
        modal.className = 'modal';
        modal.style.display = 'none';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 700px; border-radius: 16px; overflow: hidden; padding: 0; display: block; border: none; box-shadow: var(--shadow-lg);">
                <div id="knowledge-modal-header-color" style="height: 12px; background: var(--primary);"></div>
                <div style="padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
                        <div style="padding-right: 24px;">
                            <span id="knowledge-modal-category" class="badge" style="background: var(--primary-light); color: var(--primary); font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 20px; text-transform: uppercase;"></span>
                            <h2 id="knowledge-modal-title" style="font-size: 20px; font-weight: 850; color: var(--dark); margin-top: 8px; line-height: 1.4;"></h2>
                        </div>
                        <span class="close-modal" onclick="closeKnowledgeDetailModal()" style="font-size: 28px; cursor: pointer; color: var(--text-muted); line-height: 1; padding: 4px;">&times;</span>
                    </div>
                    
                    <div style="display: flex; gap: 12px; font-size: 12px; color: var(--text-muted); margin-bottom: 20px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
                        <span><i class="fa-solid fa-user-doctor"></i> Tác giả: <strong id="knowledge-modal-author" style="color: var(--dark);"></strong></span>
                        <span><i class="fa-regular fa-clock"></i> Đăng lúc: <span id="knowledge-modal-date"></span></span>
                    </div>
                    
                    <div id="knowledge-modal-image-container" style="width: 100%; height: 280px; border-radius: 8px; overflow: hidden; margin-bottom: 20px; display: none;">
                        <img id="knowledge-modal-image" src="" alt="" style="width: 100%; height: 100%; object-fit: cover;">
                    </div>
                    
                    <div style="font-size: 14.5px; line-height: 1.6; color: var(--text-main); margin-bottom: 20px; max-height: 350px; overflow-y: auto; padding-right: 8px;">
                        <p id="knowledge-modal-summary" style="font-weight: 600; font-size: 15px; color: var(--dark); margin-bottom: 16px; padding: 12px; background: var(--bg-light); border-radius: 8px; border-left: 4px solid var(--primary);"></p>
                        <div id="knowledge-modal-content" style="white-space: pre-line;"></div>
                    </div>
                    
                    <div style="display: flex; justify-content: flex-end; gap: 12px; border-top: 1px solid var(--border-color); padding-top: 16px;">
                        <a id="knowledge-modal-source" href="" target="_blank" class="btn btn-secondary" style="padding: 10px 20px; border-radius: 8px; display: flex; align-items: center; gap: 6px; font-weight: 700; font-size: 13px; text-decoration: none; background: #fff; border: 1px solid var(--border-color); color: var(--text-main);">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Xem bài viết gốc
                        </a>
                        <button class="btn btn-primary" onclick="closeKnowledgeDetailModal()" style="padding: 10px 20px; border-radius: 8px; font-weight: 700; font-size: 13px; color: #fff;">
                            Đóng lại
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    let themeColor = art.themeColor || 'primary';
    let bgStyle = 'var(--primary)';
    if (themeColor === 'success') bgStyle = 'var(--success)';
    else if (themeColor === 'warning') bgStyle = 'var(--warning)';
    else if (themeColor === 'danger') bgStyle = 'var(--danger)';
    else if (themeColor === 'info') bgStyle = '#0ea5e9';
    else if (themeColor === 'secondary') bgStyle = '#64748b';
    
    document.getElementById('knowledge-modal-header-color').style.background = bgStyle;
    document.getElementById('knowledge-modal-category').innerText = art.category;
    document.getElementById('knowledge-modal-category').style.color = bgStyle;
    document.getElementById('knowledge-modal-category').style.background = themeColor === 'primary' ? 'var(--primary-light)' : (themeColor === 'success' ? 'var(--success-light)' : (themeColor === 'warning' ? 'var(--warning-light)' : 'rgba(100, 116, 139, 0.1)'));
    document.getElementById('knowledge-modal-title').innerText = art.title;
    document.getElementById('knowledge-modal-author').innerText = art.author;
    document.getElementById('knowledge-modal-date').innerText = art.publishDate;
    
    const summaryEl = document.getElementById('knowledge-modal-summary');
    summaryEl.innerText = art.summary;
    summaryEl.style.borderLeftColor = bgStyle;
    
    document.getElementById('knowledge-modal-content').innerText = art.content;
    
    const imgEl = document.getElementById('knowledge-modal-image');
    const imgContainer = document.getElementById('knowledge-modal-image-container');
    if (art.imageUrl) {
        imgEl.src = art.imageUrl;
        imgContainer.style.display = 'block';
    } else {
        imgContainer.style.display = 'none';
    }
    
    document.getElementById('knowledge-modal-source').href = art.sourceUrl;
    
    modal.style.display = 'flex';
};

window.closeKnowledgeDetailModal = function() {
    const modal = document.getElementById('knowledge-detail-modal');
    if (modal) modal.style.display = 'none';
};


// ============================================
// HOSPITAL FINDER & BRANCH BOOKING LOGIC
// ============================================

// Global list of current nearby hospitals
window.nearbyHospitals = null;

// Haversine formula to calculate distance in km between two coordinates
function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

// Generate realistic mock clinics in the user's vicinity
async function generateNearbyMockClinics(userLat, userLng, addressHint) {
    // Attempt reverse geocoding to get user's neighborhood name
    let district = 'Lân Cận';
    let city = 'Khu Vực';
    let road = 'Hiện Tại';
    
    if (addressHint) {
        const parts = addressHint.split(',')
            .map(p => p.trim())
            .filter(p => p && p.toLowerCase() !== 'việt nam' && p.toLowerCase() !== 'vietnam');
            
        if (parts.length > 0) {
            city = parts[parts.length - 1];
            district = parts.length > 1 ? parts[parts.length - 2] : 'Quận Trung Tâm';
            const rawRoad = parts.length > 2 ? parts[parts.length - 3] : 'Trung Tâm';
            road = rawRoad.replace(/^\d+\s*/, '').replace(/^(đường|duong)\s*/i, '');
        }
    } else {
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=14`, {
                headers: { 'Accept-Language': 'vi,en;q=0.9' }
            });
            if (res.ok) {
                const data = await res.json();
                const address = data.address;
                if (address) {
                    district = address.county || address.suburb || address.district || 'Quận Trung Tâm';
                    city = address.city || address.town || address.state || 'TP. Hà Nội';
                    road = address.road || 'Đường Trung Tâm';
                }
            }
        } catch (e) {
            console.error('Nominatim reverse geocode failed, using generic terms.');
        }
    }

    let displayName = district;
    if (displayName === 'Lân Cận' || displayName === 'Quận Trung Tâm' || displayName === 'Trung Tâm') {
        displayName = city;
    }

    return [
        {
            name: `Phòng Khám Đa Khoa CareConnect - ${displayName}`,
            address: `Số 15 Đường ${road}, ${district}, ${city}`,
            phone: '1900-CARE-PK1',
            lat: userLat + 0.0042,
            lng: userLng - 0.0035
        },
        {
            name: `Bệnh Viện Liên Kết CareConnect - ${displayName}`,
            address: `Số 242 Đường Gần Đây, ${district}, ${city}`,
            phone: '1900-CARE-BV2',
            lat: userLat - 0.0078,
            lng: userLng + 0.0091
        },
        {
            name: `Trung Tâm Y Tế CareConnect - ${displayName}`,
            address: `Số 88 Đại Lộ Tiếp Giáp, ${district}, ${city}`,
            phone: '1900-CARE-TT3',
            lat: userLat + 0.0152,
            lng: userLng + 0.0124
        }
    ];
}

// Fetch real clinics and hospitals from OpenStreetMap using Overpass API
async function fetchOSMNearbyHospitals(userLat, userLng) {
    const radius = 50000; // 50 km
    const query = `[out:json][timeout:15];
    (
      node["amenity"="hospital"](around:${radius},${userLat},${userLng});
      way["amenity"="hospital"](around:${radius},${userLat},${userLng});
      node["amenity"="clinic"](around:${radius},${userLat},${userLng});
      way["amenity"="clinic"](around:${radius},${userLat},${userLng});
    );
    out center;`;
    const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('OSM request failed');
    const data = await response.json();
    
    const elements = data.elements || [];
    const hospitals = [];
    
    elements.forEach(el => {
        const name = el.tags.name || el.tags['name:vi'] || el.tags['name:en'];
        if (!name) return;
        
        const elLat = el.lat || (el.center && el.center.lat);
        const elLng = el.lon || (el.center && el.center.lon);
        if (!elLat || !elLng) return;
        
        let address = '';
        if (el.tags['addr:full']) {
            address = el.tags['addr:full'];
        } else {
            const num = el.tags['addr:housenumber'] || '';
            const street = el.tags['addr:street'] || '';
            const suburb = el.tags['addr:suburb'] || el.tags['addr:district'] || '';
            const city = el.tags['addr:city'] || el.tags['addr:province'] || '';
            address = [num, street, suburb, city].filter(Boolean).join(', ');
        }
        if (!address) {
            address = `Tọa độ: ${elLat.toFixed(4)}, ${elLng.toFixed(4)}`;
        }
        
        hospitals.push({
            name: name,
            address: address,
            phone: el.tags.phone || el.tags['contact:phone'] || '1900-OSM-CARE',
            lat: elLat,
            lng: elLng
        });
    });
    
    // Sort by distance and return
    hospitals.forEach(h => {
        h.distance = getHaversineDistance(userLat, userLng, h.lat, h.lng);
    });
    hospitals.sort((a, b) => a.distance - b.distance);
    
    return hospitals;
}

// Geolocate user and load actual or mock clinics near them
async function locateUserAndSortHospitals() {
    if (!navigator.geolocation) {
        showToast('Trình duyệt của bạn không hỗ trợ định vị GPS.', 'warning');
        return;
    }

    showToast('Đang quét các phòng khám và bệnh viện gần bạn nhất...', 'info');

    navigator.geolocation.getCurrentPosition(
        async (position) => {
            const userLat = position.coords.latitude;
            const userLng = position.coords.longitude;
            
            let address = '';
            try {
                const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${userLat}&lon=${userLng}&zoom=14`, {
                    headers: { 'Accept-Language': 'vi,en;q=0.9' }
                });
                if (geoRes.ok) {
                    const geoData = await geoRes.json();
                    if (geoData && geoData.display_name) {
                        address = geoData.display_name;
                    }
                }
            } catch (e) {
                console.error('Reverse geocode during locateUserAndSortHospitals failed', e);
            }

            let clinics = [];
            try {
                // Try fetching actual hospitals from OSM Overpass API
                clinics = await fetchOSMNearbyHospitals(userLat, userLng);
            } catch (e) {
                console.error('OSM Overpass search failed, falling back to mock clinics.', e);
            }
            
            // If OSM failed or returned less than 3 clinics, generate mock clinics in user vicinity
            if (clinics.length < 3) {
                const mockClinics = await generateNearbyMockClinics(userLat, userLng, address);
                mockClinics.forEach(mock => {
                    if (clinics.length < 3 && !clinics.some(c => c.name === mock.name)) {
                        clinics.push(mock);
                    }
                });
            }
            
            // Slice top 3 closest clinics
            window.nearbyHospitals = clinics.slice(0, 3);
            
            // Update distance property
            window.nearbyHospitals.forEach(c => {
                c.distance = getHaversineDistance(userLat, userLng, c.lat, c.lng);
            });
            
            // Save to localStorage to persist across login/reload
            localStorage.setItem('nearbyHospitals', JSON.stringify(window.nearbyHospitals));
            if (address) {
                localStorage.setItem('lastLocalizedAddress', address);
            }

            // Update DOM Cards
            updateHospitalCardsUI();
            
            showToast('Đã tìm thấy phòng khám/bệnh viện gần nhất đối với bạn!', 'success');
        },
        (error) => {
            console.error('Geolocation error:', error);
            let msg = 'Không thể lấy vị trí của bạn.';
            if (error.code === error.PERMISSION_DENIED) {
                msg = 'Quyền truy cập vị trí bị từ chối. Vui lòng cho phép truy cập vị trí trong cài đặt trình duyệt.';
            } else if (error.code === error.POSITION_UNAVAILABLE) {
                msg = 'Thông tin vị trí không khả dụng.';
            } else if (error.code === error.TIMEOUT) {
                msg = 'Quá thời gian yêu cầu vị trí.';
            }
            showToast(msg, 'error');
        },
        { enableHighAccuracy: true, timeout: 8000 }
    );
}

// Update hospital cards on the main landing page & booking select options
function updateHospitalCardsUI() {
    if (!window.nearbyHospitals || window.nearbyHospitals.length < 3) return;

    // 1. Update hospital cards in the finder section
    const container = document.getElementById('hospitals-list-container');
    if (container) {
        const cards = Array.from(container.querySelectorAll('.hospital-card'));
        window.nearbyHospitals.forEach((clinic, idx) => {
            const card = cards[idx];
            if (card) {
                card.setAttribute('data-lat', clinic.lat.toString());
                card.setAttribute('data-lng', clinic.lng.toString());
                card.setAttribute('data-name', clinic.name);
                card.dataset.distanceValue = clinic.distance;
                
                // Update Title
                const titleEl = card.querySelector('h3');
                if (titleEl) titleEl.textContent = clinic.name;
                
                // Update Address
                const addrEl = card.querySelector('p:nth-of-type(1)');
                if (addrEl) addrEl.innerHTML = `<i class="fa-solid fa-map-location-dot" style="margin-right: 6px;"></i> ${clinic.address}`;
                
                // Update Phone
                const phoneEl = card.querySelector('p:nth-of-type(2)');
                if (phoneEl) phoneEl.innerHTML = `<i class="fa-solid fa-phone" style="margin-right: 6px;"></i> Hotline: ${clinic.phone}`;
                
                // Update Booking Button
                const btnEl = card.querySelector('.book-branch-btn');
                if (btnEl) btnEl.setAttribute('onclick', `bookAtHospitalBranch('${clinic.name.replace(/'/g, "\\'")}')`);
                
                // Update View Map Button
                const mapBtn = card.querySelector('.view-map-btn');
                if (mapBtn) {
                    mapBtn.setAttribute('onclick', `showBranchMapRoute('${clinic.name.replace(/'/g, "\\'")}', ${clinic.lat}, ${clinic.lng}, '${clinic.address.replace(/'/g, "\\'")}')`);
                }
                
                // Update Distance Badge
                const badge = card.querySelector('.distance-badge');
                if (badge) {
                    badge.innerHTML = `<i class="fa-solid fa-location-dot"></i> Khoảng cách: ${clinic.distance.toFixed(1)} km`;
                    badge.style.background = 'var(--primary)';
                    badge.style.color = '#fff';
                }
            }
        });
        
        // Sort cards by distance
        cards.sort((a, b) => parseFloat(a.dataset.distanceValue) - parseFloat(b.dataset.distanceValue));
        container.innerHTML = '';
        cards.forEach(card => container.appendChild(card));
    }

    // 2. Update booking form select option text
    const branchSelect = document.getElementById('booking-branch');
    if (branchSelect) {
        branchSelect.options[1].text = `${window.nearbyHospitals[0].name} (${window.nearbyHospitals[0].distance.toFixed(1)} km)`;
        branchSelect.options[2].text = `${window.nearbyHospitals[1].name} (${window.nearbyHospitals[1].distance.toFixed(1)} km)`;
        branchSelect.options[3].text = `${window.nearbyHospitals[2].name} (${window.nearbyHospitals[2].distance.toFixed(1)} km)`;
        
        // If modal is open and select value is empty, auto-select nearest hospital (Option 1)
        const modal = document.getElementById('booking-modal');
        if (modal && modal.style.display === 'flex' && !branchSelect.value) {
            branchSelect.selectedIndex = 1;
            onBookingBranchChange();
        }
    }

    // 3. Update proposed locations in health checkup package cards
    const pkgBranchInfos = document.querySelectorAll('.package-branch-info');
    if (pkgBranchInfos.length >= 4) {
        const mappings = [
            window.nearbyHospitals[0], // Card 1 (Standard): CC Quận 1 -> local 0
            window.nearbyHospitals[2], // Card 2 (Tim mạch): CC Thủ Đức -> local 2
            window.nearbyHospitals[1], // Card 3 (Nhi khoa): CC Quận 3 -> local 1
            window.nearbyHospitals[0]  // Card 4 (Ung thư): CC Quận 1 -> local 0
        ];
        
        pkgBranchInfos.forEach((el, idx) => {
            const clinic = mappings[idx];
            if (clinic) {
                const spans = el.querySelectorAll('span');
                if (spans.length >= 3) {
                    // Update Title
                    spans[0].textContent = `Đề xuất: ${clinic.name}`;
                    // Update Address
                    spans[1].textContent = clinic.address;
                    // Update Hotline
                    spans[2].textContent = `Hotline: ${clinic.phone}`;
                }
            }
        });
    }
}

// Restore nearby hospitals from local storage if previously queried
function restoreNearbyHospitals() {
    const stored = localStorage.getItem('nearbyHospitals');
    if (!stored) return;
    if (/[\u4e00-\u9fa5]/.test(stored)) {
        localStorage.removeItem('nearbyHospitals');
        localStorage.removeItem('lastLocalizedAddress');
        return;
    }
    try {
        window.nearbyHospitals = JSON.parse(stored);
        updateHospitalCardsUI();
    } catch (e) {
        console.error('Failed to restore nearby hospitals:', e);
    }
}

// Redirect or scroll to booking form and select branch
function bookAtHospitalBranch(branchName) {
    // Map dynamic clinic/hospital name back to database branch names (for API/Doctor compatibility)
    let dbBranchName = branchName;
    if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
        if (branchName === window.nearbyHospitals[0].name) dbBranchName = 'CareConnect Quận 1';
        else if (branchName === window.nearbyHospitals[1].name) dbBranchName = 'CareConnect Quận 3';
        else if (branchName === window.nearbyHospitals[2].name) dbBranchName = 'CareConnect Thủ Đức';
    }

    if (token) {
        if (userRole !== 'Patient') {
            showToast('Chức năng đặt lịch chỉ dành cho tài khoản Bệnh nhân.', 'warning');
            return;
        }
        openBookingModal();
        setTimeout(() => {
            const branchSelect = document.getElementById('booking-branch');
            if (branchSelect) {
                branchSelect.value = dbBranchName;
                onBookingBranchChange();
            }
            showToast(`Đã chọn chi nhánh: ${branchName}. Hãy hoàn tất thông tin đặt lịch!`, 'success');
        }, 400);
    } else {
        // User is not logged in, save to pending branch
        window.pendingBranchFromLanding = dbBranchName;
        // Take user to login screen
        showAuthScreen(false);
        showToast(`Vui lòng đăng nhập tài khoản bệnh nhân để đặt lịch hẹn tại ${branchName}.`, 'info');
    }
}

// Filter doctor list by selected hospital branch and specialty
function filterDoctorsBySelectedBranch() {
    const branchSelect = document.getElementById('booking-branch');
    const doctorSelect = document.getElementById('booking-doctor');
    const specialtySelect = document.getElementById('booking-specialty');
    if (!branchSelect || !doctorSelect) return;

    const selectedBranch = branchSelect.value;
    const selectedSpecialty = specialtySelect ? specialtySelect.value : "";
    const doctors = window.allDoctors || [];

    // Filter doctors by branch and specialty
    let filteredDoctors = doctors;
    if (selectedBranch) {
        const isCustomBranch = selectedBranch !== 'CareConnect Quận 1' && 
                             selectedBranch !== 'CareConnect Quận 3' && 
                             selectedBranch !== 'CareConnect Thủ Đức';
                             
        // Bypass filtering only if booking a package
        const symptomsField = document.getElementById('booking-symptoms');
        const isPackageBooking = symptomsField && symptomsField.value.includes('[Gói khám:');
        
        if (!isCustomBranch && selectedBranch !== 'Tư vấn Trực tuyến (Telehealth)' && !isPackageBooking) {
            filteredDoctors = filteredDoctors.filter(doc => doc.hospitalBranch === selectedBranch);
        }
    }
    if (selectedSpecialty) {
        filteredDoctors = filteredDoctors.filter(doc => {
            const spec = doc.specialization || "";
            return spec.toLowerCase() === selectedSpecialty.toLowerCase() ||
                   spec.toLowerCase().includes(selectedSpecialty.toLowerCase());
        });
    }

    if (filteredDoctors.length === 0) {
        doctorSelect.innerHTML = '<option value="" disabled selected>Không có bác sĩ phù hợp chuyên khoa/chi nhánh</option>';
        // Clear slots
        const slotsSelect = document.getElementById('booking-slot');
        if (slotsSelect) {
            slotsSelect.innerHTML = '<option value="" disabled selected>Chọn ca khám</option>';
        }
        return;
    }

    let html = '';
    filteredDoctors.forEach((doc, idx) => {
        const selectedAttr = idx === 0 ? 'selected' : '';
        const specText = doc.specialization ? ` (${doc.specialization})` : '';
        html += `<option value="${doc.userId}" ${selectedAttr}>${doc.fullName}${specText}</option>`;
    });
    doctorSelect.innerHTML = html;

    // Sync branch with the auto-selected doctor
    syncBranchWithSelectedDoctor();

    // Load available slots dynamically for the first selected doctor
    loadAvailableSlots();
}

// Triggered when branch select changes value
function onBookingBranchChange() {
    filterDoctorsBySelectedBranch();
}

// Triggered when specialty select changes value
function onBookingSpecialtyChange() {
    filterDoctorsBySelectedBranch();
}

// Sync branch select to match the selected doctor's hospital branch
function syncBranchWithSelectedDoctor() {
    const doctorSelect = document.getElementById('booking-doctor');
    const branchSelect = document.getElementById('booking-branch');
    if (!doctorSelect || !branchSelect) return;
    
    // Do not sync branch for Telehealth, package bookings, or localized (outside HCMC) selections
    if (branchSelect.value === 'Tư vấn Trực tuyến (Telehealth)') return;
    
    const symptomsField = document.getElementById('booking-symptoms');
    const isPackageBooking = symptomsField && symptomsField.value.includes('[Gói khám:');
    if (isPackageBooking) return;
    

    
    const selectedDocId = parseInt(doctorSelect.value);
    if (isNaN(selectedDocId)) return;
    
    const doc = (window.allDoctors || []).find(d => d.userId === selectedDocId);
    if (doc && doc.hospitalBranch) {
        // Update value directly without dispatching to avoid loops
        branchSelect.value = doc.hospitalBranch;
    }
}

// Handle footer telephone call request
function handleFooterCallback(e) {
    e.preventDefault();
    const phoneInput = document.getElementById('footer-callback-phone');
    if (!phoneInput) return;
    const phone = phoneInput.value.trim();
    if (!phone) return;
    
    showToast(`Đã ghi nhận số điện thoại ${phone}. Chuyên viên y tế CareConnect sẽ liên hệ lại hỗ trợ bạn sớm nhất!`, 'success');
    phoneInput.value = '';
}

// Toggle Visibility of Relative Booking Fields
function toggleBookingTarget(target) {
    const relativeFields = document.getElementById('booking-relative-fields');
    const personalContainer = document.getElementById('booking-personal-info-container');
    if (!relativeFields) return;
    
    const fields = [
        document.getElementById('relative-fullname'),
        document.getElementById('relative-phone'),
        document.getElementById('relative-relationship'),
        document.getElementById('relative-gender'),
        document.getElementById('relative-dob')
    ];
    
    const personalFields = [
        document.getElementById('booking-phone'),
        document.getElementById('booking-dob'),
        document.getElementById('booking-gender'),
        document.getElementById('booking-nationalid'),
        document.getElementById('booking-address')
    ];
    
    if (target === 'relative') {
        relativeFields.style.display = 'block';
        if (personalContainer) personalContainer.style.display = 'none';
        fields.forEach(field => {
            if (field) field.setAttribute('required', 'true');
        });
        personalFields.forEach(field => {
            if (field) field.removeAttribute('required');
        });
    } else {
        relativeFields.style.display = 'none';
        if (personalContainer) personalContainer.style.display = 'block';
        fields.forEach(field => {
            if (field) {
                field.removeAttribute('required');
                field.value = '';
            }
        });
        personalFields.forEach(field => {
            if (field) field.setAttribute('required', 'true');
        });
    }
}

// Prefill and Redirect for Package Bookings (YouMed reference)
function bookCheckupPackage(packageName, specialty, branch) {
    window.pendingBookingFromLanding = {
        symptoms: `[Gói khám: ${packageName}]`,
        specialty: specialty,
        branch: branch
    };
    
    if (token) {
        if (userRole === 'Patient') {
            openBookingModal();
            setTimeout(() => {
                const syField = document.getElementById('booking-symptoms');
                if (syField) syField.value = window.pendingBookingFromLanding.symptoms;
                
                // Prefill branch
                const branchSelect = document.getElementById('booking-branch');
                if (branchSelect) {
                    const opts = Array.from(branchSelect.options);
                    const textMatch = opts.find(o => o.text.toLowerCase().includes(branch.toLowerCase()));
                    if (textMatch) {
                        branchSelect.value = textMatch.value;
                    } else if (branchSelect.options.length > 1) {
                        // Fallback to option index 1 (closest local clinic)
                        branchSelect.selectedIndex = 1;
                    }
                    filterDoctorsBySelectedBranch();
                }
                
                // Prefill specialty/doctor filtering after branch change triggers filter
                const doctorSelect = document.getElementById('booking-doctor');
                if (doctorSelect) {
                    const opts = Array.from(doctorSelect.options);
                    const match = opts.find(o => o.text.toLowerCase().includes(specialty.toLowerCase()));
                    if (match) {
                        doctorSelect.value = match.value;
                        doctorSelect.dispatchEvent(new Event('change'));
                    } else {
                        const generalOption = opts.find(opt => opt.text.toLowerCase().includes('nội khoa') || opt.text.toLowerCase().includes('general'));
                        if (generalOption) {
                            doctorSelect.value = generalOption.value;
                            doctorSelect.dispatchEvent(new Event('change'));
                        }
                    }
                }
                showToast(`Đã chọn: ${packageName}. Vui lòng kiểm tra thông tin và đặt lịch!`, 'success');
                window.pendingBookingFromLanding = null; // Clear
            }, 400);
        } else {
            goToDashboard();
            showToast(`Tài khoản Bác sĩ/Quản trị viên không thể đặt lịch gói khám. Chuyển đến trang quản lý của bạn.`, 'info');
        }
    } else {
        showAuthScreen(false);
        showToast(`Vui lòng đăng nhập tài khoản Bệnh nhân để đặt lịch gói khám: ${packageName}`, 'info');
    }
}

// Local helper functions for manually hiding/deleting patient appointments
function getHiddenAppointmentsLocally() {
    try {
        const raw = localStorage.getItem('careconnect_hidden_appointments');
        const list = raw ? JSON.parse(raw) : [];
        return list.map(Number); // Normalize to Number to avoid type mismatch
    } catch (e) {
        return [];
    }
}

function isAppointmentHiddenLocally(appId) {
    const list = getHiddenAppointmentsLocally();
    return list.includes(Number(appId));
}

function getRestoredAppointmentsLocally() {
    try {
        const raw = localStorage.getItem('careconnect_restored_appointments');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function isAppointmentRestoredLocally(appId) {
    const list = getRestoredAppointmentsLocally();
    return list.includes(Number(appId));
}

function hideAppointmentLocally(appId) {
    const id = Number(appId);
    const hiddenList = getHiddenAppointmentsLocally();
    if (!hiddenList.includes(id)) {
        hiddenList.push(id);
        localStorage.setItem('careconnect_hidden_appointments', JSON.stringify(hiddenList));
    }
    
    let restoredList = getRestoredAppointmentsLocally();
    restoredList = restoredList.filter(x => x !== id);
    localStorage.setItem('careconnect_restored_appointments', JSON.stringify(restoredList));
    
    showToast('Đã xóa cuộc hẹn khỏi danh sách của bạn', 'success');
    filterAppointments(); // Refresh UI
}

// Unhide or restore appointment
function unhideAppointmentLocally(appId) {
    const id = Number(appId);
    let hiddenList = getHiddenAppointmentsLocally();
    hiddenList = hiddenList.filter(x => x !== id);
    localStorage.setItem('careconnect_hidden_appointments', JSON.stringify(hiddenList));
    
    const restoredList = getRestoredAppointmentsLocally();
    if (!restoredList.includes(id)) {
        restoredList.push(id);
        localStorage.setItem('careconnect_restored_appointments', JSON.stringify(restoredList));
    }
    
    showToast('Đã khôi phục cuộc hẹn vào danh sách', 'success');
    filterAppointments(); // Refresh UI
}

function clearHiddenAppointments() {
    localStorage.removeItem('careconnect_hidden_appointments');
    localStorage.removeItem('careconnect_restored_appointments');
    showToast('Đã khôi phục toàn bộ lịch hẹn đã ẩn', 'success');
    filterAppointments(); // Refresh UI
}

// Auto-hide settings load & save
function loadAutoHideSettings() {
    const enabled = localStorage.getItem('careconnect_auto_hide_enabled') !== 'false'; // default true
    const rawThreshold = localStorage.getItem('careconnect_auto_hide_threshold');
    const threshold = rawThreshold ? parseInt(rawThreshold) : 7; // default 7
    
    const chkEnabled = document.getElementById('auto-hide-old-apps');
    const selThreshold = document.getElementById('auto-hide-threshold');
    
    if (chkEnabled) chkEnabled.checked = enabled;
    if (selThreshold) selThreshold.value = threshold.toString();
}

function onAutoHideSettingsChange() {
    const chkEnabled = document.getElementById('auto-hide-old-apps');
    const selThreshold = document.getElementById('auto-hide-threshold');
    
    if (chkEnabled) {
        localStorage.setItem('careconnect_auto_hide_enabled', chkEnabled.checked ? 'true' : 'false');
    }
    if (selThreshold) {
        localStorage.setItem('careconnect_auto_hide_threshold', selThreshold.value);
    }
    filterAppointments(); // Trigger filtering with new settings
}


// =====================================================
// MEDPRO-INSPIRED FEATURES - NEW JS FUNCTIONS
// =====================================================

// --- Stats Counter with Intersection Observer ---
function initStatsCounter() {
    const section = document.getElementById('landing-stats');
    if (!section) return;
    let counted = false;
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !counted) {
                counted = true;
                animateAllCounters();
            }
        });
    }, { threshold: 0.3 });
    observer.observe(section);
}

function animateAllCounters() {
    document.querySelectorAll('.stat-number').forEach(counter => {
        const target = parseInt(counter.getAttribute('data-target'));
        const isDecimal = counter.classList.contains('stat-decimal');
        const duration = 1800;
        const step = duration / 60;
        let current = 0;
        const increment = target / (duration / step);
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) { current = target; clearInterval(timer); }
            counter.textContent = isDecimal ? (current / 10).toFixed(1) : Math.floor(current).toLocaleString('vi-VN');
        }, step);
    });
}

// --- Featured Doctors from API ---
async function loadFeaturedDoctors() {
    const grid = document.getElementById('featured-doctors-grid');
    if (!grid) return;
    try {
        const response = await fetch(`${API_BASE}/auth/doctors`);
        if (!response.ok) throw new Error('no');
        const doctors = await response.json();
        if (!doctors || doctors.length === 0) { grid.innerHTML = renderFallbackDoctors(); return; }
        const featured = doctors.slice(0, 4);
        const colors = ['linear-gradient(135deg,#0669ef,#084ab2)','linear-gradient(135deg,#16a34a,#15803d)','linear-gradient(135deg,#db2777,#be185d)','linear-gradient(135deg,#7c3aed,#6d28d9)'];
        grid.innerHTML = featured.map((doc, idx) => {
            const name = doc.fullName || doc.name || 'Bác sĩ';
            const initials = name.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0,2);
            const spec = doc.specialization || doc.specialty || 'Đa khoa';
            const branch = doc.hospitalBranch || doc.branch || 'CareConnect';
            return `<div class="doctor-feat-card"><div class="doctor-avatar-circle" style="background:${colors[idx%colors.length]};">${initials}</div><div class="doctor-feat-name">${name}</div><div class="doctor-feat-spec"><i class="fa-solid fa-stethoscope"></i> ${spec}</div><div class="doctor-feat-branch"><i class="fa-solid fa-location-dot"></i> ${branch}</div><div class="doctor-feat-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><button class="doctor-feat-btn" onclick="bookByDoctor('${name}','${spec}','${branch}')"><i class="fa-solid fa-calendar-plus"></i> Đặt lịch ngay</button></div>`;
        }).join('');
    } catch(e) { grid.innerHTML = renderFallbackDoctors(); }
}

function renderFallbackDoctors() {
    const demos = [
        {name:'Dr. John Doe',spec:'Nội khoa tổng quát',branch:'CareConnect Quận 1',i:'JD',c:'linear-gradient(135deg,#0669ef,#084ab2)'},
        {name:'Dr. Sarah Connor',spec:'Nhi khoa',branch:'CareConnect Quận 3',i:'SC',c:'linear-gradient(135deg,#db2777,#be185d)'},
        {name:'Dr. Bruce Wayne',spec:'Tim mạch',branch:'CareConnect Thủ Đức',i:'BW',c:'linear-gradient(135deg,#16a34a,#15803d)'},
        {name:'Dr. Mary Jane',spec:'Sản phụ khoa',branch:'CareConnect Quận 1',i:'MJ',c:'linear-gradient(135deg,#7c3aed,#6d28d9)'},
    ];
    return demos.map(d=>`<div class="doctor-feat-card"><div class="doctor-avatar-circle" style="background:${d.c};">${d.i}</div><div class="doctor-feat-name">${d.name}</div><div class="doctor-feat-spec"><i class="fa-solid fa-stethoscope"></i> ${d.spec}</div><div class="doctor-feat-branch"><i class="fa-solid fa-location-dot"></i> ${d.branch}</div><div class="doctor-feat-stars">&#9733;&#9733;&#9733;&#9733;&#9733;</div><button class="doctor-feat-btn" onclick="bookByDoctor('${d.name}','${d.spec}','${d.branch}')"><i class="fa-solid fa-calendar-plus"></i> Đặt lịch ngay</button></div>`).join('');
}

// --- Specialty Quick-Select ---
function bookBySpecialty(specialty) {
    if (!token) {
        window.pendingBookingFromLanding = { symptoms: '', specialty: specialty, branch: null };
        showAuthScreen(false);
        showToast('Đăng nhập để đặt lịch chuyên khoa ' + specialty, 'info');
        return;
    }
    
    if (userRole === 'Patient') {
        openBookingModal();
        setTimeout(() => {
            suggestedSpecialization = specialty;
            if(typeof applySuggestedSpec === 'function') applySuggestedSpec();
        }, 300);
    } else {
        goToDashboard();
        showToast(`Tài khoản Bác sĩ/Quản trị viên không thể đặt lịch khám chuyên khoa.`, 'info');
    }
}

// --- Doctor Card Click ---
function bookByDoctor(doctorName, specialty, branch) {
    if (!token) {
        window.pendingBookingFromLanding = { symptoms: '', specialty: specialty, branch: branch };
        showAuthScreen(false);
        showToast('Đăng nhập để đặt lịch với ' + doctorName, 'info');
        return;
    }
    
    if (userRole === 'Patient') {
        openBookingModal();
        setTimeout(() => {
            // Prefill branch if matches
            const branchSelect = document.getElementById('booking-branch');
            if (branchSelect && branch) {
                const opts = Array.from(branchSelect.options);
                const textMatch = opts.find(o => o.text.toLowerCase().includes(branch.toLowerCase()));
                if (textMatch) {
                    branchSelect.value = textMatch.value;
                } else if (branchSelect.options.length > 1) {
                    branchSelect.selectedIndex = 1;
                }
                filterDoctorsBySelectedBranch();
            }
            
            // Prefill doctor
            const sel = document.getElementById('booking-doctor');
            if (sel) {
                const docNameLower = doctorName.toLowerCase();
                const match = Array.from(sel.options).find(o => {
                    const optTextLower = o.text.toLowerCase();
                    return optTextLower.includes(docNameLower) || 
                           docNameLower.includes(optTextLower) || 
                           optTextLower.includes(docNameLower.split(' ').pop());
                });
                if (match) { 
                    sel.value = match.value; 
                    sel.dispatchEvent(new Event('change')); 
                }
            }
            suggestedSpecialization = specialty;
            if(typeof applySuggestedSpec === 'function') applySuggestedSpec();
        }, 300);
    } else {
        goToDashboard();
        showToast(`Tài khoản Bác sĩ/Quản trị viên không thể đặt lịch với Bác sĩ.`, 'info');
    }
}

// --- FAQ Accordion Toggle ---
function toggleFaq(item) {
    const isOpen = item.classList.contains('faq-open');
    document.querySelectorAll('.faq-item').forEach(el => el.classList.remove('faq-open'));
    if (!isOpen) item.classList.add('faq-open');
}

// --- Footer callback form ---
function handleFooterCallback(e) {
    if (e) e.preventDefault();
    const phone = document.getElementById('footer-callback-phone');
    if (phone && phone.value) {
        showToast('Cam on! Chung toi se lien he so ' + phone.value + ' trong 30 phut.', 'success');
        phone.value = '';
    }
}

// =====================================================
// SPECIALTY WIZARD BOOKING LOGIC
// =====================================================
let selectedSpecialtyForModal = '';
window.selectedSpecialtyBooking = null;

async function bookBySpecialty(specialty) {
    selectedSpecialtyForModal = specialty;
    window.selectedSpecialtyBooking = null;

    // Reset UI
    const confirmArea = document.getElementById('spec-booking-confirm-area');
    if (confirmArea) confirmArea.style.display = 'none';
    
    const submitBtn = document.getElementById('btn-submit-spec-booking');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Xác Nhận Đặt Lịch';
    }

    const symptomsInput = document.getElementById('spec-booking-symptoms');
    if (symptomsInput) symptomsInput.value = '';

    // Set title
    const titleEl = document.getElementById('spec-modal-name');
    if (titleEl) titleEl.innerText = specialty;

    // Set default date to tomorrow
    const dateInput = document.getElementById('spec-filter-date');
    if (dateInput) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        dateInput.min = new Date().toISOString().split('T')[0];
    }

    // Set default branch to empty (All branches)
    const branchSelect = document.getElementById('spec-filter-branch');
    if (branchSelect) branchSelect.value = '';

    // Display modal
    const modal = document.getElementById('specialty-booking-modal');
    if (modal) modal.style.display = 'flex';

    // Load data
    await loadSpecialtyBookingData();
}

function closeSpecialtyBookingModal() {
    const modal = document.getElementById('specialty-booking-modal');
    if (modal) modal.style.display = 'none';
}

async function onSpecialtyBookingFilterChange() {
    const confirmArea = document.getElementById('spec-booking-confirm-area');
    if (confirmArea) confirmArea.style.display = 'none';
    
    const submitBtn = document.getElementById('btn-submit-spec-booking');
    if (submitBtn) submitBtn.disabled = true;
    
    window.selectedSpecialtyBooking = null;
    await loadSpecialtyBookingData();
}

// Find nearest available date and slots for a doctor (within 7 days)
async function findNearestSlotsForDoctor(doctorId, startDateStr) {
    let currentDate = new Date(startDateStr);
    for (let i = 0; i < 7; i++) {
        const dateStr = currentDate.toISOString().split('T')[0];
        try {
            const response = await fetch(`${API_BASE}/schedule/doctor/${doctorId}/date/${dateStr}`);
            if (response.ok) {
                const slots = await response.json();
                if (slots && slots.length > 0) {
                    return { date: dateStr, slots: slots };
                }
            }
        } catch (e) {
            console.error("Error finding slots:", e);
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return null;
}

async function loadSpecialtyBookingData() {
    const docListContainer = document.getElementById('spec-booking-doctor-list');
    if (!docListContainer) return;

    docListContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-muted);"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải dữ liệu lịch khám...</div>';

    // Ensure allDoctors is loaded
    if (!window.allDoctors || window.allDoctors.length === 0) {
        try {
            const res = await fetch(`${API_BASE}/auth/doctors`);
            if (res.ok) {
                window.allDoctors = await res.json();
            } else {
                docListContainer.innerHTML = '<div class="spec-no-doctors"><i class="fa-solid fa-triangle-exclamation"></i> Không thể tải danh sách bác sĩ.</div>';
                return;
            }
        } catch (e) {
            docListContainer.innerHTML = '<div class="spec-no-doctors"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi kết nối đến hệ thống.</div>';
            return;
        }
    }

    const selectedDate = document.getElementById('spec-filter-date').value;
    const selectedBranch = document.getElementById('spec-filter-branch').value;

    if (!selectedDate) {
        docListContainer.innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-muted);">Vui lòng chọn ngày khám.</div>';
        return;
    }

    // Filter doctors by specialty
    let matchedDoctors = (window.allDoctors || []).filter(doc => {
        const spec = doc.specialization || "";
        return spec.toLowerCase() === selectedSpecialtyForModal.toLowerCase() ||
               spec.toLowerCase().includes(selectedSpecialtyForModal.toLowerCase());
    });

    // Filter by branch
    if (selectedBranch) {
        matchedDoctors = matchedDoctors.filter(doc => doc.hospitalBranch === selectedBranch);
    }

    if (matchedDoctors.length === 0) {
        docListContainer.innerHTML = `
            <div class="spec-no-doctors">
                <i class="fa-solid fa-user-doctor"></i>
                <div style="font-size: 15px; font-weight: 700; margin-top: 10px;">Không tìm thấy bác sĩ phù hợp</div>
                <div style="font-size: 13px; margin-top: 4px;">Hiện tại chưa có bác sĩ trực thuộc chuyên khoa này tại chi nhánh đã chọn.</div>
            </div>`;
        return;
    }

    // Load available slots for each doctor
    let html = '';
    
    // We will query in parallel for all matched doctors
    const promises = matchedDoctors.map(async (doc) => {
        let isSuggestedDate = false;
        let queryDate = selectedDate;
        let slots = [];
        
        try {
            const res = await fetch(`${API_BASE}/schedule/doctor/${doc.userId}/date/${selectedDate}`);
            if (res.ok) {
                slots = await res.json();
            }
            
            // If no slots on selected day, look for the nearest day in the next 7 days (intelligent recommendation)
            if (slots.length === 0) {
                const nearest = await findNearestSlotsForDoctor(doc.userId, selectedDate);
                if (nearest) {
                    queryDate = nearest.date;
                    slots = nearest.slots;
                    isSuggestedDate = true;
                }
            }
        } catch (e) {
            console.error("Error fetching slots for doctor " + doc.userId, e);
        }
        
        return { doctor: doc, slots: slots, displayDate: queryDate, isSuggested: isSuggestedDate };
    });

    const results = await Promise.all(promises);

    results.forEach(({ doctor, slots, displayDate, isSuggested }) => {
        const initials = doctor.fullName.split(' ').slice(-2).map(w => w[0]).join('').toUpperCase().slice(0, 2);
        
        // Random avatar color based on doctor name
        const colors = [
            'linear-gradient(135deg, #0669ef, #084ab2)',
            'linear-gradient(135deg, #16a34a, #15803d)',
            'linear-gradient(135deg, #db2777, #be185d)'
        ];
        const colorIdx = doctor.userId % colors.length;
        const bgStyle = colors[colorIdx];

        // Format display date
        const parts = displayDate.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

        let slotsHtml = '';
        if (slots.length === 0) {
            slotsHtml = '<div style="font-size:12px; color:var(--text-muted); font-style:italic;"><i class="fa-solid fa-calendar-xmark"></i> Không có lịch trực trống trong 7 ngày tới</div>';
        } else {
            slotsHtml = `
                <div class="spec-slots-grid">
                    ${slots.map(slot => {
                        const btnId = `spec-slot-btn-${doctor.userId}-${displayDate}-${slot.replace(/\s+/g, '')}`;
                        return `
                            <button class="spec-slot-btn" id="${btnId}" onclick="selectSpecialtySlot(${doctor.userId}, '${displayDate}', '${slot}', '${doctor.fullName}', '${doctor.hospitalBranch}', '${btnId}')">
                                <i class="fa-solid fa-clock"></i> ${slot}
                            </button>`;
                    }).join('')}
                </div>`;
        }

        const dateAlertHtml = isSuggested 
            ? `<div class="spec-slots-alert"><i class="fa-solid fa-wand-magic-sparkles"></i> Gợi ý ngày trống gần nhất: <strong>${formattedDate}</strong></div>`
            : `<div style="font-size:12px; font-weight:700; color:var(--dark); margin-bottom:8px;"><i class="fa-solid fa-calendar-day" style="color:var(--primary);"></i> Lịch ngày ${formattedDate}:</div>`;

        // Ratings: e.g. 5 stars
        const ratingVal = (4.7 + (doctor.userId % 4) * 0.1).toFixed(1);

        html += `
            <div class="spec-doc-card">
                <div class="spec-doc-left">
                    <div class="spec-doc-avatar-wrapper">
                        <div class="spec-doc-avatar" style="background: ${bgStyle}">${initials}</div>
                        <span class="spec-doc-badge">Online</span>
                    </div>
                    <div style="font-weight: 700; font-size: 13px; color: var(--dark);">${doctor.fullName}</div>
                    <div class="spec-doc-rating">&#9733; ${ratingVal} (${12 + doctor.userId * 3} đánh giá)</div>
                </div>
                <div class="spec-doc-right">
                    <h3 class="spec-doc-name">${doctor.fullName}</h3>
                    <div class="spec-doc-meta">
                        <div class="spec-doc-meta-item">
                            <i class="fa-solid fa-stethoscope"></i>
                            <span>Chuyên khoa: ${doctor.specialization || 'Đa khoa'}</span>
                        </div>
                        <div class="spec-doc-meta-item">
                            <i class="fa-solid fa-location-dot"></i>
                            <span>Chi nhánh: ${doctor.hospitalBranch || 'Trung tâm'}</span>
                        </div>
                        <div class="spec-doc-meta-item">
                            <i class="fa-solid fa-phone"></i>
                            <span>Hotline: ${doctor.phoneNumber || '1900 1234'}</span>
                        </div>
                    </div>
                    <div class="spec-slots-section">
                        ${dateAlertHtml}
                        ${slotsHtml}
                    </div>
                </div>
            </div>`;
    });

    docListContainer.innerHTML = html;

    // Auto restore selection if pending
    if (window.pendingBookingFromSpecialtyModal) {
        const p = window.pendingBookingFromSpecialtyModal;
        // Verify if date and specialty match
        const dateInput = document.getElementById('spec-filter-date');
        if (dateInput && dateInput.value === p.date && selectedSpecialtyForModal === p.specialty) {
            // Find slot button and trigger click
            const btnId = `spec-slot-btn-${p.doctorId}-${p.date}-${p.slot.replace(/\s+/g, '')}`;
            setTimeout(() => {
                const btn = document.getElementById(btnId);
                if (btn) {
                    btn.click();
                    // Restore symptoms text
                    const symptomsInput = document.getElementById('spec-booking-symptoms');
                    if (symptomsInput && p.symptoms) {
                        symptomsInput.value = p.symptoms;
                    }
                }
            }, 500);
        }
        // Do not clear it here yet if we want it to be consumed by the user click event
    }
}

function selectSpecialtySlot(doctorId, date, slot, doctorName, branchName, btnId) {
    window.selectedSpecialtyBooking = { doctorId, date, slot, doctorName, branchName };

    // Toggle selected class on buttons
    document.querySelectorAll('.spec-slot-btn').forEach(btn => btn.classList.remove('selected'));
    const clickedBtn = document.getElementById(btnId);
    if (clickedBtn) clickedBtn.classList.add('selected');

    // Show and fill confirmation panel
    const confirmArea = document.getElementById('spec-booking-confirm-area');
    const confirmDetails = document.getElementById('spec-booking-confirm-details');

    if (confirmArea && confirmDetails) {
        const parts = date.split('-');
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
        
        confirmDetails.innerHTML = `
            <strong>Bác sĩ:</strong> ${doctorName}<br>
            <strong>Thời gian:</strong> Ca khám <span style="color:var(--primary); font-weight:700;">${slot}</span> ngày <span style="color:var(--primary); font-weight:700;">${formattedDate}</span><br>
            <strong>Chi nhánh:</strong> ${branchName}
        `;
        confirmArea.style.display = 'block';
    }

    // Enable submit button
    const submitBtn = document.getElementById('btn-submit-spec-booking');
    if (submitBtn) {
        submitBtn.disabled = false;
    }
}

async function submitSpecialtyBookingFromModal() {
    if (!window.selectedSpecialtyBooking) {
        showToast('Vui lòng chọn ca khám của bác sĩ.', 'warning');
        return;
    }

    const { doctorId, date, slot, doctorName, branchName } = window.selectedSpecialtyBooking;
    const symptoms = document.getElementById('spec-booking-symptoms').value.trim();

    if (!token) {
        // Unauthenticated -> save selections and show auth screen
        window.pendingBookingFromSpecialtyModal = {
            doctorId,
            date,
            slot,
            doctorName,
            branchName,
            specialty: selectedSpecialtyForModal,
            symptoms: symptoms
        };
        
        closeSpecialtyBookingModal();
        showAuthScreen(false); // patient login
        showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để đặt lịch khám.', 'info');
        return;
    }

    if (userRole !== 'Patient') {
        showToast('Chỉ tài khoản Bệnh nhân mới được đăng ký lịch khám bệnh.', 'error');
        return;
    }

    closeSpecialtyBookingModal();
    prefillBookingModal({
        doctorId,
        date,
        slot,
        doctorName,
        branchName,
        specialty: selectedSpecialtyForModal,
        symptoms: symptoms
    });
}

async function prefillBookingModal(bookingData) {
    const { doctorId, date, slot, specialty, symptoms, branchName } = bookingData;
    
    // Open the main booking modal
    openBookingModal();
    
    // Set specialty select
    const specialtySelect = document.getElementById('booking-specialty');
    if (specialtySelect) {
        const opts = Array.from(specialtySelect.options);
        const match = opts.find(o => o.value && (o.value.toLowerCase() === specialty.toLowerCase() 
            || specialty.toLowerCase().includes(o.value.toLowerCase())
            || o.value.toLowerCase().includes(specialty.toLowerCase())));
        if (match) {
            specialtySelect.value = match.value;
        } else {
            specialtySelect.value = specialty;
        }
    }
    
    // Set branch select
    const branchSelect = document.getElementById('booking-branch');
    if (branchSelect) {
        const opts = Array.from(branchSelect.options);
        const match = opts.find(o => o.value && (o.value.toLowerCase() === branchName.toLowerCase() 
            || branchName.toLowerCase().includes(o.value.toLowerCase())
            || o.value.toLowerCase().includes(branchName.toLowerCase())));
        if (match) {
            branchSelect.value = match.value;
        } else {
            // If dynamic branch option is not present, add it dynamically
            const newOpt = document.createElement('option');
            newOpt.value = branchName;
            newOpt.text = branchName;
            branchSelect.add(newOpt);
            branchSelect.value = branchName;
        }
    }
    
    // Filter doctors list synchronously based on specialty and branch
    filterDoctorsBySelectedBranch();
    
    // Set doctor select
    const doctorSelect = document.getElementById('booking-doctor');
    if (doctorSelect) {
        doctorSelect.value = doctorId;
    }
    
    // Set date input
    const dateInput = document.getElementById('booking-date');
    if (dateInput) {
        dateInput.value = date;
    }
    
    // Set symptoms
    const symptomsInput = document.getElementById('booking-symptoms');
    if (symptomsInput) {
        symptomsInput.value = symptoms ? `[Đặt lịch chuyên khoa ${specialty}]: ${symptoms}` : `[Đặt lịch chuyên khoa ${specialty}]`;
    }
    
    // Load available slots for the selected date & doctor
    await loadAvailableSlots();
    
    // Select the slot in the interactive grid
    const slotBtn = document.querySelector(`.booking-slot-btn[data-slot="${slot}"]`);
    if (slotBtn) {
        selectBookingSlot(slot, slotBtn);
    } else {
        // Fallback: set select directly
        const slotSelect = document.getElementById('booking-slot');
        if (slotSelect) {
            slotSelect.value = slot;
            slotSelect.dispatchEvent(new Event('change'));
        }
    }
    
    // Open profile collapse fields so patient sees phone, dob, gender, address
    const fieldsDiv = document.getElementById('booking-patient-info-fields');
    const arrow = document.getElementById('profile-collapse-arrow');
    if (fieldsDiv && arrow) {
        fieldsDiv.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    }
    
    // Smooth scroll to profile fields
    const personalInfoContainer = document.getElementById('booking-personal-info-container');
    if (personalInfoContainer) {
        setTimeout(() => {
            personalInfoContainer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 200);
    }
}

// Support functions for new Booking Slots Grid & Admin Profile Collapse
function togglePersonalProfileCollapse() {
    const fieldsDiv = document.getElementById('booking-patient-info-fields');
    const arrow = document.getElementById('profile-collapse-arrow');
    if (!fieldsDiv || !arrow) return;
    if (fieldsDiv.style.display === 'none' || fieldsDiv.style.display === '') {
        fieldsDiv.style.display = 'block';
        arrow.style.transform = 'rotate(180deg)';
    } else {
        fieldsDiv.style.display = 'none';
        arrow.style.transform = 'rotate(0deg)';
    }
}

function selectBookingSlot(slotValue, btnElement) {
    const slotSelect = document.getElementById('booking-slot');
    if (slotSelect) {
        slotSelect.value = slotValue;
        slotSelect.dispatchEvent(new Event('change'));
    }
    
    // Reset selected styling for all slot buttons
    document.querySelectorAll('.booking-slot-btn').forEach(btn => {
        btn.classList.remove('selected');
        const icon = btn.querySelector('i');
        if (icon && !btn.classList.contains('disabled')) {
            icon.className = 'fa-solid fa-clock';
        }
    });

    // Add selected styling to clicked button
    if (btnElement) {
        btnElement.classList.add('selected');
        const icon = btnElement.querySelector('i');
        if (icon) {
            icon.className = 'fa-solid fa-circle-check';
        }
    }
}

// Interactive How It Works Steps Workflow
function interactHowItWorks(stepNumber) {
    if (stepNumber === 1) {
        // Step 1: Chọn dịch vụ
        if (token && userRole === 'Patient') {
            openBookingModal();
            setTimeout(() => {
                const specSelect = document.getElementById('booking-specialty');
                if (specSelect) specSelect.focus();
            }, 300);
            showToast('Hãy chọn Chuyên khoa khám phù hợp!', 'info');
        } else {
            scrollToSection('landing-specialties');
            showToast('Cuộn đến khu vực Chuyên khoa - Vui lòng chọn một chuyên khoa phù hợp!', 'info');
        }
    } else if (stepNumber === 2) {
        // Step 2: Chọn bác sĩ & ca khám
        if (token && userRole === 'Patient') {
            openBookingModal();
            setTimeout(() => {
                const docSelect = document.getElementById('booking-doctor');
                if (docSelect) docSelect.focus();
            }, 300);
            showToast('Hãy chọn Bác sĩ và Ngày khám phù hợp!', 'info');
        } else {
            scrollToSection('landing-specialties');
            showToast('Vui lòng chọn một chuyên khoa để lọc danh sách bác sĩ và ca khám!', 'info');
        }
    } else if (stepNumber === 3) {
        // Step 3: Xác nhận thông tin
        if (token && userRole === 'Patient') {
            openBookingModal();
            setTimeout(() => {
                const symptomsInput = document.getElementById('booking-symptoms');
                if (symptomsInput) symptomsInput.focus();
            }, 300);
            showToast('Hãy điền triệu chứng và thông tin hành chính để xác nhận đặt lịch khám!', 'info');
        } else {
            showAuthScreen(false); // patient login
            showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để điền thông tin và đặt lịch khám.', 'info');
        }
    } else if (stepNumber === 4) {
        // Step 4: Đến khám bệnh
        if (token && userRole === 'Patient') {
            goToDashboard();
            setTimeout(() => {
                switchTab('appointments');
                loadAppointments();
            }, 300);
            showToast('Chuyển hướng đến danh sách lịch khám đã đặt của bạn!', 'info');
        } else {
            showAuthScreen(false); // patient login
            showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để quản lý danh sách lịch khám bệnh.', 'info');
        }
    }
}

// Health Checkup Packages Detailed Data & Modal Controllers
const PACKAGE_DETAILS_DATA = {
    'standard': {
        title: 'Gói Khám Tổng Quát Standard',
        badge: 'Basic',
        badgeClass: 'package-badge popular',
        icon: 'fa-user-doctor',
        iconColor: '#0669ef',
        iconBg: 'linear-gradient(135deg, #e3f0ff, #c7e0ff)',
        desc: 'Gói khám tiêu chuẩn thiết kế đầy đủ các hạng mục thăm khám cơ bản, xét nghiệm thường quy và chẩn đoán hình ảnh giúp tầm soát sức khỏe định kỳ cho cá nhân.',
        specialty: 'Nội khoa tổng quát',
        branch: 'CareConnect Quận 1',
        address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
        lat: 10.7725,
        lng: 106.6980,
        hotline: '1900 1234',
        services: [
            { cat: 'Lâm sàng', name: 'Khám Nội tổng quát (Đo chiều cao, cân nặng, BMI, huyết áp, mạch đập)' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm công thức máu toàn phần (Tầm soát thiếu máu, nhiễm trùng)' },
            { cat: 'Xét nghiệm', name: 'Đường huyết đói (Kiểm tra nguy cơ tiểu đường)' },
            { cat: 'Xét nghiệm', name: 'Chức năng gan (AST, ALT - Đánh giá men gan, tổn thương gan)' },
            { cat: 'Xét nghiệm', name: 'Chức năng thận (Ure, Creatinin - Tầm soát suy thận, viêm cầu thận)' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Đo điện tâm đồ ECG (Phát hiện rối loạn nhịp tim, thiếu máu cơ tim)' }
        ]
    },
    'cardio': {
        title: 'Gói Tầm Soát Tim Mạch Chuyên Sâu',
        badge: 'Khuyên dùng',
        badgeClass: 'package-badge success',
        icon: 'fa-heart-pulse',
        iconColor: '#16a34a',
        iconBg: 'linear-gradient(135deg, #e3fff0, #c7ffd4)',
        desc: 'Chương trình tầm soát tim mạch chuyên sâu, thực hiện các kỹ thuật thăm khám tim mạch tiên tiến nhằm tầm soát sớm nguy cơ xơ vữa mạch máu, tai biến mạch máu não và nhồi máu cơ tim.',
        specialty: 'Tim mạch',
        branch: 'CareConnect Thủ Đức',
        address: '789 Đường Võ Văn Ngân, TP. Thủ Đức, TP. Hồ Chí Minh',
        lat: 10.8494,
        lng: 106.7723,
        hotline: '1900 9012',
        services: [
            { cat: 'Hạng mục cơ bản', name: 'Tất cả các dịch vụ khám & xét nghiệm của gói Standard' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Siêu âm tim Doppler chuyên sâu (Đánh giá cấu trúc tim, van tim)' },
            { cat: 'Thử nghiệm chức năng', name: 'Đo Holter huyết áp / điện tim 24 giờ (Theo dõi biến động huyết áp trong ngày)' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm mỡ máu toàn phần (Cholesterol toàn phần, LDL, HDL, Triglycerides)' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Đo vận tốc sóng mạch PWV (Tầm soát mức độ xơ vữa, xơ cứng mạch máu)' },
            { cat: 'Lâm sàng', name: 'Khám chuyên khoa Tim mạch và tư vấn chế độ dinh dưỡng, vận động học' }
        ]
    },
    'pediatric': {
        title: 'Gói Khám Nhi Khoa Standard',
        badge: 'Cho bé',
        badgeClass: 'package-badge info',
        icon: 'fa-child',
        iconColor: '#0ea5e9',
        iconBg: 'linear-gradient(135deg, #e0f2fe, #bae6fd)',
        desc: 'Chăm sóc sức khỏe tối ưu cho bé yêu với các dịch vụ khám tổng quát nhi khoa toàn diện, siêu âm ổ bụng sàng lọc dị tật và tư vấn chuyên sâu về dinh dưỡng, tiêm chủng định kỳ.',
        specialty: 'Nhi khoa',
        branch: 'CareConnect Quận 3',
        address: '456 Đường Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
        lat: 10.7758,
        lng: 106.6830,
        hotline: '1900 5678',
        services: [
            { cat: 'Lâm sàng', name: 'Khám sức khỏe tổng quát cùng bác sĩ Nhi khoa giàu kinh nghiệm' },
            { cat: 'Lâm sàng', name: 'Đánh giá chỉ số phát triển thể chất của trẻ (Chiều cao, cân nặng, vòng đầu)' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Siêu âm bụng tổng quát (Tầm soát bất thường cơ quan nội tạng ổ bụng)' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm vi chất dinh dưỡng (Sắt, Canxi, Vitamin D - Ngăn ngừa suy dinh dưỡng)' },
            { cat: 'Tư vấn chuyên sâu', name: 'Tư vấn tiêm chủng tiêu chuẩn và xây dựng phác đồ tiêm chủng phù hợp lứa tuổi' }
        ]
    },
    'cancer': {
        title: 'Gói Tầm Soát Ung Thư Cảnh Báo Sớm',
        badge: 'Cảnh báo sớm',
        badgeClass: 'package-badge warning',
        icon: 'fa-shield-virus',
        iconColor: '#f59e0b',
        iconBg: 'linear-gradient(135deg, #fffbeb, #fef3c7)',
        desc: 'Tầm soát ung thư sớm chủ động là chìa khóa vàng bảo vệ cuộc sống. Gói khám tích hợp các xét nghiệm chỉ dấu ung thư tiên tiến giúp định hướng và phát hiện dấu hiệu bất thường từ giai đoạn đầu.',
        specialty: 'Ung bướu',
        branch: 'CareConnect Quận 1',
        address: '123 Đường Lê Lợi, Quận 1, TP. Hồ Chí Minh',
        lat: 10.7725,
        lng: 106.6980,
        hotline: '1900 1234',
        services: [
            { cat: 'Lâm sàng', name: 'Thăm khám lâm sàng cùng bác sĩ chuyên khoa ung bướu hàng đầu' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm chỉ dấu khối u CEA (Đại trực tràng, tiêu hóa)' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm chỉ dấu khối u AFP (Ung thư gan)' },
            { cat: 'Xét nghiệm', name: 'Xét nghiệm chỉ dấu khối u CA 19-9 (Tầm soát ung thư tụy, đường mật)' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Siêu âm tuyến giáp, siêu âm tuyến vú (dành riêng cho khách hàng Nữ)' },
            { cat: 'Chẩn đoán hình ảnh', name: 'Chụp X-Quang phổi thẳng kỹ thuật số (Phát hiện tổn thương phổi)' },
            { cat: 'Lâm sàng', name: 'Nội soi tai mũi họng bằng ống mềm & tư vấn bệnh lý hầu họng' }
        ]
    }
};

function viewPackageDetails(packageId) {
    const modal = document.getElementById('package-detail-modal');
    if (!modal) return;

    const data = PACKAGE_DETAILS_DATA[packageId];
    if (!data) return;

    document.getElementById('modal-package-title').innerText = data.title;
    
    const badgeEl = document.getElementById('modal-package-badge');
    badgeEl.innerText = data.badge;
    badgeEl.className = data.badgeClass;

    const iconWrap = document.getElementById('modal-package-icon-wrap');
    iconWrap.style.background = data.iconBg;
    iconWrap.innerHTML = `<i class="fa-solid ${data.icon}" style="color: ${data.iconColor};"></i>`;

    document.getElementById('modal-package-desc').innerText = data.desc;

    let branchName = data.branch;
    let branchAddress = data.address;
    let branchHotline = data.hotline;
    let branchLat = data.lat;
    let branchLng = data.lng;

    const branchSelect = document.getElementById('booking-branch');
    const firstOptText = branchSelect?.options[1]?.text || '';
    const isLocalized = firstOptText && !firstOptText.includes('CareConnect Quận 1');
    if (isLocalized && window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
        let localClinic = null;
        if (data.branch === 'CareConnect Quận 1') {
            localClinic = window.nearbyHospitals[0];
        } else if (data.branch === 'CareConnect Quận 3') {
            localClinic = window.nearbyHospitals[1];
        } else if (data.branch === 'CareConnect Thủ Đức') {
            localClinic = window.nearbyHospitals[2];
        }
        
        if (localClinic) {
            branchName = localClinic.name;
            branchAddress = localClinic.address;
            branchHotline = localClinic.phone;
            branchLat = localClinic.lat;
            branchLng = localClinic.lng;
        }
    }

    document.getElementById('modal-package-branch-name').innerText = `Đề xuất: ${branchName}`;
    document.getElementById('modal-package-branch-address').innerText = branchAddress;
    document.getElementById('modal-package-branch-hotline').innerText = `Hotline: ${branchHotline}`;

    let servicesHtml = '';
    data.services.forEach(s => {
        servicesHtml += `
            <div style="display:flex; align-items:flex-start; gap:8px; padding:6px 0; border-bottom:1px solid #f1f5f9;">
                <i class="fa-solid fa-circle-check" style="color:var(--success); margin-top:3px; font-size:14px;"></i>
                <div>
                    <span style="font-weight:700; font-size:11px; background:var(--primary-light); color:var(--primary); padding:2px 6px; border-radius:4px; margin-right:6px; display:inline-block; vertical-align:middle; text-transform:uppercase;">${s.cat}</span>
                    <span style="vertical-align:middle;">${s.name}</span>
                </div>
            </div>
        `;
    });
    document.getElementById('modal-package-services').innerHTML = servicesHtml;

    const bookBtn = document.getElementById('modal-btn-book-now');
    bookBtn.setAttribute('onclick', `closePackageDetailModal(); bookCheckupPackage('${data.title}', '${data.specialty}', '${data.branch}');`);

    modal.style.display = 'flex';

    // Initialize/update Leaflet routing map after modal is rendered visible
    setTimeout(() => {
        updatePackageRouteMap(branchName, branchAddress, branchLat, branchLng);
    }, 150);
}

function closePackageDetailModal() {
    const modal = document.getElementById('package-detail-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function openBookingModal() {
    if (!token) {
        showAuthScreen(false);
        showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để đặt lịch khám.', 'info');
        return;
    }
    if (userRole !== 'Patient' && userRole !== 'Receptionist' && userRole !== 'Admin') {
        showToast('Chức năng đặt lịch chỉ dành cho Bệnh nhân, Lễ tân hoặc Quản trị viên.', 'warning');
        return;
    }
    const modal = document.getElementById('booking-modal');
    if (modal) {
        const wrapper = document.getElementById('booking-section-wrapper');
        const modalBody = modal.querySelector('.modal-body');
        if (wrapper && modalBody) {
            modalBody.appendChild(wrapper);
            wrapper.style.display = 'block';
        }
        
        // Toggle Admin Patient ID field
        const adminPatientGroup = document.getElementById('booking-admin-patient-select-group');
        if (adminPatientGroup) {
            if (userRole === 'Admin' || userRole === 'Receptionist') {
                adminPatientGroup.style.display = 'block';
                document.getElementById('booking-admin-patient-id').required = true;
                
                // Administrative fields collapse config for admin booking
                const fieldsDiv = document.getElementById('booking-patient-info-fields');
                if (fieldsDiv) fieldsDiv.style.display = 'none';
            } else {
                adminPatientGroup.style.display = 'none';
                document.getElementById('booking-admin-patient-id').required = false;
            }
        }

        modal.style.display = 'flex';
        loadPatientProfileIntoBookingForm();
        updateBookingBranchOptions();
    }
}

// Sync booking branch dropdown option texts with window.nearbyHospitals and select nearest hospital by default
function updateBookingBranchOptions() {
    const branchSelect = document.getElementById('booking-branch');
    if (!branchSelect) return;

    if (window.nearbyHospitals && window.nearbyHospitals.length >= 3) {
        branchSelect.options[1].text = `${window.nearbyHospitals[0].name} (${window.nearbyHospitals[0].distance.toFixed(1)} km)`;
        branchSelect.options[2].text = `${window.nearbyHospitals[1].name} (${window.nearbyHospitals[1].distance.toFixed(1)} km)`;
        branchSelect.options[3].text = `${window.nearbyHospitals[2].name} (${window.nearbyHospitals[2].distance.toFixed(1)} km)`;

        // If no option has been selected yet (or currently set to the default placeholder), auto-select option 1 (the closest clinic)
        if (!branchSelect.value) {
            branchSelect.selectedIndex = 1;
            onBookingBranchChange();
        }
    } else {
        // Fallback static text if nearby clinics list is not available
        branchSelect.options[1].text = 'CareConnect Quận 1 (123 Lê Lợi, Q.1, TP.HCM)';
        branchSelect.options[2].text = 'CareConnect Quận 3 (456 Võ Văn Tần, Q.3, TP.HCM)';
        branchSelect.options[3].text = 'CareConnect Thủ Đức (789 Võ Văn Ngân, TP. Thủ Đức)';
    }
}

function openBookingModalWithMode(mode) {
    if (!token) {
        window.pendingBookingMode = mode;
        showAuthScreen(false);
        showToast('Vui lòng đăng nhập tài khoản Bệnh nhân để đặt lịch khám.', 'info');
        return;
    }
    if (userRole !== 'Patient') {
        showToast('Chức năng đặt lịch chỉ dành cho tài khoản Bệnh nhân.', 'warning');
        return;
    }
    openBookingModal();
    const symptomsInput = document.getElementById('booking-symptoms');
    const fieldsDiv = document.getElementById('booking-patient-info-fields');
    const arrow = document.getElementById('profile-collapse-arrow');

    if (mode === 'home') {
        if (symptomsInput) {
            symptomsInput.value = '[Yêu cầu khám tại nhà] ';
            symptomsInput.placeholder = 'Mô tả cụ thể biểu hiện bệnh của bạn và ghi rõ địa chỉ nhà chi tiết để bác sĩ đến khám...';
        }
        if (fieldsDiv && arrow) {
            fieldsDiv.style.display = 'block';
            arrow.style.transform = 'rotate(180deg)';
        }
    } else {
        if (symptomsInput) {
            if (symptomsInput.value.startsWith('[Yêu cầu khám tại nhà]')) {
                symptomsInput.value = '';
            }
            symptomsInput.placeholder = 'Mô tả cụ thể biểu hiện bệnh của bạn (ví dụ: sốt nhẹ, đau đầu, ho khạc đờm 2 ngày nay...)';
        }
    }
}

function closeBookingModal() {
    const modal = document.getElementById('booking-modal');
    if (modal) {
        modal.style.display = 'none';
        
        // Return form wrapper to dashboard tab so it doesn't get lost
        const wrapper = document.getElementById('booking-section-wrapper');
        const tabBooking = document.getElementById('tab-booking');
        if (wrapper && tabBooking) {
            const innerDiv = tabBooking.querySelector('div');
            if (innerDiv) {
                innerDiv.appendChild(wrapper);
            } else {
                tabBooking.appendChild(wrapper);
            }
            wrapper.style.display = 'none';
        }
    }
}

let branchMapInstance = null;

function viewBranchMap(branchName, branchLat, branchLng, branchAddress) {
    const modal = document.getElementById('branch-map-modal');
    if (!modal) return;

    modal.style.display = 'flex';

    const mapContainer = document.getElementById('branch-detail-map');
    const infoContainer = document.getElementById('modal-branch-map-info');
    const gmapsBtn = document.getElementById('modal-branch-gmaps-btn');

    if (!mapContainer) return;

    const destLat = branchLat || 10.7725;
    const destLng = branchLng || 106.6980;

    // Update external Google Maps button link
    if (gmapsBtn) {
        const encodedAddress = encodeURIComponent(branchAddress || branchName);
        gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }

    // Reset container HTML to recreate map properly and prevent Leaflet duplicate container error
    mapContainer.innerHTML = '';
    if (branchMapInstance) {
        try {
            branchMapInstance.off();
            branchMapInstance.remove();
        } catch (e) {
            console.error('Error removing map instance:', e);
        }
        branchMapInstance = null;
    }

    // Create a fresh map container child
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    mapDiv.style.borderRadius = '8px';
    mapContainer.appendChild(mapDiv);

    // Initialize Leaflet map centered at the branch
    const map = L.map(mapDiv, {
        zoomControl: false,
        attributionControl: false
    }).setView([destLat, destLng], 14);
    branchMapInstance = map;

    // Add Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use Voyager tile layer for standard web look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Add Branch Marker (Red/Green icon)
    const branchIcon = L.divIcon({
        className: 'custom-map-marker-branch',
        html: `<div style="background:#16a34a; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    L.marker([destLat, destLng], { icon: branchIcon }).addTo(map)
        .bindPopup(`<strong>${branchName}</strong><br><span style="font-size:11px;">${branchAddress || ''}</span>`)
        .openPopup();

    if (infoContainer) {
        infoContainer.innerHTML = `<span><i class="fa-solid fa-location-crosshairs fa-pulse" style="color:var(--primary);"></i> Đang tìm vị trí hiện tại của bạn...</span>`;
    }

    const processRoute = (userLat, userLng) => {
        const dist = Math.sqrt(Math.pow((destLat - userLat) * 111, 2) + Math.pow((destLng - userLng) * 111 * Math.cos(destLat * Math.PI / 180), 2));
        let isSim = false;
        if (dist > 100) {
            userLat = 10.76262;
            userLng = 106.68231;
            isSim = true;
        }
        drawBranchRouteAndSetupMap(map, userLat, userLng, destLat, destLng, branchName, isSim, 'modal-branch-map-info');
    };

    const tryGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    processRoute(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn('GPS permission denied or failed, using simulated location.', error);
                    const mockUserLat = 10.76262;
                    const mockUserLng = 106.68231;
                    drawBranchRouteAndSetupMap(map, mockUserLat, mockUserLng, destLat, destLng, branchName, true, 'modal-branch-map-info');
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            const mockUserLat = 10.76262;
            const mockUserLng = 106.68231;
            drawBranchRouteAndSetupMap(map, mockUserLat, mockUserLng, destLat, destLng, branchName, true, 'modal-branch-map-info');
        }
    };

    if (token && userRole === 'Patient') {
        getPatientProfileCoords().then(coords => {
            if (coords) {
                processRoute(coords.lat, coords.lng);
            } else {
                tryGPS();
            }
        }).catch(() => {
            tryGPS();
        });
    } else {
        tryGPS();
    }
}

function closeBranchMapModal() {
    const modal = document.getElementById('branch-map-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    if (branchMapInstance) {
        try {
            branchMapInstance.off();
            branchMapInstance.remove();
        } catch (e) {
            console.error('Error removing map instance:', e);
        }
        branchMapInstance = null;
    }
}

let packageDetailMapInstance = null;

function updatePackageRouteMap(branchName, branchAddress, branchLat, branchLng) {
    const mapContainer = document.getElementById('package-detail-map');
    const infoContainer = document.getElementById('modal-package-map-info');
    const gmapsBtn = document.getElementById('modal-package-gmaps-btn');

    if (!mapContainer) return;

    const destLat = branchLat || 10.7725;
    const destLng = branchLng || 106.6980;

    // Update external Google Maps button link
    if (gmapsBtn) {
        const encodedAddress = encodeURIComponent(branchAddress);
        gmapsBtn.href = `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`;
    }

    // Reset container HTML to recreate map properly and prevent Leaflet duplicate container error
    mapContainer.innerHTML = '';
    if (packageDetailMapInstance) {
        try {
            packageDetailMapInstance.off();
            packageDetailMapInstance.remove();
        } catch (e) {
            console.error('Error removing map instance:', e);
        }
        packageDetailMapInstance = null;
    }

    // Create a fresh map container child
    const mapDiv = document.createElement('div');
    mapDiv.style.width = '100%';
    mapDiv.style.height = '100%';
    mapDiv.style.borderRadius = '8px';
    mapContainer.appendChild(mapDiv);

    // Initialize Leaflet map centered at the branch
    const map = L.map(mapDiv, {
        zoomControl: false,
        attributionControl: false
    }).setView([destLat, destLng], 14);
    packageDetailMapInstance = map;

    // Add Zoom Control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Use Voyager tile layer for standard web look
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    // Add Branch Marker (Red/Green icon)
    const branchIcon = L.divIcon({
        className: 'custom-map-marker-branch',
        html: `<div style="background:#16a34a; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid fa-hospital"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    L.marker([destLat, destLng], { icon: branchIcon }).addTo(map)
        .bindPopup(`<strong>${branchName}</strong><br><span style="font-size:11px;">${branchAddress}</span>`)
        .openPopup();

    if (infoContainer) {
        infoContainer.innerHTML = `<span><i class="fa-solid fa-location-crosshairs fa-pulse" style="color:var(--primary);"></i> Đang tìm vị trí hiện tại của bạn...</span>`;
    }

    
    const processRoute = (userLat, userLng) => {
        const dist = Math.sqrt(Math.pow((destLat - userLat) * 111, 2) + Math.pow((destLng - userLng) * 111 * Math.cos(destLat * Math.PI / 180), 2));
        let isSim = false;
        if (dist > 100) {
            userLat = 10.76262;
            userLng = 106.68231;
            isSim = true;
        }
        drawBranchRouteAndSetupMap(map, userLat, userLng, destLat, destLng, branchName, isSim, 'modal-package-map-info');
    };

    const tryGPS = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    processRoute(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    console.warn('GPS permission denied or failed, using simulated location.', error);
                    const mockUserLat = 10.76262;
                    const mockUserLng = 106.68231;
                    drawBranchRouteAndSetupMap(map, mockUserLat, mockUserLng, destLat, destLng, branchName, true, 'modal-package-map-info');
                },
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
            );
        } else {
            const mockUserLat = 10.76262;
            const mockUserLng = 106.68231;
            drawBranchRouteAndSetupMap(map, mockUserLat, mockUserLng, destLat, destLng, branchName, true, 'modal-package-map-info');
        }
    };

    if (token && userRole === 'Patient') {
        getPatientProfileCoords().then(coords => {
            if (coords) {
                processRoute(coords.lat, coords.lng);
            } else {
                tryGPS();
            }
        }).catch(() => {
            tryGPS();
        });
    } else {
        tryGPS();
    }
}

async function drawBranchRouteAndSetupMap(map, userLat, userLng, destLat, destLng, branchName, isSimulated, infoContainerId = 'modal-branch-map-info') {
    const infoContainer = document.getElementById(infoContainerId);

    // Add User Marker (Blue icon)
    const userIcon = L.divIcon({
        className: 'custom-map-marker-user',
        html: `<div style="background:#0669ef; color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;"><i class="fa-solid fa-street-view"></i></div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15]
    });
    L.marker([userLat, userLng], { icon: userIcon }).addTo(map)
        .bindPopup(`<strong>Vị trí của bạn</strong>${isSimulated ? ' (Giả lập)' : ''}`);

    // Set view to encompass both points
    const bounds = L.latLngBounds([
        [userLat, userLng],
        [destLat, destLng]
    ]);
    map.fitBounds(bounds, { padding: [40, 40] });

    // Fetch routing path from OSRM
    const routeUrl = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${destLng},${destLat}?overview=full&geometries=geojson`;
    let distanceKm = 0;
    let durationMin = 0;
    let success = false;

    try {
        const response = await fetch(routeUrl);
        if (response.ok) {
            const data = await response.json();
            if (data.routes && data.routes.length > 0) {
                const route = data.routes[0];
                distanceKm = (route.distance / 1000).toFixed(1);
                durationMin = Math.round(route.duration / 60);

                const coords = route.geometry.coordinates.map(c => [c[1], c[0]]);
                
                // Add solid backing line for depth
                L.polyline(coords, {
                    color: '#bae6fd',
                    weight: 8,
                    opacity: 0.5
                }).addTo(map);

                const polyline = L.polyline(coords, {
                    color: '#0669ef',
                    weight: 4,
                    opacity: 0.8,
                    dashArray: '2, 6'
                }).addTo(map);

                polyline.bringToFront();
                map.fitBounds(polyline.getBounds(), { padding: [40, 40] });
                success = true;
            }
        }
    } catch (e) {
        console.error('OSM Routing API error, falling back to geodesic path:', e);
    }

    if (!success) {
        // Fallback: draw straight dashed line
        L.polyline([[userLat, userLng], [destLat, destLng]], {
            color: '#0669ef',
            weight: 3,
            dashArray: '5, 8',
            opacity: 0.7
        }).addTo(map);

        // Standard Haversine distance
        distanceKm = getHaversineDistance(userLat, userLng, destLat, destLng).toFixed(1);
        durationMin = Math.round(distanceKm * 2.5); // Estimate 2.5 min per km
    }

    // Make sure Leaflet redraws size perfectly inside active display
    setTimeout(() => {
        map.invalidateSize();
    }, 150);

    if (infoContainer) {
        const statusText = isSimulated 
            ? `<span style="font-size:10px; color:#b45309;"><i class="fa-solid fa-triangle-exclamation"></i> Hãy bật GPS để có chỉ đường chính xác</span>`
            : `<span style="font-size:10px; color:#16a34a;"><i class="fa-solid fa-circle-check"></i> Đã định vị vị trí hiện tại của bạn</span>`;

        infoContainer.innerHTML = `
            <div style="display:flex; flex-direction:column; gap:2px;">
                <div style="display:flex; gap:12px; font-weight:700; color:var(--dark);">
                    <span><i class="fa-solid fa-route" style="color:var(--primary);"></i> Dẫn đường: <strong style="color:var(--primary);">${distanceKm} km</strong></span>
                    <span><i class="fa-solid fa-clock" style="color:#0ea5e9;"></i> Khoảng: <strong style="color:#0ea5e9;">${durationMin} phút</strong></span>
                </div>
                ${statusText}
            </div>
        `;
    }
}

// Auto rotation for landing page promo banner
let currentPromoSlide = 0;
let promoInterval = null;

function initPromoCarousel() {
    const slides = document.querySelectorAll('.promo-slide');
    if (slides.length === 0) return;
    
    // Clear any existing interval
    if (promoInterval) clearInterval(promoInterval);
    
    // Switch to first slide initially
    switchPromoSlide(0, true);
    
    promoInterval = setInterval(() => {
        let nextSlide = (currentPromoSlide + 1) % slides.length;
        switchPromoSlide(nextSlide, true);
    }, 8000); // rotate every 8 seconds
}

function switchPromoSlide(index, isSilent = false) {
    const slides = document.querySelectorAll('.promo-slide');
    const dots = document.querySelectorAll('.carousel-dot');
    if (slides.length === 0) return;
    
    currentPromoSlide = index;
    
    slides.forEach((slide, i) => {
        if (i === index) {
            slide.classList.add('active');
        } else {
            slide.classList.remove('active');
        }
    });
    
    dots.forEach((dot, i) => {
        if (i === index) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
    });

    if (!isSilent) {
        // Sync landing tools below
        const tools = ['symptom', 'bmi', 'drug'];
        const toolId = tools[index];
        if (toolId) {
            const toolsList = ['bmi', 'symptom', 'drug'];
            toolsList.forEach(t => {
                const card = document.getElementById(`landing-tool-card-${t}`);
                const view = document.getElementById(`landing-tool-view-${t}`);
                if (card) {
                    if (t === toolId) card.classList.add('active');
                    else card.classList.remove('active');
                }
                if (view) {
                    if (t === toolId) view.style.display = 'block';
                    else view.style.display = 'none';
                }
            });
        }
    }

    // Reset auto-rotation timer to prevent immediate switching after manual click
    if (promoInterval) {
        clearInterval(promoInterval);
        promoInterval = setInterval(() => {
            let nextSlide = (currentPromoSlide + 1) % slides.length;
            switchPromoSlide(nextSlide, true);
        }, 8000);
    }
}

// ==========================================
// COMMUNITY TESTIMONIALS LOGIC
// ==========================================
let selectedReviewRating = 5;

// Tải danh sách đánh giá từ API
async function loadTestimonials() {
    const container = document.getElementById('testimonials-container');
    if (!container) return;

    try {
        const res = await fetch('/api/testimonials');
        if (!res.ok) throw new Error('Không thể tải danh sách đánh giá.');
        
        const data = await res.json();
        
        if (data.length === 0) {
            container.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--text-muted);">
                    <i class="fa-solid fa-comments" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                    Chưa có đánh giá nào từ cộng đồng. Hãy là người đầu tiên chia sẻ trải nghiệm của bạn!
                </div>
            `;
            return;
        }

        container.innerHTML = data.map((t, idx) => {
            const stars = '★'.repeat(t.rating) + '☆'.repeat(5 - t.rating);
            
            // Lấy ký tự viết tắt của họ tên để làm avatar
            const nameParts = t.fullName.trim().split(' ');
            let initials = '';
            if (nameParts.length > 1) {
                initials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
            } else {
                initials = t.fullName.substring(0, 2).toUpperCase();
            }

            // Tạo các gradient màu sắc khác nhau dựa trên index để avatar sinh động
            const gradients = [
                'linear-gradient(135deg, #0669ef, #084ab2)',
                'linear-gradient(135deg, #16a34a, #15803d)',
                'linear-gradient(135deg, #db2777, #be185d)',
                'linear-gradient(135deg, #7c3aed, #5b21b6)',
                'linear-gradient(135deg, #ea580c, #c2410c)'
            ];
            const gradient = gradients[idx % gradients.length];
            
            // Cấu hình card ở giữa nổi bật (Featured) như thiết kế gốc
            const isFeatured = idx === 1 ? ' testimonial-card-featured' : '';

            return `
                <div class="testimonial-card${isFeatured}">
                    <div class="testimonial-stars">${stars}</div>
                    <p class="testimonial-text">"${t.comment}"</p>
                    <div class="testimonial-author">
                        <div class="testimonial-avatar" style="background: ${gradient};">${initials}</div>
                        <div>
                            <div class="testimonial-name">${t.fullName}</div>
                            <div class="testimonial-role">${t.roleOrJob}</div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error(err);
        container.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 32px; color: var(--danger);">
                <i class="fa-solid fa-triangle-exclamation" style="font-size: 24px; margin-bottom: 8px; display: block;"></i>
                Lỗi tải danh sách đánh giá từ cộng đồng.
            </div>
        `;
    }
}

// Thiết lập số sao đánh giá được chọn
function setReviewRating(rating) {
    selectedReviewRating = rating;
    document.getElementById('review-rating').value = rating;
    updateStarUI();
}

// Xử lý hover khi rê chuột qua các ngôi sao
function hoverReviewRating(rating) {
    const stars = document.querySelectorAll('.star-rating-selector .star-item');
    stars.forEach((star, idx) => {
        if (idx < rating) {
            star.innerHTML = '★';
            star.classList.add('hover');
        } else {
            star.innerHTML = '☆';
            star.classList.remove('hover');
        }
    });
}

// Đặt lại hiển thị sao khi rê chuột ra ngoài
function resetReviewRatingHover() {
    updateStarUI();
}

// Cập nhật giao diện sao dựa trên điểm đã chọn
function updateStarUI() {
    const stars = document.querySelectorAll('.star-rating-selector .star-item');
    stars.forEach((star, idx) => {
        star.classList.remove('hover');
        if (idx < selectedReviewRating) {
            star.innerHTML = '★';
            star.classList.add('active');
        } else {
            star.innerHTML = '☆';
            star.classList.remove('active');
        }
    });
}

// Tự động điền thông tin người dùng đã đăng nhập vào form đánh giá
function updateTestimonialFormPrefill() {
    const reviewNameInput = document.getElementById('review-name');
    const reviewRoleInput = document.getElementById('review-role');
    if (!reviewNameInput) return;

    if (token) {
        // Lấy thông tin từ localStorage
        const storedName = localStorage.getItem('userName') || '';
        const storedRole = localStorage.getItem('userRole') || '';
        
        reviewNameInput.value = storedName;
        
        // Gán nghề nghiệp hiển thị mặc định theo phân quyền
        if (storedRole === 'Patient') {
            reviewRoleInput.value = 'Bệnh nhân';
        } else if (storedRole === 'Doctor') {
            reviewRoleInput.value = 'Bác sĩ';
        } else if (storedRole === 'Admin') {
            reviewRoleInput.value = 'Quản trị viên';
        }
    } else {
        // Nếu đăng xuất, xóa trống
        reviewNameInput.value = '';
        reviewRoleInput.value = '';
    }
}

// Gửi đánh giá lên API
async function submitReview(event) {
    event.preventDefault();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalBtnHTML = submitBtn.innerHTML;
    
    // Khóa nút để tránh spam click
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Đang gửi...`;

    const rating = document.getElementById('review-rating').value;
    const name = document.getElementById('review-name').value;
    const role = document.getElementById('review-role').value;
    const comment = document.getElementById('review-comment').value;

    try {
        const payload = {
            FullName: name,
            RoleOrJob: role,
            Rating: parseInt(rating),
            Comment: comment
        };

        const headers = {
            'Content-Type': 'application/json'
        };
        
        // Đính kèm token nếu người dùng đã đăng nhập để liên kết UserId ở backend
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const res = await fetch('/api/testimonials', {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (!res.ok) {
            throw new Error(data.message || 'Gửi đánh giá không thành công.');
        }

        showToast(data.message || 'Cảm ơn bạn đã gửi đánh giá!', 'success');
        
        // Reset nội dung bình luận
        document.getElementById('review-comment').value = '';
        
        // Khôi phục số sao về 5
        setReviewRating(5);
        
        // Tải lại danh sách đánh giá động lập tức
        await loadTestimonials();
    } catch (err) {
        console.error(err);
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHTML;
    }
}

// ── State Persistence across Page Reloads ───────────────────────────────────

function saveAppState() {
    // Determine current screen
    let screen = 'landing';
    if (document.getElementById('login-screen')?.style.display === 'flex') {
        screen = 'login';
    } else if (document.getElementById('dashboard-screen')?.style.display === 'block') {
        screen = 'dashboard';
    } else if (document.getElementById('ai-tools-screen')?.style.display === 'block') {
        screen = 'ai-tools';
    } else if (document.getElementById('hospitals-screen')?.style.display === 'block') {
        screen = 'hospitals';
    } else if (document.getElementById('knowledge-screen')?.style.display === 'block') {
        screen = 'knowledge';
    }
    
    // Get modal visibility states
    const bookingModal = document.getElementById('booking-modal');
    const bookingModalOpen = bookingModal && bookingModal.style.display === 'flex';
    
    const specialtyModal = document.getElementById('specialty-booking-modal');
    const specialtyModalOpen = specialtyModal && specialtyModal.style.display === 'flex';
    
    const state = {
        screen,
        currentTab,
        bookingModalOpen,
        specialtyModalOpen,
        selectedSpecialtyForModal,
        
        // Specialty booking inputs
        specialtyBooking: {
            date: document.getElementById('spec-filter-date')?.value || '',
            branch: document.getElementById('spec-filter-branch')?.value || '',
            selectedSlot: window.selectedSpecialtyBooking,
            symptoms: document.getElementById('spec-booking-symptoms')?.value || ''
        },
        
        // Main booking form inputs
        bookingForm: {
            specialty: document.getElementById('booking-specialty')?.value || '',
            branch: document.getElementById('booking-branch')?.value || '',
            doctor: document.getElementById('booking-doctor')?.value || '',
            date: document.getElementById('booking-date')?.value || '',
            slot: document.getElementById('booking-slot')?.value || '',
            symptoms: document.getElementById('booking-symptoms')?.value || '',
            target: document.querySelector('input[name="booking-target"]:checked')?.value || 'self',
            
            // Personal administrative fields
            phone: document.getElementById('booking-phone')?.value || '',
            dob: document.getElementById('booking-dob')?.value || '',
            gender: document.getElementById('booking-gender')?.value || '',
            bloodtype: document.getElementById('booking-bloodtype')?.value || '',
            address: document.getElementById('booking-address')?.value || '',
            
            // Relative administrative fields
            relative: {
                fullname: document.getElementById('relative-fullname')?.value || '',
                phone: document.getElementById('relative-phone')?.value || '',
                relationship: document.getElementById('relative-relationship')?.value || '',
                gender: document.getElementById('relative-gender')?.value || '',
                dob: document.getElementById('relative-dob')?.value || ''
            }
        }
    };
    
    localStorage.setItem('careconnect_app_state', JSON.stringify(state));
}

async function restoreAppState() {
    const stateStr = localStorage.getItem('careconnect_app_state');
    if (!stateStr) return;
    
    // Clear state so it doesn't get restored again on subsequent clean loads
    localStorage.removeItem('careconnect_app_state');
    
    try {
        const state = JSON.parse(stateStr);
        if (!state) return;
        
        // Ensure background doctor/profile data loads are complete to avoid race conditions
        if (window.loadDoctorsPromise) {
            await window.loadDoctorsPromise;
        }
        if (window.loadProfilePromise) {
            await window.loadProfilePromise;
        }
        
        // 1. Restore Screen and Tab
        if (token) {
            if (state.screen === 'dashboard') {
                goToDashboard();
                if (state.currentTab) {
                    switchTab(state.currentTab);
                }
            } else if (state.screen === 'login') {
                showAuthScreen(false);
            } else if (state.screen === 'ai-tools') {
                showAiToolsScreen();
            } else if (state.screen === 'hospitals') {
                showHospitalSystemScreen();
            } else if (state.screen === 'knowledge') {
                showKnowledgeScreen();
            } else {
                goToLandingPage();
            }
        } else {
            if (state.screen === 'login') {
                showAuthScreen(false);
            } else if (state.screen === 'ai-tools') {
                showAiToolsScreen();
            } else if (state.screen === 'hospitals') {
                showHospitalSystemScreen();
            } else if (state.screen === 'knowledge') {
                showKnowledgeScreen();
            } else {
                showLandingPage();
            }
        }
        
        // 2. Restore Specialty Booking modal
        if (state.specialtyModalOpen && state.selectedSpecialtyForModal) {
            await bookBySpecialty(state.selectedSpecialtyForModal);
            
            const dateInput = document.getElementById('spec-filter-date');
            const branchSelect = document.getElementById('spec-filter-branch');
            const symptomsInput = document.getElementById('spec-booking-symptoms');
            
            if (dateInput && state.specialtyBooking.date) dateInput.value = state.specialtyBooking.date;
            if (branchSelect && state.specialtyBooking.branch) branchSelect.value = state.specialtyBooking.branch;
            if (symptomsInput && state.specialtyBooking.symptoms) symptomsInput.value = state.specialtyBooking.symptoms;
            
            await loadSpecialtyBookingData();
            
            // Re-select slot if chosen
            if (state.specialtyBooking.selectedSlot) {
                const s = state.specialtyBooking.selectedSlot;
                const btnId = `spec-slot-btn-${s.doctorId}-${s.date}-${s.slot.replace(/\s+/g, '')}`;
                setTimeout(() => {
                    const btn = document.getElementById(btnId);
                    if (btn) {
                        btn.click();
                    } else {
                        selectSpecialtySlot(s.doctorId, s.date, s.slot, s.doctorName, s.branchName, btnId);
                    }
                }, 300);
            }
        }
        
        // 3. Restore Main Booking modal
        if (state.bookingModalOpen && token && userRole === 'Patient') {
            openBookingModal();
            
            const f = state.bookingForm;
            
            const specialtySelect = document.getElementById('booking-specialty');
            if (specialtySelect && f.specialty) specialtySelect.value = f.specialty;
            
            const branchSelect = document.getElementById('booking-branch');
            if (branchSelect && f.branch) {
                const opts = Array.from(branchSelect.options);
                const hasOpt = opts.some(o => o.value === f.branch);
                if (!hasOpt) {
                    const newOpt = document.createElement('option');
                    newOpt.value = f.branch;
                    newOpt.text = f.branch;
                    branchSelect.add(newOpt);
                }
                branchSelect.value = f.branch;
            }
            
            filterDoctorsBySelectedBranch();
            
            const doctorSelect = document.getElementById('booking-doctor');
            if (doctorSelect && f.doctor) doctorSelect.value = f.doctor;
            
            const dateInput = document.getElementById('booking-date');
            if (dateInput && f.date) dateInput.value = f.date;
            
            const symptomsInput = document.getElementById('booking-symptoms');
            if (symptomsInput && f.symptoms) symptomsInput.value = f.symptoms;
            
            await loadAvailableSlots();
            
            if (f.slot) {
                const slotBtn = document.querySelector(`.booking-slot-btn[data-slot="${f.slot}"]`);
                if (slotBtn) {
                    selectBookingSlot(f.slot, slotBtn);
                } else {
                    const slotSelect = document.getElementById('booking-slot');
                    if (slotSelect) {
                        slotSelect.value = f.slot;
                        slotSelect.dispatchEvent(new Event('change'));
                    }
                }
            }
            
            const targetRadio = document.querySelector(`input[name="booking-target"][value="${f.target}"]`);
            if (targetRadio) {
                targetRadio.checked = true;
                toggleBookingTarget(f.target);
            }
            
            // Restore profile fields
            if (f.phone) document.getElementById('booking-phone').value = f.phone;
            if (f.dob) document.getElementById('booking-dob').value = f.dob;
            if (f.gender) document.getElementById('booking-gender').value = f.gender;
            if (f.bloodtype) document.getElementById('booking-bloodtype').value = f.bloodtype;
            if (f.address) document.getElementById('booking-address').value = f.address;
            
            // Restore relative fields
            if (f.relative) {
                if (f.relative.fullname) document.getElementById('relative-fullname').value = f.relative.fullname;
                if (f.relative.phone) document.getElementById('relative-phone').value = f.relative.phone;
                if (f.relative.relationship) document.getElementById('relative-relationship').value = f.relative.relationship;
                if (f.relative.gender) document.getElementById('relative-gender').value = f.relative.gender;
                if (f.relative.dob) document.getElementById('relative-dob').value = f.relative.dob;
            }
            
            // Re-open collapse fields if there was input
            const fieldsDiv = document.getElementById('booking-patient-info-fields');
            const arrow = document.getElementById('profile-collapse-arrow');
            if (fieldsDiv && arrow && (f.phone || f.dob || f.gender || f.address)) {
                fieldsDiv.style.display = 'block';
                arrow.style.transform = 'rotate(180deg)';
            }
        }
    } catch (e) {
        console.error("Error restoring app state:", e);
    }
}

// ==========================================
// CLIENT-SIDE CLINIC CHECK-IN & QR PORTAL FUNCTIONS
// ==========================================

async function showAppointmentQrModal(appointmentId) {
    window.activeQrAppointmentId = appointmentId;
    const modal = document.getElementById('appointment-qr-modal');
    if (!modal) return;
    
    modal.style.display = 'flex';
    
    const qrImage = document.getElementById('appointment-qr-image');
    if (qrImage) {
        qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${appointmentId}`;
    }
    
    // Find appointment details
    let app = null;
    if (window.allAppointments) {
        app = window.allAppointments.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appointmentId);
    }
    
    if (!app && token) {
        try {
            const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const list = await res.json();
                app = list.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appointmentId);
            }
        } catch (e) {
            console.error("Error fetching appointment for QR modal:", e);
        }
    }
    
    const detailsDiv = document.getElementById('appointment-qr-details');
    if (detailsDiv) {
        if (app) {
            const dateStr = new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString('vi-VN');
            const patientName = app.patientName || app.PatientName || userName;
            const doctorName = app.doctorName || app.DoctorName || 'Đang cập nhật';
            const timeSlot = app.timeSlot || app.TimeSlot || '';
            const branch = app.hospitalBranch || app.HospitalBranch || 'Hệ thống CareConnect';
            
            detailsDiv.innerHTML = `
                <div style="margin-bottom: 6px;"><strong>Mã lịch hẹn:</strong> #${appointmentId}</div>
                <div style="margin-bottom: 6px;"><strong>Bệnh nhân:</strong> ${patientName}</div>
                <div style="margin-bottom: 6px;"><strong>Bác sĩ:</strong> ${doctorName}</div>
                <div style="margin-bottom: 6px;"><strong>Thời gian:</strong> ${timeSlot} - Ngày ${dateStr}</div>
                <div><strong>Cơ sở:</strong> ${branch}</div>
            `;
            
            const btnPay = document.getElementById('btn-pay-vietqr');
            if (btnPay) {
                const hasPaid = app.paymentMethod || app.paymentTransactionId || app.status === 'CheckedIn' || app.status === 'Completed' || app.status === 'Confirmed';
                if (hasPaid) {
                    btnPay.style.display = 'none';
                    detailsDiv.innerHTML += `
                        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed var(--border-color); color: var(--success); font-weight: 700; font-size: 13.5px; text-align: center;">
                            <i class="fa-solid fa-circle-check"></i> ĐÃ THANH TOÁN ONLINE (${app.paymentMethod || 'Chuyển khoản'})
                        </div>
                    `;
                } else {
                    btnPay.style.display = 'inline-flex';
                }
            }
        } else {
            detailsDiv.innerHTML = `
                <div style="margin-bottom: 6px;"><strong>Mã lịch hẹn:</strong> #${appointmentId}</div>
                <div style="color: var(--text-muted);">Đang tải chi tiết cuộc hẹn...</div>
            `;
        }
    }
}

function closeAppointmentQrModal() {
    const modal = document.getElementById('appointment-qr-modal');
    if (modal) modal.style.display = 'none';
}

function payWithVietQrFromModal() {
    const appointmentId = window.activeQrAppointmentId;
    if (!appointmentId) return;
    
    // Close QR check-in modal
    closeAppointmentQrModal();
    
    // Open VietQR modal
    const paymentModal = document.getElementById('payment-vietqr-modal');
    if (paymentModal) {
        paymentModal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('btn-confirm-payment');
        if (confirmBtn) {
            confirmBtn.setAttribute('onclick', 'confirmVietQrPayment()');
        }
        
        // Generate VietQR Image URL
        const bankBin = 'mbb'; // MB Bank
        const accountNo = '19031234567890';
        const template = 'compact';
        const amount = 150000;
        const addInfo = encodeURIComponent(`CareConnect TT ${appointmentId}`);
        const accountName = encodeURIComponent('PHONG KHAM CARECONNECT');
        
        const vietQrUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accountName}`;
        
        const qrImage = document.getElementById('vietqr-payment-image');
        if (qrImage) {
            qrImage.src = vietQrUrl;
        }
        
        const transferContent = document.getElementById('vietqr-transfer-content');
        if (transferContent) {
            transferContent.innerText = `CareConnect TT ${appointmentId}`;
        }
    }
}

function closeVietQrModal() {
    const paymentModal = document.getElementById('payment-vietqr-modal');
    if (paymentModal) {
        paymentModal.style.display = 'none';
    }
}

async function confirmVietQrPayment() {
    const appointmentId = window.activeQrAppointmentId;
    if (!appointmentId) return;
    
    const btn = document.getElementById('btn-confirm-payment');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...';
    }
    
    try {
        // Generate a mock transaction ID (e.g. FT260708XXXXXX)
        const mockTxId = 'FT' + Math.floor(1000000000 + Math.random() * 9000000000);
        
        const response = await fetch(`${API_BASE}/appointments/${appointmentId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                status: 'Confirmed',
                paymentMethod: 'VietQR',
                paymentTransactionId: mockTxId
            })
        });
        
        if (response.ok) {
            alert(`Thanh toán thành công! Mã giao dịch: ${mockTxId}. Lịch hẹn của bạn đã được xác nhận.`);
            closeVietQrModal();
            // Refresh appointment list
            if (typeof loadAppointments === 'function') {
                loadAppointments();
            }
        } else {
            const error = await response.json();
            alert(`Lỗi khi xác nhận thanh toán: ${error.message || 'Vui lòng thử lại.'}`);
        }
    } catch (e) {
        console.error("Payment confirmation error:", e);
        alert("Không thể kết nối đến máy chủ CareConnect. Vui lòng kiểm tra lại mạng.");
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tôi đã chuyển khoản';
        }
    }
}

async function downloadQrCode() {
    const qrImage = document.getElementById('appointment-qr-image');
    if (!qrImage || !qrImage.src) return;
    
    const btn = document.getElementById('btn-download-qr');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tải...';
    
    try {
        const response = await fetch(qrImage.src);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `CareConnect_QR_${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up URL
        setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
        showToast('Tải mã QR thành công!', 'success');
    } catch (e) {
        console.error("Error downloading QR code:", e);
        showToast('Không thể tải trực tiếp. Vui lòng nhấn giữ ảnh hoặc click chuột phải chọn lưu.', 'warning');
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function openReceptionCheckinModal() {
    const modal = document.getElementById('reception-checkin-modal');
    if (modal) {
        modal.style.display = 'flex';
        resetReceptionModal();
    }
}

function closeReceptionCheckinModal() {
    const modal = document.getElementById('reception-checkin-modal');
    if (modal) modal.style.display = 'none';
}

function resetReceptionModal() {
    document.getElementById('reception-scan-step').style.display = 'block';
    document.getElementById('reception-details-step').style.display = 'none';
    document.getElementById('reception-success-step').style.display = 'none';
    
    const qrInput = document.getElementById('reception-qr-input');
    if (qrInput) {
        qrInput.value = '';
        setTimeout(() => qrInput.focus(), 100);
    }
}

let currentCheckingAppointment = null;

async function lookupAppointmentForCheckin() {
    const qrInput = document.getElementById('reception-qr-input');
    if (!qrInput) return;
    
    let rawVal = qrInput.value.trim();
    if (!rawVal) {
        showToast('Vui lòng nhập mã hoặc quét QR code!', 'warning');
        return;
    }
    
    // Parse ID from URL or input (e.g. if the QR content was just a number or URL/text)
    const match = rawVal.match(/\d+$/);
    const appointmentId = match ? parseInt(match[0]) : null;
    
    if (!appointmentId) {
        showToast('Mã lịch khám không hợp lệ!', 'error');
        return;
    }
    
    showToast('Đang tìm kiếm lịch khám...', 'info');
    
    try {
        const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            showToast('Không thể lấy danh sách lịch khám từ hệ thống.', 'error');
            return;
        }
        
        const appointments = await res.json();
        const app = appointments.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appointmentId);
        
        if (!app) {
            showToast(`Không tìm thấy lịch khám #${appointmentId} trong hệ thống!`, 'error');
            return;
        }
        
        currentCheckingAppointment = app;
        
        // Populate Step 2 details
        document.getElementById('checkin-patient-name').innerText = app.patientName || app.PatientName || 'N/A';
        
        const dobStr = app.patientDob || app.PatientDob ? new Date(app.patientDob || app.PatientDob).toLocaleDateString('vi-VN') : 'N/A';
        const phone = app.patientPhone || app.PatientPhone || 'N/A';
        document.getElementById('checkin-patient-meta').innerText = `${phone} / ${dobStr}`;
        document.getElementById('checkin-patient-email').innerText = app.patientEmail || app.PatientEmail || 'N/A';
        
        const gender = app.patientGender || app.PatientGender === 'Male' ? 'Nam' : (app.patientGender === 'Female' ? 'Nữ' : 'Khác');
        const bloodType = app.patientBloodType || app.PatientBloodType || 'Chưa cập nhật';
        const address = app.patientAddress || app.PatientAddress || 'Chưa cập nhật';
        document.getElementById('checkin-patient-admin').innerText = `${gender} - Nhóm máu ${bloodType} - ${address}`;
        
        document.getElementById('checkin-doctor-name').innerText = app.doctorName || app.DoctorName || 'Chưa chỉ định';
        
        const dateStr = new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString('vi-VN');
        const timeSlot = app.timeSlot || app.TimeSlot || 'N/A';
        document.getElementById('checkin-time-slot').innerText = `${timeSlot} - Ngày ${dateStr}`;
        
        document.getElementById('checkin-branch-name').innerText = app.hospitalBranch || app.HospitalBranch || 'Hệ thống CareConnect';
        
        const statusEl = document.getElementById('checkin-status');
        if (statusEl) {
            statusEl.innerText = translateStatus(app.status || app.Status);
            statusEl.className = `status-badge status-${(app.status || app.Status).toLowerCase()}`;
        }
        
        document.getElementById('checkin-symptoms').innerText = app.symptoms || app.Symptoms || '(Không có triệu chứng ghi chú)';
        
        // Assign Room and Queue
        const doctor = (window.allDoctors || []).find(d => d.userId === (app.doctorId || app.DoctorId));
        const specialty = doctor ? (doctor.specialization || doctor.specialty) : '';
        const roomName = mapSpecialtyToRoom(specialty);
        const randNum = Math.floor(Math.random() * 200) + 1;
        let prefix = 'CC';
        if (app.isPriority || app.IsPriority) {
            prefix = 'PRI';
        } else if ((app.serviceTier || app.ServiceTier) === 'VIP') {
            prefix = 'VIP';
        }
        const queueStr = `${prefix}-${String(randNum).padStart(3, '0')}`;
        
        currentCheckingAppointment.assignedRoom = roomName;
        currentCheckingAppointment.assignedQueue = queueStr;
        
        document.getElementById('checkin-assigned-room').innerText = roomName;
        document.getElementById('checkin-assigned-queue').innerText = queueStr;
        
        // Fee details
        const typeDetails = getPatientTypeDetails(app);
        document.getElementById('checkin-fee-amount').innerText = typeDetails.feeStr;
        currentCheckingAppointment.calculatedFee = typeDetails.fee;
        
        // Clear checklists and inputs
        document.getElementById('checkin-verify-documents').checked = false;
        
        // Auto verify online payment
        const statusSpan = document.getElementById('checkin-payment-status');
        if (statusSpan) statusSpan.innerText = '';
        
        const isPaidOnline = app.paymentMethod || app.paymentTransactionId;
        if (isPaidOnline) {
            document.getElementById('checkin-verify-payment').checked = true;
            if (statusSpan) {
                statusSpan.innerHTML = `<i class="fa-solid fa-circle-check"></i> Đã thanh toán online (${app.paymentMethod || 'VietQR'} - Mã GD: ${app.paymentTransactionId || 'N/A'})`;
            }
        } else {
            document.getElementById('checkin-verify-payment').checked = false;
        }
        
        document.getElementById('checkin-vitals-bp').value = '';
        document.getElementById('checkin-vitals-temp').value = '';
        document.getElementById('checkin-vitals-weight').value = '';
        document.getElementById('checkin-vitals-hr').value = '';
        
        // Show Step 2
        document.getElementById('reception-scan-step').style.display = 'none';
        document.getElementById('reception-details-step').style.display = 'block';
        document.getElementById('reception-success-step').style.display = 'none';
        
    } catch (e) {
        console.error("Error looking up appointment:", e);
        showToast('Đã xảy ra lỗi khi tìm kiếm lịch khám.', 'error');
    }
}

function mapSpecialtyToRoom(specialty) {
    if (!specialty) return "PHÒNG KHÁM ĐA KHOA (TẦNG 1)";
    const specLower = specialty.toLowerCase();
    if (specLower.includes("tim mạch")) return "PHÒNG KHÁM TIM MẠCH (TẦNG 3 - PHÒNG 302)";
    if (specLower.includes("nhi")) return "PHÒNG KHÁM NHI KHOA (TẦNG 1 - PHÒNG 105)";
    if (specLower.includes("ung bướu")) return "PHÒNG KHÁM UNG BƯỚU (TẦNG 4 - PHÒNG 401)";
    if (specLower.includes("nội khoa") || specLower.includes("nội tổng quát")) return "PHÒNG KHÁM NỘI TỔNG QUÁT (TẦNG 2 - PHÒNG 205)";
    if (specLower.includes("sản") || specLower.includes("phụ khoa")) return "PHÒNG KHÁM SẢN PHỤ KHOA (TẦNG 1 - PHÒNG 108)";
    if (specLower.includes("tai mũi họng")) return "PHÒNG TAI MŨI HỌNG (TẦNG 2 - PHÒNG 210)";
    if (specLower.includes("răng") || specLower.includes("nha khoa")) return "PHÒNG RĂNG HÀM MẶT (TẦNG 2 - PHÒNG 212)";
    if (specLower.includes("mắt")) return "PHÒNG KHÁM MẮT (TẦNG 3 - PHÒNG 305)";
    if (specLower.includes("da liễu")) return "PHÒNG KHÁM DA LIỄU (TẦNG 2 - PHÒNG 215)";
    if (specLower.includes("chấn thương") || specLower.includes("chỉnh hình")) return "PHÒNG CHẤN THƯƠNG CHỈNH HÌNH (TẦNG 1 - PHÒNG 102)";
    return "PHÒNG KHÁM ĐA KHOA (TẦNG 1 - PHÒNG 101)";
}

async function confirmCheckin() {
    if (!currentCheckingAppointment) {
        showToast('Không có thông tin cuộc hẹn đang check-in!', 'error');
        return;
    }
    
    // Administrative Verification
    if (!document.getElementById('checkin-verify-documents').checked) {
        showToast('Vui lòng đối chiếu thông tin khớp với CCCD/Thẻ BHYT của bệnh nhân!', 'warning');
        return;
    }
    
    // Fee Payment Verification
    if (currentCheckingAppointment.calculatedFee > 0 && !document.getElementById('checkin-verify-payment').checked) {
        showToast('Vui lòng xác nhận đã thu phí khám bệnh tại quầy tiếp đón!', 'warning');
        return;
    }
    
    const bp = document.getElementById('checkin-vitals-bp')?.value.trim() || '';
    const temp = document.getElementById('checkin-vitals-temp')?.value.trim() || '';
    const weight = document.getElementById('checkin-vitals-weight')?.value.trim() || '';
    const hr = document.getElementById('checkin-vitals-hr')?.value.trim() || '';

    const appId = currentCheckingAppointment.appointmentId || currentCheckingAppointment.id || currentCheckingAppointment.AppointmentId || currentCheckingAppointment.Id;
    
    showToast('Đang tiến hành check-in...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                status: 'CheckedIn',
                bloodPressure: bp || null,
                temperature: temp || null,
                weight: weight || null,
                heartRate: hr || null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showToast(data.message || 'Check-in thất bại.', 'error');
            return;
        }
        
        showToast('Check-in thành công!', 'success');
        
        // Populate printable ticket elements
        document.getElementById('ticket-branch').innerText = currentCheckingAppointment.hospitalBranch || currentCheckingAppointment.HospitalBranch || 'Chi nhánh CareConnect';
        document.getElementById('ticket-app-id').innerText = `#${appId}`;
        
        const dateStr = new Date(currentCheckingAppointment.appointmentDate || currentCheckingAppointment.AppointmentDate).toLocaleDateString('vi-VN');
        const timeSlot = currentCheckingAppointment.timeSlot || currentCheckingAppointment.TimeSlot || '';
        document.getElementById('ticket-time').innerText = `${timeSlot} - ${dateStr}`;
        document.getElementById('ticket-patient-name').innerText = (currentCheckingAppointment.patientName || currentCheckingAppointment.PatientName || '').toUpperCase();
        document.getElementById('ticket-doctor-name').innerText = currentCheckingAppointment.doctorName || currentCheckingAppointment.DoctorName || 'Chưa chỉ định';
        
        const symptomText = currentCheckingAppointment.symptoms || currentCheckingAppointment.Symptoms;
        const symptomRow = document.getElementById('ticket-symptom-row');
        if (symptomText) {
            document.getElementById('ticket-symptoms').innerText = symptomText;
            if (symptomRow) symptomRow.style.display = 'block';
        } else {
            if (symptomRow) symptomRow.style.display = 'none';
        }
        
        // Populate pre-calculated room and queue
        document.getElementById('ticket-queue-number').innerText = currentCheckingAppointment.assignedQueue || 'CC-001';
        document.getElementById('ticket-room-name').innerText = (currentCheckingAppointment.assignedRoom || 'PHÒNG KHÁM ĐA KHOA').toUpperCase();
        
        // Vitals
        const bp = document.getElementById('checkin-vitals-bp').value.trim();
        const temp = document.getElementById('checkin-vitals-temp').value.trim();
        const weight = document.getElementById('checkin-vitals-weight').value.trim();
        const hr = document.getElementById('checkin-vitals-hr').value.trim();
        
        let vitalsParts = [];
        if (bp) vitalsParts.push(`HA: ${bp} mmHg`);
        if (temp) vitalsParts.push(`T: ${temp}°C`);
        if (weight) vitalsParts.push(`CN: ${weight} kg`);
        if (hr) vitalsParts.push(`NT: ${hr} bpm`);
        
        const vitalsRow = document.getElementById('ticket-vitals-row');
        const vitalsEl = document.getElementById('ticket-vitals');
        if (vitalsParts.length > 0 && vitalsRow && vitalsEl) {
            vitalsEl.innerText = vitalsParts.join(' | ');
            vitalsRow.style.display = 'block';
        } else if (vitalsRow) {
            vitalsRow.style.display = 'none';
        }
        
        // Booklet status
        const bookletChecked = document.getElementById('checkin-issue-booklet')?.checked;
        let bookletRow = document.getElementById('ticket-booklet-row');
        if (bookletRow) {
            bookletRow.innerHTML = bookletChecked ? 'Sổ khám bệnh: <strong style="color:#e03e2d; font-size:11px;">CẤP SỔ MỚI</strong>' : 'Sổ khám bệnh: <span>Đã có sổ</span>';
        }
        
        // Reload appointment list in dashboard
        loadAppointments();
        if (typeof loadReceptionAppointments === 'function') {
            loadReceptionAppointments();
        }
        
        // Show Step 3
        document.getElementById('reception-scan-step').style.display = 'none';
        document.getElementById('reception-details-step').style.display = 'none';
        document.getElementById('reception-success-step').style.display = 'block';
        
    } catch (e) {
        console.error("Error confirming check-in:", e);
        showToast('Đã xảy ra lỗi khi xác nhận check-in.', 'error');
    }
}

function printCheckinTicket() {
    const ticketDiv = document.getElementById('printable-checkin-ticket');
    if (!ticketDiv) return;
    
    const printWindow = window.open('', '_blank', 'width=450,height=600,resizable=yes,scrollbars=yes');
    if (!printWindow) {
        showToast('Vui lòng cho phép popup để in phiếu khám bệnh!', 'warning');
        return;
    }
    
    const ticketHtml = ticketDiv.innerHTML;
    
    printWindow.document.write(`
        <html>
        <head>
            <title>In Phiếu Khám Bệnh - CareConnect</title>
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Courier+Prime&display=swap');
                body {
                    margin: 0;
                    padding: 10px;
                    background: #fff;
                    font-family: 'Courier New', Courier, monospace;
                    color: #000;
                    display: flex;
                    justify-content: center;
                    align-items: flex-start;
                }
                .print-ticket {
                    width: 100%;
                    max-width: 380px;
                    border: none;
                    padding: 0;
                }
                strong {
                    font-weight: bold;
                }
                @media print {
                    body {
                        padding: 0;
                        margin: 0;
                    }
                    @page {
                        size: auto;
                        margin: 0mm;
                    }
                }
            </style>
        </head>
        <body onload="window.print(); window.close();">
            <div class="print-ticket">
                ${ticketHtml}
            </div>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// ==========================================
// REPORT FOLDERS & BULK ACTION FUNCTIONS
// ==========================================

// Handle individual appointment checkbox selection
function onAppointmentSelectChange() {
    const checkboxes = document.querySelectorAll('.appointment-select-checkbox');
    let selectedCount = 0;
    checkboxes.forEach(cb => {
        if (cb.checked) selectedCount++;
    });

    const countEl = document.getElementById('selected-apps-count');
    if (countEl) countEl.innerText = selectedCount;

    const selectionControls = document.getElementById('bulk-selection-controls');
    const bulkPanel = document.getElementById('staff-bulk-actions');
    
    if (selectedCount > 0) {
        if (bulkPanel) bulkPanel.style.display = 'flex';
        if (selectionControls) selectionControls.style.display = 'inline-flex';
    } else {
        if (bulkPanel) bulkPanel.style.display = 'none';
        if (selectionControls) selectionControls.style.display = 'none';
    }
}

function getStaffHiddenAppointmentsLocally() {
    try {
        const raw = localStorage.getItem('careconnect_staff_hidden_appointments');
        return raw ? JSON.parse(raw) : [];
    } catch (e) {
        return [];
    }
}

function isStaffAppointmentHiddenLocally(appId) {
    const list = getStaffHiddenAppointmentsLocally();
    return list.includes(Number(appId));
}

function hideSelectedCompletedOrCancelledAppointments() {
    const checkboxes = document.querySelectorAll('.appointment-select-checkbox');
    const appIdsToHide = [];
    let countIgnored = 0;
    
    checkboxes.forEach(cb => {
        if (cb.checked) {
            const appId = Number(cb.getAttribute('data-id'));
            const app = (window.allAppointments || []).find(a => {
                const aId = a.appointmentId || a.AppointmentId || a.id || a.Id;
                return Number(aId) === appId;
            });
            
            if (app && (app.status === 'Completed' || app.status === 'Cancelled')) {
                appIdsToHide.push(appId);
            } else {
                countIgnored++;
            }
        }
    });

    if (appIdsToHide.length === 0) {
        if (countIgnored > 0) {
            showToast('Chỉ có thể ẩn các lịch khám có trạng thái Đã hoàn thành hoặc Đã hủy!', 'warning');
        } else {
            showToast('Không có lịch khám nào được chọn!', 'warning');
        }
        return;
    }

    try {
        const hiddenList = getStaffHiddenAppointmentsLocally();
        appIdsToHide.forEach(id => {
            if (!hiddenList.includes(id)) {
                hiddenList.push(id);
            }
        });
        localStorage.setItem('careconnect_staff_hidden_appointments', JSON.stringify(hiddenList));
    } catch (e) {
        console.error('Error saving staff hidden appointments:', e);
    }

    showToast(`Đã ẩn ${appIdsToHide.length} lịch khám đã hoàn thành hoặc bị hủy`, 'success');
    
    selectAllAppointments(false);
    filterAppointments();
}

function clearStaffHiddenAppointments() {
    localStorage.removeItem('careconnect_staff_hidden_appointments');
    showToast('Đã khôi phục hiển thị toàn bộ lịch khám', 'success');
    updateStaffHiddenButtonVisibility();
    filterAppointments();
}

function updateStaffHiddenButtonVisibility() {
    const list = getStaffHiddenAppointmentsLocally();
    const btn = document.getElementById('btn-clear-staff-hidden');
    const roleLower = (userRole || '').toLowerCase();
    if (btn) {
        if (roleLower !== 'patient' && list.length > 0) {
            btn.style.display = 'inline-flex';
        } else {
            btn.style.display = 'none';
        }
    }
}

// Select or unselect all visible appointments
function selectAllAppointments(checked) {
    const checkboxes = document.querySelectorAll('.appointment-select-checkbox');
    checkboxes.forEach(cb => {
        cb.checked = checked;
    });
    onAppointmentSelectChange();
}

// Read report folders from LocalStorage
function getReportFoldersLocally() {
    const data = localStorage.getItem('careconnect_report_folders');
    if (!data) {
        // Create a default folder
        const defaultFolders = {
            'Báo cáo mặc định': []
        };
        localStorage.setItem('careconnect_report_folders', JSON.stringify(defaultFolders));
        return defaultFolders;
    }
    try {
        return JSON.parse(data);
    } catch (e) {
        return {};
    }
}

// Write report folders to LocalStorage
function saveReportFoldersLocally(folders) {
    localStorage.setItem('careconnect_report_folders', JSON.stringify(folders));
}

// Create a new folder
function createNewFolder(folderName) {
    if (!folderName) return;
    const folders = getReportFoldersLocally();
    if (folders[folderName]) {
        alert('Thư mục này đã tồn tại!');
        return;
    }
    folders[folderName] = [];
    saveReportFoldersLocally(folders);
    updateFolderSelectDropdown();
    showToast(`Đã tạo thư mục "${folderName}"`);
}

// Prompt user to create a new folder
function createNewFolderPrompt() {
    const name = prompt('Nhập tên thư mục báo cáo mới:');
    if (name && name.trim()) {
        createNewFolder(name.trim());
    }
}

// Save selected appointments to a specific folder
function saveSelectedToFolder() {
    const folderSelect = document.getElementById('staff-folder-select');
    if (!folderSelect) return;
    const folderName = folderSelect.value;
    if (!folderName) {
        alert('Vui lòng chọn hoặc tạo một thư mục!');
        return;
    }

    const checkboxes = document.querySelectorAll('.appointment-select-checkbox');
    const selectedIds = [];
    checkboxes.forEach(cb => {
        if (cb.checked) {
            selectedIds.push(parseInt(cb.getAttribute('data-id')));
        }
    });

    if (selectedIds.length === 0) {
        alert('Vui lòng chọn ít nhất một lịch khám!');
        return;
    }

    // Find actual appointment objects in window.allAppointments
    if (!window.allAppointments) {
        alert('Không tìm thấy dữ liệu lịch khám hệ thống!');
        return;
    }

    const folders = getReportFoldersLocally();
    if (!folders[folderName]) {
        folders[folderName] = [];
    }

    let addedCount = 0;
    selectedIds.forEach(id => {
        const appObj = window.allAppointments.find(a => (a.appointmentId || a.AppointmentId || a.id || a.Id) === id);
        if (appObj) {
            // Avoid duplicates in the folder
            const exists = folders[folderName].some(a => (a.appointmentId || a.AppointmentId || a.id || a.Id) === id);
            if (!exists) {
                folders[folderName].push(appObj);
                addedCount++;
            }
        }
    });

    saveReportFoldersLocally(folders);
    
    // Clear selection
    selectAllAppointments(false);
    
    showToast(`Đã thêm ${addedCount} lịch khám vào thư mục "${folderName}"!`);
}

// Update the dropdown option list
function updateFolderSelectDropdown() {
    const folderSelect = document.getElementById('staff-folder-select');
    if (!folderSelect) return;

    const folders = getReportFoldersLocally();
    let html = '';
    Object.keys(folders).forEach(name => {
        html += `<option value="${name}">${name} (${folders[name].length})</option>`;
    });

    folderSelect.innerHTML = html;
}

// Open the report folders modal
function openReportFoldersModal() {
    const modal = document.getElementById('report-folders-modal');
    if (modal) {
        modal.style.display = 'flex';
        renderFoldersList();
    }
}

// Close the report folders modal
function closeReportFoldersModal() {
    const modal = document.getElementById('report-folders-modal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Render folder list in modal
function renderFoldersList() {
    const container = document.getElementById('folders-modal-body');
    if (!container) return;

    const folders = getReportFoldersLocally();
    const folderKeys = Object.keys(folders);

    if (folderKeys.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 24px; color: var(--text-muted);">
                <i class="fa-solid fa-folder-open" style="font-size: 36px; margin-bottom: 12px; color: #ccc;"></i>
                <p>Chưa có thư mục báo cáo nào được tạo.</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 16px;">';
    
    folderKeys.forEach((name, idx) => {
        const apps = folders[name] || [];
        html += `
            <div class="folder-item glass-card" style="padding: 16px; border: 1.5px solid var(--border-color); border-radius: 12px; background: rgba(0,0,0,0.01);">
                <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px; margin-bottom: 12px;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-folder" style="font-size: 24px; color: #f59e0b;"></i>
                        <div>
                            <strong style="font-size: 15px; color: var(--dark);">${name}</strong>
                            <span style="font-size: 12px; color: var(--text-muted); display: block;">Tổng số: <strong>${apps.length}</strong> lịch khám đã lưu</span>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <button class="btn btn-sm btn-outline-primary" style="padding: 6px 12px; font-size: 12px;" onclick="toggleFolderDetails(${idx})">
                            <i class="fa-solid fa-eye"></i> Xem danh sách
                        </button>
                        <button class="btn btn-sm btn-outline-success" style="padding: 6px 12px; font-size: 12px;" onclick="exportFolderToCSV('${name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-file-excel"></i> Xuất Excel/CSV
                        </button>
                        <button class="btn btn-sm btn-primary" style="padding: 6px 12px; font-size: 12px;" onclick="printFolderReport('${name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-print"></i> Báo cáo tổng hợp
                        </button>
                        <button class="btn btn-sm btn-logout" style="padding: 6px 12px; font-size: 12px;" onclick="deleteFolder('${name.replace(/'/g, "\\'")}')">
                            <i class="fa-solid fa-trash-can"></i> Xóa
                        </button>
                    </div>
                </div>
                
                <!-- Expanded details (Hidden by default) -->
                <div id="folder-details-${idx}" style="display: none; max-height: 240px; overflow-y: auto; background: #fff; border: 1px solid var(--border-color); border-radius: 8px; padding: 12px;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 12.5px; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 2px solid var(--border-color); color: var(--text-muted); font-weight: 700;">
                                <th style="padding: 6px 8px;">Mã lịch</th>
                                <th style="padding: 6px 8px;">Ngày / Ca</th>
                                <th style="padding: 6px 8px;">Bệnh nhân</th>
                                <th style="padding: 6px 8px;">Bác sĩ</th>
                                <th style="padding: 6px 8px;">Trạng thái</th>
                                <th style="padding: 6px 8px; width: 50px; text-align: center;">Bỏ</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${apps.length === 0 ? `
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 12px; color: var(--text-muted);">Không có lịch khám nào trong thư mục này.</td>
                                </tr>
                            ` : apps.map(app => {
                                const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
                                const statusClass = `status-${app.status.toLowerCase()}`;
                                const statusText = translateStatus(app.status);
                                return `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 8px;">#${appId}</td>
                                        <td style="padding: 8px;">
                                            <div>${new Date(app.appointmentDate).toLocaleDateString('vi-VN')}</div>
                                            <div style="font-size: 11px; color: var(--text-muted);">${app.timeSlot}</div>
                                        </td>
                                        <td style="padding: 8px;">${app.patientName}</td>
                                        <td style="padding: 8px;">${app.doctorName}</td>
                                        <td style="padding: 8px;"><span class="status-badge ${statusClass}" style="font-size: 10.5px; padding: 2px 6px;">${statusText}</span></td>
                                        <td style="padding: 8px; text-align: center;">
                                            <button style="background: none; border: none; color: var(--danger); cursor: pointer; font-size: 14px;" onclick="removeAppFromFolder('${name.replace(/'/g, "\\'")}', ${appId})">
                                                <i class="fa-solid fa-times-circle"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Expand or collapse folder details inside modal
function toggleFolderDetails(idx) {
    const el = document.getElementById(`folder-details-${idx}`);
    if (el) {
        if (el.style.display === 'none') {
            el.style.display = 'block';
        } else {
            el.style.display = 'none';
        }
    }
}

// Remove an appointment from a folder
function removeAppFromFolder(folderName, appId) {
    if (!confirm('Bạn có chắc muốn bỏ lịch khám này khỏi thư mục?')) return;
    const folders = getReportFoldersLocally();
    if (folders[folderName]) {
        folders[folderName] = folders[folderName].filter(app => {
            const currentId = app.appointmentId || app.AppointmentId || app.id || app.Id;
            return currentId !== appId;
        });
        saveReportFoldersLocally(folders);
        renderFoldersList();
        updateFolderSelectDropdown();
        showToast('Đã loại bỏ lịch khám khỏi thư mục.');
    }
}

// Delete an entire folder
function deleteFolder(folderName) {
    if (!confirm(`Bạn có chắc chắn muốn xóa thư mục "${folderName}"?`)) return;
    const folders = getReportFoldersLocally();
    delete folders[folderName];
    saveReportFoldersLocally(folders);
    renderFoldersList();
    updateFolderSelectDropdown();
    showToast(`Đã xóa thư mục "${folderName}"`);
}

// Export a folder of appointments to CSV (Excel-compatible with UTF-8 BOM)
function exportFolderToCSV(folderName) {
    const folders = getReportFoldersLocally();
    const apps = folders[folderName] || [];

    if (apps.length === 0) {
        alert('Thư mục trống, không thể xuất báo cáo!');
        return;
    }

    // CSV Headers
    let csvContent = '\uFEFF'; // UTF-8 BOM
    csvContent += 'Mã Lịch Khám,Ngày Khám,Ca Khám,Họ Tên Bệnh Nhân,Bác Sĩ Khám,Chi Nhánh,Trạng Thái,Triệu Chứng/Ghi Chú\n';

    apps.forEach(app => {
        const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
        const appDate = new Date(app.appointmentDate).toLocaleDateString('vi-VN');
        const statusText = translateStatus(app.status);
        const branchText = getLocalizedBranchName(app.hospitalBranch);
        
        // Escape quotes in text values
        const escapeCSV = (val) => {
            if (val === null || val === undefined) return '';
            let str = String(val);
            if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                str = '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const patientName = escapeCSV(app.patientName);
        const doctorName = escapeCSV(app.doctorName);
        const timeSlot = escapeCSV(app.timeSlot);
        const symptoms = escapeCSV(app.symptoms || '');

        csvContent += `${appId},${appDate},${timeSlot},${patientName},${doctorName},${escapeCSV(branchText)},${escapeCSV(statusText)},${symptoms}\n`;
    });

    // Create Download Trigger
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `CC_Bao_Cao_${folderName.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Generate printable HTML Report Slip in new tab
function printFolderReport(folderName) {
    const folders = getReportFoldersLocally();
    const apps = folders[folderName] || [];

    if (apps.length === 0) {
        alert('Thư mục trống, không có dữ liệu để báo cáo!');
        return;
    }

    // Calculate report statistics
    const totalCount = apps.length;
    let pendingCount = 0;
    let confirmedCount = 0;
    let completedCount = 0;
    let cancelledCount = 0;

    apps.forEach(app => {
        if (app.status === 'Pending') pendingCount++;
        else if (app.status === 'Confirmed') confirmedCount++;
        else if (app.status === 'Completed') completedCount++;
        else if (app.status === 'Cancelled') cancelledCount++;
    });

    const reportDate = new Date().toLocaleDateString('vi-VN', {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });

    const rowsHtml = apps.map((app, idx) => {
        const appId = app.appointmentId || app.AppointmentId || app.id || app.Id;
        const appDate = new Date(app.appointmentDate).toLocaleDateString('vi-VN');
        const statusText = translateStatus(app.status);
        const branchText = getLocalizedBranchName(app.hospitalBranch);
        return `
            <tr>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${idx + 1}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center; font-weight: bold;">#${appId}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${appDate}<br><span style="font-size: 11px; color: #555;">${app.timeSlot}</span></td>
                <td style="border: 1px solid #ddd; padding: 8px;"><strong>${app.patientName}</strong><br><span style="font-size: 11px; color: #555;">${app.patientEmail}</span></td>
                <td style="border: 1px solid #ddd; padding: 8px;">${app.doctorName}</td>
                <td style="border: 1px solid #ddd; padding: 8px;">${branchText}</td>
                <td style="border: 1px solid #ddd; padding: 8px; text-align: center;"><span style="padding: 3px 8px; border-radius: 4px; font-weight: bold; font-size: 11px; background: #eee; border: 1px solid #ccc;">${statusText}</span></td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Báo cáo - ${folderName}</title>
            <meta charset="utf-8">
            <style>
                body {
                    font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    padding: 40px;
                    color: #333;
                    line-height: 1.5;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 3px solid #0669ef;
                    padding-bottom: 16px;
                }
                .header h1 {
                    margin: 0;
                    font-size: 26px;
                    color: #0669ef;
                }
                .header p {
                    margin: 6px 0 0 0;
                    font-size: 14px;
                    color: #666;
                }
                .meta-table {
                    width: 100%;
                    margin-bottom: 24px;
                    font-size: 14px;
                }
                .stats-grid {
                    display: grid;
                    grid-template-columns: repeat(5, 1fr);
                    gap: 16px;
                    margin-bottom: 30px;
                }
                .stat-box {
                    border: 1px solid #ddd;
                    border-radius: 8px;
                    padding: 12px;
                    text-align: center;
                    background: #fcfcfc;
                }
                .stat-box .num {
                    font-size: 22px;
                    font-weight: 800;
                    color: #0669ef;
                    margin-bottom: 4px;
                }
                .stat-box .lbl {
                    font-size: 11px;
                    color: #666;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                table.data-table {
                    width: 100%;
                    border-collapse: collapse;
                    font-size: 12.5px;
                    margin-top: 10px;
                }
                table.data-table th {
                    background: #f5f5f5;
                    border: 1px solid #ddd;
                    padding: 10px;
                    text-align: left;
                    font-weight: bold;
                }
                .footer {
                    margin-top: 40px;
                    text-align: right;
                    font-size: 13px;
                }
                .signature-space {
                    margin-top: 60px;
                    height: 80px;
                }
                @media print {
                    body {
                        padding: 10px;
                    }
                    button {
                        display: none;
                    }
                }
            </style>
        </head>
        <body onload="window.print();">
            <div style="text-align: left; margin-bottom: 12px;">
                <button onclick="window.print();" style="padding: 8px 16px; background: #0669ef; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">
                    In Báo Cáo
                </button>
            </div>
            <div class="header">
                <h1>CARECONNECT HOSPITAL</h1>
                <p>Hệ Thống Quản Lý Lịch Khám & Chăm Sóc Sức Khỏe</p>
                <h2 style="margin-top: 16px; font-size: 20px; color: #222;">BÁO CÁO THỐNG KÊ LỊCH HẸN KHÁM</h2>
                <div style="font-style: italic; color: #666; margin-top: 4px;">Thư mục: <strong>${folderName}</strong></div>
            </div>
            
            <table class="meta-table">
                <tr>
                    <td><strong>Người lập báo cáo:</strong> Nhân viên CareConnect (Vai trò: ${userRole})</td>
                    <td style="text-align: right;"><strong>Thời gian lập:</strong> ${reportDate}</td>
                </tr>
            </table>

            <div class="stats-grid">
                <div class="stat-box">
                    <div class="num">${totalCount}</div>
                    <div class="lbl">Tổng số lịch khám</div>
                </div>
                <div class="stat-box">
                    <div class="num" style="color: #f59e0b;">${pendingCount}</div>
                    <div class="lbl">Chờ duyệt</div>
                </div>
                <div class="stat-box">
                    <div class="num" style="color: #0669ef;">${confirmedCount}</div>
                    <div class="lbl">Đã xác nhận</div>
                </div>
                <div class="stat-box">
                    <div class="num" style="color: #10b981;">${completedCount}</div>
                    <div class="lbl">Đã hoàn thành</div>
                </div>
                <div class="stat-box">
                    <div class="num" style="color: #ef4444;">${cancelledCount}</div>
                    <div class="lbl">Đã hủy lịch</div>
                </div>
            </div>

            <h3 style="margin-bottom: 8px; font-size: 15px; border-left: 4px solid #0669ef; padding-left: 8px;">CHI TIẾT DANH SÁCH LỊCH KHÁM THỐNG KÊ</h3>
            <table class="data-table">
                <thead>
                    <tr>
                        <th style="width: 40px; text-align: center;">STT</th>
                        <th style="width: 90px; text-align: center;">Mã Lịch</th>
                        <th>Ngày & Giờ Khám</th>
                        <th>Bệnh Nhân</th>
                        <th>Bác Sĩ</th>
                        <th>Chi Nhánh liên kết</th>
                        <th style="width: 110px; text-align: center;">Trạng Thái</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml}
                </tbody>
            </table>

            <div class="footer">
                <div>........., Ngày ..... tháng ..... năm 202...</div>
                <div style="font-weight: bold; margin-top: 10px; margin-right: 40px;">Người báo cáo</div>
                <div class="signature-space"></div>
                <div style="font-style: italic; color: #888; margin-right: 25px;">(Ký và ghi rõ họ tên)</div>
            </div>
        </body>
        </html>
    `);
    printWindow.document.close();
}

// ==========================================
// RECEPTIONIST DASHBOARD LOGIC
// ==========================================

// Load receptionist appointments
async function loadReceptionAppointments() {
    const listContainer = document.getElementById('reception-appointments-list');
    if (listContainer) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px;">
                    <i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách lịch khám...
                </td>
            </tr>
        `;
    }

    try {
        const response = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            logout();
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to load receptionist appointments');
        }

        const data = await response.json();
        window.allReceptionAppointments = data;
        
        // Calculate statistics
        let totalCount = data.length;
        let requestedCount = data.filter(a => a.status === 'Requested' || a.status === 'Pending').length;
        let confirmedCount = data.filter(a => a.status === 'Confirmed').length;
        let checkedInCount = data.filter(a => a.status === 'CheckedIn').length;

        const statTotal = document.getElementById('reception-stat-total');
        const statRequested = document.getElementById('reception-stat-requested');
        const statConfirmed = document.getElementById('reception-stat-confirmed');
        const statCheckedIn = document.getElementById('reception-stat-checkedin');

        if (statTotal) statTotal.innerText = totalCount;
        if (statRequested) statRequested.innerText = requestedCount;
        if (statConfirmed) statConfirmed.innerText = confirmedCount;
        if (statCheckedIn) statCheckedIn.innerText = checkedInCount;

        if (listContainer) {
            filterReceptionAppointments();
        }
        loadTodayAppointments();
    } catch (error) {
        console.error('Error loading receptionist appointments:', error);
        if (listContainer) {
            listContainer.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; padding: 20px; color: var(--danger);">
                        <i class="fa-solid fa-circle-exclamation"></i> Không thể tải dữ liệu cuộc hẹn.
                    </td>
                </tr>
            `;
        }
    }
}

// Filter and render receptionist appointments
function filterReceptionAppointments() {
    const listContainer = document.getElementById('reception-appointments-list');
    if (!listContainer || !window.allReceptionAppointments) return;

    const searchVal = (document.getElementById('reception-search')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('reception-status-filter')?.value || '';

    const filtered = window.allReceptionAppointments.filter(app => {
        // Status filter
        if (statusVal && app.status !== statusVal) {
            return false;
        }

        // Search text filter
        if (searchVal) {
            const patientName = (app.patientName || '').toLowerCase();
            const doctorName = (app.doctorName || '').toLowerCase();
            const patientPhone = (app.patientPhone || '').toLowerCase();
            const patientNationalId = (app.patientNationalId || '').toLowerCase();
            const symptoms = (app.symptoms || '').toLowerCase();

            if (!patientName.includes(searchVal) && 
                !doctorName.includes(searchVal) && 
                !patientPhone.includes(searchVal) && 
                !patientNationalId.includes(searchVal) &&
                !symptoms.includes(searchVal)) {
                return false;
            }
        }

        return true;
    });

    if (filtered.length === 0) {
        listContainer.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #888;">
                    Không tìm thấy lịch khám phù hợp.
                </td>
            </tr>
        `;
        return;
    }

    let html = '';
    filtered.forEach(app => {
        const appId = app.appointmentId || app.id;
        const appDate = new Date(app.appointmentDate).toLocaleDateString('vi-VN', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
        const slotText = app.timeSlot || '—';
        const branchName = getLocalizedBranchName(app.hospitalBranch);
        const statusText = translateStatus(app.status);
        
        let statusClass = 'status-pending';
        if (app.status === 'Confirmed') statusClass = 'status-confirmed';
        else if (app.status === 'CheckedIn') statusClass = 'status-checkedin';
        else if (app.status === 'Completed') statusClass = 'status-completed';
        else if (app.status === 'Cancelled') statusClass = 'status-cancelled';

        // Format detailed patient info
        const dobText = app.patientDateOfBirth ? new Date(app.patientDateOfBirth).toLocaleDateString('vi-VN') : '—';
        const genderText = app.patientGender === 'Male' ? 'Nam' : (app.patientGender === 'Female' ? 'Nữ' : 'Khác');
        
        // Parse relative booking if any
        let patientDisplayHtml = `
            <div style="font-weight: 600; color: var(--text-dark);">${app.patientName || '—'}</div>
            <div style="font-size: 12px; color: #666; margin-top: 4px;">
                <span>NS: ${dobText}</span> | <span>GT: ${genderText}</span><br>
                <span>SĐT: ${app.patientPhone || '—'}</span> | <span>CCCD: ${app.patientNationalId || 'Chưa cập nhật'}</span><br>
                <span>Đ/C: ${app.patientAddress || '—'}</span>
            </div>
        `;

        let symptomsHtml = app.symptoms || '<i>Không mô tả</i>';
        const relativeRegex = /\[Đặt cho người thân:\s*([^\s|].*?)\s*\|\s*SĐT:\s*(.*?)\s*\|\s*Mối quan hệ:\s*(.*?)\s*\|\s*Năm sinh:\s*(.*?)\s*\|\s*Giới tính:\s*([^\]]*?)\]/;
        const relMatch = symptomsHtml.match(relativeRegex);
        if (relMatch) {
            const [fullMatch, relName, relPhone, relRelation, relDob, relGender] = relMatch;
            symptomsHtml = symptomsHtml.replace(fullMatch, '').trim();
            if (!symptomsHtml) symptomsHtml = '<i>Không mô tả</i>';
            
            patientDisplayHtml = `
                <div style="font-weight: 600; color: var(--text-dark);">${relName} <span class="badge" style="background: hsl(270, 85%, 93%); color: hsl(270, 85%, 40%); font-size: 10px; padding: 2px 6px; border-radius: 4px;">Người thân (${relRelation})</span></div>
                <div style="font-size: 12px; color: #666; margin-top: 4px;">
                    <span>NS/Năm sinh: ${relDob}</span> | <span>GT: ${relGender}</span><br>
                    <span>SĐT: ${relPhone}</span><br>
                    <span style="font-style: italic; font-size: 11px; color: #888;">Đặt bởi: ${app.patientName} (${app.patientPhone || '—'})</span>
                </div>
            `;
        }

        // Package booking badge
        const pkgRegex = /\[Gói khám:\s*([^|]*?)(?:\|Cơ sở:\s*([^\]]*?))?\]/;
        const pkgMatch = symptomsHtml.match(pkgRegex);
        let packageBadge = '';
        if (pkgMatch) {
            const [fullMatch, pkgName] = pkgMatch;
            symptomsHtml = symptomsHtml.replace(fullMatch, '').trim();
            packageBadge = `
                <div style="margin-top: 4px;">
                    <span class="badge" style="background: hsl(150, 80%, 93%); color: hsl(150, 80%, 30%); font-weight: 600; font-size: 11px; padding: 2px 6px; border-radius: 4px; display: inline-flex; align-items: center; gap: 4px;">
                        <i class="fa-solid fa-box-tissue"></i> ${pkgName}
                    </span>
                </div>
            `;
        }

        // Action buttons
        let actionsHtml = '';
        if (app.status === 'Requested' || app.status === 'Pending') {
            actionsHtml = `
                <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
                    <button class="btn btn-primary btn-sm" onclick="confirmReceptionAppointment('${appId}')" style="background-color: var(--success); border-color: var(--success); padding: 4px 8px; font-size: 12px;">
                        <i class="fa-solid fa-check"></i> Xác nhận
                    </button>
                    <button class="btn btn-sm" onclick="cancelReceptionAppointment('${appId}')" style="background-color: var(--danger); color: white; border-color: var(--danger); padding: 4px 8px; font-size: 12px;">
                        <i class="fa-solid fa-xmark"></i> Hủy
                    </button>
                </div>
            `;
        } else if (app.status === 'Confirmed') {
            actionsHtml = `
                <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: center;">
                    <button class="btn btn-primary btn-sm" onclick="checkinReceptionAppointment('${appId}')" style="background-color: var(--primary); border-color: var(--primary); padding: 4px 8px; font-size: 12px;">
                        <i class="fa-solid fa-id-card"></i> Tiếp đón
                    </button>
                    <button class="btn btn-sm" onclick="cancelReceptionAppointment('${appId}')" style="background-color: var(--danger); color: white; border-color: var(--danger); padding: 4px 8px; font-size: 12px;">
                        <i class="fa-solid fa-xmark"></i> Hủy
                    </button>
                </div>
            `;
        } else {
            actionsHtml = `<span style="font-size: 12px; color: #888; font-style: italic;">Không có thao tác</span>`;
        }

        html += `
            <tr>
                <td style="font-weight: 600; color: var(--primary); vertical-align: top;">#${appId}</td>
                <td style="vertical-align: top;">${patientDisplayHtml}</td>
                <td style="vertical-align: top;">
                    <div style="font-weight: 500;">BS. ${app.doctorName || '—'}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;">Cơ sở: ${branchName}</div>
                </td>
                <td style="vertical-align: top;">
                    <div style="font-weight: 500;">${appDate}</div>
                    <div style="font-size: 12px; color: #666; margin-top: 2px;"><i class="fa-regular fa-clock"></i> Ca khám: ${slotText}</div>
                </td>
                <td style="vertical-align: top;">
                    <span class="status-badge ${statusClass}">${statusText}</span>
                    ${packageBadge}
                    <div style="font-size: 12px; color: #666; margin-top: 6px; font-style: italic; max-width: 200px; word-wrap: break-word;">
                        Lý do: ${symptomsHtml}
                    </div>
                </td>
                <td style="vertical-align: top; text-align: center;">${actionsHtml}</td>
            </tr>
        `;
    });

    listContainer.innerHTML = html;
}

// Handle receptionist status update api call
async function updateReceptionistStatus(appId, status) {
    try {
        const response = await fetch(`${API_BASE}/appointments/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: status })
        });

        const data = await response.json();

        if (response.ok) {
            showToast(`Lịch khám đã được chuyển sang: ${translateStatus(status)}`, 'success');
            loadReceptionAppointments();
        } else {
            showToast(data.message || 'Cập nhật trạng thái thất bại.', 'error');
        }
    } catch (error) {
        showToast('Không thể kết nối đến máy chủ.', 'error');
    }
}

function confirmReceptionAppointment(appId) {
    updateReceptionistStatus(appId, 'Confirmed');
}

function checkinReceptionAppointment(appId) {
    // If we're clicking directly from the list, we can retrieve/find the app and show checkin panel
    if (window.allReceptionAppointments) {
        const app = window.allReceptionAppointments.find(a => (a.appointmentId || a.id) == appId);
        if (app) {
            showAppointmentInReceptionPanel(app);
            return;
        }
    }
    updateReceptionistStatus(appId, 'CheckedIn');
}

function cancelReceptionAppointment(appId) {
    if (confirm('Bạn có chắc chắn muốn hủy lịch hẹn này?')) {
        updateReceptionistStatus(appId, 'Cancelled');
    }
}

// Map doctor specialty to exam room
function mapSpecialtyToRoom(specialty) {
    if (!specialty) return 'Phòng Khám Đa Khoa (Phòng 101)';
    const specLower = specialty.toLowerCase();
    if (specLower.includes('nội')) return 'Phòng Khám Nội Tổng Quát (Phòng 102)';
    if (specLower.includes('ngoại')) return 'Phòng Khám Ngoại Khoa (Phòng 103)';
    if (specLower.includes('nhi')) return 'Phòng Khám Nhi Khoa (Phòng 104)';
    if (specLower.includes('sản') || specLower.includes('phụ')) return 'Phòng Sản Phụ Khoa (Phòng 105)';
    if (specLower.includes('tai') || specLower.includes('mũi') || specLower.includes('họng')) return 'Phòng Tai Mũi Họng (Phòng 106)';
    if (specLower.includes('răng') || specLower.includes('hàm') || specLower.includes('mặt')) return 'Phòng Răng Hàm Mặt (Phòng 107)';
    if (specLower.includes('mắt')) return 'Phòng Khám Mắt (Phòng 108)';
    if (specLower.includes('da') || specLower.includes('liễu')) return 'Phòng Khám Da Liễu (Phòng 109)';
    if (specLower.includes('tim') || specLower.includes('mạch')) return 'Phòng Khám Tim Mạch (Phòng 110)';
    return `Phòng Chuyên Khoa ${specialty} (Phòng 111)`;
}

// Get patient type details (fee, display name)
function getPatientTypeDetails(objOrType) {
    if (typeof objOrType === 'string') {
        if (objOrType === 'VIP') {
            return { name: 'Khám Dịch Vụ VIP', fee: 300000, feeStr: '300.000đ' };
        } else if (objOrType === 'BHYT' || objOrType === 'Insurance') {
            return { name: 'Bảo hiểm y tế (BHYT)', fee: 0, feeStr: '0đ (Miễn phí/BHYT chi trả)' };
        } else {
            return { name: 'Dịch vụ thường (Standard)', fee: 150000, feeStr: '150.000đ' };
        }
    }

    const app = objOrType || {};
    const patientType = app.patientType || app.PatientType || 'Service';
    const serviceTier = app.serviceTier || app.ServiceTier || 'Standard';
    const isPriority = app.isPriority || app.IsPriority || false;

    let fee = 150000;
    let feeStr = '150.000đ';
    let name = 'Dịch vụ thường';

    if (serviceTier === 'VIP') {
        fee = 300000;
        feeStr = '300.000đ';
        name = 'Dịch vụ VIP';
    } else if (patientType === 'Insurance' || patientType === 'BHYT') {
        fee = 0;
        feeStr = '0đ (Miễn phí/BHYT chi trả)';
        name = 'Bảo hiểm y tế (BHYT)';
    }

    if (isPriority) {
        name += ' (Ưu tiên y tế)';
    }

    return { name, fee, feeStr };
}

// Lookup by phone or national ID
async function lookupByPhoneOrNationalId() {
    const inputVal = document.getElementById('reception-search-input').value.trim();
    if (!inputVal) {
        showToast('Vui lòng nhập thông tin tìm kiếm!', 'warning');
        return;
    }

    const searchType = document.querySelector('input[name="reception-search-type"]:checked')?.value || 'phone';
    showToast('Đang tra cứu lịch khám...', 'info');

    try {
        const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            showToast('Không thể lấy danh sách lịch khám từ hệ thống.', 'error');
            return;
        }
        
        const appointments = await res.json();
        const query = inputVal.toLowerCase();
        
        const filtered = appointments.filter(app => {
            if (searchType === 'phone') {
                const phone = (app.patientPhone || app.PatientPhone || '').toLowerCase();
                return phone.includes(query);
            } else {
                const cccd = (app.patientNationalId || app.PatientNationalId || '').toLowerCase();
                return cccd.includes(query);
            }
        });

        const resultsContainer = document.getElementById('reception-search-results');
        const listEl = document.getElementById('reception-search-list');
        
        if (!resultsContainer || !listEl) return;

        resultsContainer.style.display = 'block';
        listEl.innerHTML = '';

        if (filtered.length === 0) {
            listEl.innerHTML = `
                <div style="text-align:center; padding:15px; color:#888; font-size:13px;">
                    Không tìm thấy lịch khám nào khớp với thông tin tra cứu.
                </div>
            `;
            return;
        }

        filtered.forEach(app => {
            const appId = app.appointmentId || app.id || app.AppointmentId || app.Id;
            const dateStr = new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString('vi-VN');
            const statusClass = `status-${(app.status || app.Status).toLowerCase()}`;
            const statusText = translateStatus(app.status || app.Status);

            const div = document.createElement('div');
            div.style = 'background: rgba(255,255,255,0.7); border: 1px solid var(--border-color); border-radius: 10px; padding: 12px; margin-bottom: 8px; display: flex; justify-content: space-between; align-items: center; gap: 10px; cursor: pointer;';
            div.onclick = () => selectReceptionAppointment(appId);
            div.innerHTML = `
                <div>
                    <div style="font-weight:700; color:var(--dark); font-size:13.5px;">
                        #${appId} - ${(app.patientName || app.PatientName || 'N/A').toUpperCase()}
                    </div>
                    <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                        Bác sĩ: BS. ${app.doctorName || app.DoctorName || 'Chưa chỉ định'} | Ngày: ${dateStr}
                    </div>
                    <div style="font-size:11.5px; color:var(--text-muted); margin-top:1px;">
                        Số điện thoại: ${app.patientPhone || app.PatientPhone || 'N/A'} | CCCD: ${app.patientNationalId || app.PatientNationalId || 'Chưa cập nhật'}
                    </div>
                </div>
                <div style="display:flex; align-items:center; gap:8px;">
                    <span class="status-badge ${statusClass}" style="font-size:11px; padding:2px 8px;">${statusText}</span>
                    <button class="btn btn-primary btn-sm" style="padding: 4px 10px; font-size: 11.5px; font-weight:700;">Chọn</button>
                </div>
            `;
            listEl.appendChild(div);
        });

    } catch (e) {
        console.error("Error searching appointments:", e);
        showToast('Đã xảy ra lỗi khi tìm kiếm.', 'error');
    }
}

// Global helper for selection
async function selectReceptionAppointment(appId) {
    if (window.allReceptionAppointments) {
        const app = window.allReceptionAppointments.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appId);
        if (app) {
            showAppointmentInReceptionPanel(app);
            return;
        }
    }
    // Fallback: fetch again or search
    try {
        const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const appointments = await res.json();
        const app = appointments.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appId);
        if (app) {
            showAppointmentInReceptionPanel(app);
        } else {
            showToast('Không tìm thấy thông tin chi tiết cuộc hẹn.', 'error');
        }
    } catch (e) {
        showToast('Lỗi tải cuộc hẹn.', 'error');
    }
}

// Lookup by QR Code direct entry
async function lookupByQrCode() {
    const rawVal = document.getElementById('reception-qr-direct-input').value.trim();
    if (!rawVal) {
        showToast('Vui lòng nhập mã hoặc quét QR code!', 'warning');
        return;
    }
    
    const match = rawVal.match(/\d+$/);
    const appointmentId = match ? parseInt(match[0]) : null;
    
    if (!appointmentId) {
        showToast('Mã lịch khám không hợp lệ!', 'error');
        return;
    }
    
    showToast('Đang tìm kiếm lịch khám...', 'info');
    
    try {
        const res = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!res.ok) {
            showToast('Không thể lấy danh sách lịch khám từ hệ thống.', 'error');
            return;
        }
        
        const appointments = await res.json();
        const app = appointments.find(a => (a.appointmentId || a.id || a.AppointmentId || a.Id) == appointmentId);
        
        if (!app) {
            showToast(`Không tìm thấy lịch khám #${appointmentId} trong hệ thống!`, 'error');
            return;
        }
        
        showAppointmentInReceptionPanel(app);
    } catch (e) {
        console.error("Error looking up appointment:", e);
        showToast('Đã xảy ra lỗi khi tìm kiếm lịch khám.', 'error');
    }
}

// Show appointment in Reception Check-in Panel
function showAppointmentInReceptionPanel(app) {
    window.currentReceptionApp = app;
    
    const appId = app.appointmentId || app.id || app.AppointmentId || app.Id;
    document.getElementById('rcp-appointment-id').value = appId;
    
    document.getElementById('rcp-patient-name').innerText = app.patientName || app.PatientName || 'N/A';
    
    const dobStr = app.patientDob || app.PatientDob || app.patientDateOfBirth || app.PatientDateOfBirth ? new Date(app.patientDob || app.PatientDob || app.patientDateOfBirth || app.PatientDateOfBirth).toLocaleDateString('vi-VN') : 'N/A';
    const phone = app.patientPhone || app.PatientPhone || 'N/A';
    document.getElementById('rcp-patient-meta').innerText = `SĐT: ${phone}  |  NS: ${dobStr}`;
    
    const gender = (app.patientGender || app.PatientGender) === 'Male' ? 'Nam' : ((app.patientGender || app.PatientGender) === 'Female' ? 'Nữ' : 'Khác');
    document.getElementById('rcp-patient-gender').innerText = gender;
    
    document.getElementById('rcp-patient-blood').innerText = app.patientBloodType || app.PatientBloodType || 'Chưa cập nhật';
    document.getElementById('rcp-patient-cccd').innerText = app.patientNationalId || app.PatientNationalId || 'Chưa cập nhật';
    document.getElementById('rcp-patient-insurance').innerText = app.patientInsurance || app.PatientInsurance || 'Chưa cập nhật';
    
    document.getElementById('rcp-doctor-name').innerText = app.doctorName || app.DoctorName || 'Chưa chỉ định';
    
    const dateStr = new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString('vi-VN');
    const timeSlot = app.timeSlot || app.TimeSlot || 'N/A';
    document.getElementById('rcp-time-slot').innerText = timeSlot;
    document.getElementById('rcp-appt-date').innerText = dateStr;
    
    document.getElementById('rcp-branch').innerText = getLocalizedBranchName(app.hospitalBranch || app.HospitalBranch) || 'Hệ thống CareConnect';
    
    const statusText = translateStatus(app.status || app.Status);
    const statusClass = `status-${(app.status || app.Status).toLowerCase()}`;
    const statusBadge = document.getElementById('rcp-status-badge');
    if (statusBadge) {
        statusBadge.innerText = statusText;
        statusBadge.className = `status-badge ${statusClass}`;
    }
    
    document.getElementById('rcp-symptoms-text').innerText = app.symptoms || app.Symptoms || '(Không có triệu chứng ghi chú)';
    
    // Assign Room and Queue
    const doctor = (window.allDoctors || []).find(d => d.userId === (app.doctorId || app.DoctorId));
    const specialty = doctor ? (doctor.specialization || doctor.specialty) : '';
    const roomName = mapSpecialtyToRoom(specialty);
    const randNum = Math.floor(Math.random() * 200) + 1;
    
    let prefix = 'CC';
    if (app.isPriority || app.IsPriority) {
        prefix = 'PRI';
    } else if ((app.serviceTier || app.ServiceTier) === 'VIP') {
        prefix = 'VIP';
    }
    const queueStr = `${prefix}-${String(randNum).padStart(3, '0')}`;
    
    window.currentReceptionApp.assignedRoom = roomName;
    window.currentReceptionApp.assignedQueue = queueStr;
    
    document.getElementById('rcp-assigned-room').innerText = roomName;
    document.getElementById('rcp-assigned-queue').innerText = queueStr;
    
    // Fee details
    const typeDetails = getPatientTypeDetails(app);
    document.getElementById('rcp-fee-amount').innerText = typeDetails.feeStr;
    window.currentReceptionApp.calculatedFee = typeDetails.fee;
    
    const badge = document.getElementById('rcp-patient-type-badge');
    if (badge) {
        const isPriority = app.isPriority || app.IsPriority || false;
        const serviceTier = app.serviceTier || app.ServiceTier || 'Standard';
        const patientType = app.patientType || app.PatientType || 'Service';

        if (isPriority) {
            badge.innerText = `♿ Ưu tiên (${app.priorityReason || app.PriorityReason || 'Đối tượng ưu tiên y tế'})`;
            badge.style.background = 'rgba(220, 53, 69, 0.15)';
            badge.style.color = '#dc3545';
        } else if (serviceTier === 'VIP') {
            badge.innerText = '👑 Dịch vụ VIP';
            badge.style.background = 'rgba(255, 193, 7, 0.15)';
            badge.style.color = '#ffc107';
        } else if (patientType === 'Insurance' || patientType === 'BHYT') {
            badge.innerText = '📋 Khám BHYT';
            badge.style.background = 'rgba(40, 167, 69, 0.15)';
            badge.style.color = '#28a745';
        } else {
            badge.innerText = '🏥 Dịch vụ thường';
            badge.style.background = 'rgba(0, 123, 255, 0.15)';
            badge.style.color = '#007bff';
        }
    }
    
    // Reset checklists and vitals inputs
    document.getElementById('rcp-verify-documents').checked = false;
    document.getElementById('rcp-verify-payment').checked = false;
    
    const payDetailsContainer = document.getElementById('rcp-payment-details-container');
    if (payDetailsContainer) payDetailsContainer.style.display = 'none';
    const payMethodSel = document.getElementById('rcp-payment-method');
    if (payMethodSel) payMethodSel.value = 'Tiền mặt';
    const payTxInput = document.getElementById('rcp-payment-tx-id');
    if (payTxInput) payTxInput.value = '';

    document.getElementById('rcp-vitals-bp').value = '';
    document.getElementById('rcp-vitals-temp').value = '';
    document.getElementById('rcp-vitals-weight').value = '';
    document.getElementById('rcp-vitals-hr').value = '';
    document.getElementById('rcp-issue-booklet').checked = true;
    
    // Hide success step initially
    document.getElementById('rcp-success-area').style.display = 'none';
    document.getElementById('rcp-btn-confirm').parentElement.style.display = 'flex';
    
    // Show Check-in Panel
    const checkinPanel = document.getElementById('reception-checkin-panel');
    if (checkinPanel) {
        checkinPanel.style.display = 'block';
        checkinPanel.scrollIntoView({ behavior: 'smooth' });
    }

    // Attach event listener for fee checkbox to toggle payment details
    const rcpPaymentCheckbox = document.getElementById('rcp-verify-payment');
    if (rcpPaymentCheckbox && !rcpPaymentCheckbox.dataset.listenerAttached) {
        rcpPaymentCheckbox.dataset.listenerAttached = 'true';
        rcpPaymentCheckbox.addEventListener('change', function() {
            const container = document.getElementById('rcp-payment-details-container');
            if (container) {
                container.style.display = this.checked ? 'flex' : 'none';
            }
        });
    }
}

// Confirm Receptionist Check-in
async function confirmReceptionCheckin() {
    const app = window.currentReceptionApp;
    if (!app) {
        showToast('Không có thông tin lịch khám đang tiếp nhận!', 'error');
        return;
    }
    
    // Administrative Verification check
    if (!document.getElementById('rcp-verify-documents').checked) {
        showToast('Vui lòng đối chiếu thông tin khớp với CCCD/Thẻ BHYT của bệnh nhân!', 'warning');
        return;
    }
    
    // Fee Payment Verification check
    if (app.calculatedFee > 0 && !document.getElementById('rcp-verify-payment').checked) {
        showToast('Vui lòng xác nhận đã thu phí khám bệnh tại quầy tiếp đón!', 'warning');
        return;
    }
    
    // Vitals values
    const bp = document.getElementById('rcp-vitals-bp').value.trim();
    const temp = document.getElementById('rcp-vitals-temp').value.trim();
    const weight = document.getElementById('rcp-vitals-weight').value.trim();
    const hr = document.getElementById('rcp-vitals-hr').value.trim();
    
    const payMethod = document.getElementById('rcp-payment-method')?.value || 'Tiền mặt';
    const payTxId = document.getElementById('rcp-payment-tx-id')?.value.trim() || '';

    const appId = app.appointmentId || app.id || app.AppointmentId || app.Id;
    
    showToast('Đang tiến hành check-in...', 'info');
    
    try {
        const response = await fetch(`${API_BASE}/appointments/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ 
                status: 'CheckedIn',
                bloodPressure: bp || null,
                temperature: temp || null,
                weight: weight || null,
                heartRate: hr || null,
                paymentMethod: document.getElementById('rcp-verify-payment')?.checked ? payMethod : null,
                paymentTransactionId: document.getElementById('rcp-verify-payment')?.checked ? payTxId : null
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showToast(data.message || 'Check-in thất bại.', 'error');
            return;
        }
        
        showToast('Check-in tiếp đón thành công!', 'success');
        
        const dateStr = new Date(app.appointmentDate || app.AppointmentDate).toLocaleDateString('vi-VN');
        const timeSlot = app.timeSlot || app.TimeSlot || '';
        
// Vitals already read above
        const bookletChecked = document.getElementById('rcp-issue-booklet')?.checked;
        
        let vitalsParts = [];
        if (bp) vitalsParts.push(`HA: ${bp} mmHg`);
        if (temp) vitalsParts.push(`T: ${temp}°C`);
        if (weight) vitalsParts.push(`CN: ${weight} kg`);
        if (hr) vitalsParts.push(`NT: ${hr} bpm`);
        const vitalsStr = vitalsParts.length > 0 ? vitalsParts.join(' | ') : 'Chưa đo';
        
        // Render detailed receipt
        document.getElementById('rcp-printable-ticket').innerHTML = `
            <div style="text-align:center;margin-bottom:14px;">
                <div style="font-size:24px;color:var(--primary);"><i class="fa-solid fa-hospital-user"></i></div>
                <div style="font-weight:900;font-size:16px;color:var(--dark);margin-top:4px;">PHIẾU TIẾP ĐÓN BỆNH NHÂN</div>
                <div style="font-size:11px;color:var(--text-muted);font-weight:600;" id="rcp-ticket-branch">${getLocalizedBranchName(app.hospitalBranch || app.HospitalBranch) || 'CareConnect'}</div>
                <hr style="border:1px dashed var(--border-color);margin:10px 0 12px;">
            </div>
            
            <div style="text-align:center; margin-bottom:16px; background:rgba(32,201,151,.08); padding:10px; border-radius:8px;">
                <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); letter-spacing:.5px; font-weight:700;">Số thứ tự khám</div>
                <div style="font-size:32px; font-weight:900; color:var(--success); margin:4px 0;">${app.assignedQueue || 'CC-001'}</div>
                <div style="font-size:11px; font-weight:700; color:var(--primary);">${(app.assignedRoom || 'PHÒNG KHÁM ĐA KHOA').toUpperCase()}</div>
            </div>
            
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Mã lịch hẹn:</td><td style="font-weight:700;text-align:right;color:var(--primary);" id="rcp-ticket-app-id">#${appId}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Bệnh nhân:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-patient">${(app.patientName || app.PatientName || '').toUpperCase()}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Đối tượng:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-type">${getPatientTypeDetails(app.patientType || app.PatientType).name}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Bác sĩ:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-doctor">BS. ${app.doctorName || app.DoctorName || 'Chưa chỉ định'}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Ngày khám:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-date">${dateStr}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Ca khám:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-time">${timeSlot}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Sinh hiệu:</td><td style="font-weight:700;text-align:right;color:var(--success);font-size:11px;">${vitalsStr}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Sổ khám bệnh:</td><td style="font-weight:700;text-align:right;">${bookletChecked ? 'Cấp sổ mới' : 'Đã có sổ'}</td></tr>
            </table>
            
            <hr style="border:1px dashed var(--border-color);margin:12px 0 8px;">
            <div style="font-size:10px;color:var(--text-muted);text-align:center;font-style:italic;">Phiếu xác nhận check-in · Vui lòng giữ phiếu này</div>
        `;
        
        // Hide confirm button group & show success area
        document.getElementById('rcp-btn-confirm').parentElement.style.display = 'none';
        document.getElementById('rcp-success-area').style.display = 'block';
        
        // Update status badge
        const badgeEl = document.getElementById('rcp-status-badge');
        if (badgeEl) {
            badgeEl.innerText = translateStatus('CheckedIn');
            badgeEl.className = 'status-badge status-checkedin';
        }
        
        // Reload all reception records and today's appointments
        loadReceptionAppointments();
    } catch (e) {
        console.error("Error confirming receptionist check-in:", e);
        showToast('Đã xảy ra lỗi khi hoàn tất check-in.', 'error');
    }
}

// Print Reception ticket
function printReceptionTicket() {
    const ticketDiv = document.getElementById('rcp-printable-ticket');
    if (!ticketDiv) return;
    
    const printWindow = window.open('', '_blank', 'width=450,height=600,resizable=yes,scrollbars=yes');
    if (!printWindow) {
        showToast('Vui lòng cho phép popup để in phiếu khám bệnh!', 'warning');
        return;
    }
    
    const ticketHtml = ticketDiv.innerHTML;
    
    printWindow.document.write(`
        <html>
        <head>
            <title>Phiếu Tiếp Đón - CareConnect</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    padding: 30px;
                    margin: 0;
                    background-color: #ffffff;
                    color: #333;
                }
                #ticket {
                    max-width: 380px;
                    margin: 0 auto;
                    border: 1px solid #ddd;
                    padding: 24px;
                    border-radius: 12px;
                    box-shadow: 0 4px 10px rgba(0,0,0,0.05);
                }
                table {
                    width: 100%;
                    font-size: 13px;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                tr {
                    border-bottom: 1px solid #f0f0f0;
                }
                td {
                    padding: 8px 0;
                }
                hr {
                    border: none;
                    border-top: 1px dashed #ccc;
                    margin: 16px 0;
                }
                @media print {
                    body { padding: 0; background: none; }
                    #ticket { border: none; box-shadow: none; max-width: 100%; padding: 0; }
                }
            </style>
        </head>
        <body>
            <div id="ticket">
                \${ticketHtml}
            </div>
            <script>
                window.onload = function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                };
            </script>
        </body>
        </html>
    `);
    
    printWindow.document.close();
}

// Reset Reception Check-in Panel
function resetReceptionPanel() {
    window.currentReceptionApp = null;
    document.getElementById('rcp-appointment-id').value = '';
    document.getElementById('reception-qr-direct-input').value = '';
    document.getElementById('reception-search-input').value = '';
    
    const resultsContainer = document.getElementById('reception-search-results');
    if (resultsContainer) resultsContainer.style.display = 'none';
    
    const checkinPanel = document.getElementById('reception-checkin-panel');
    if (checkinPanel) checkinPanel.style.display = 'none';
    
    // Clear vitals inputs
    document.getElementById('rcp-vitals-bp').value = '';
    document.getElementById('rcp-vitals-temp').value = '';
    document.getElementById('rcp-vitals-weight').value = '';
    document.getElementById('rcp-vitals-hr').value = '';
    
    document.getElementById('rcp-verify-documents').checked = false;
    document.getElementById('rcp-verify-payment').checked = false;
    document.getElementById('rcp-issue-booklet').checked = true;
    
    document.getElementById('rcp-success-area').style.display = 'none';
    document.getElementById('rcp-btn-confirm').parentElement.style.display = 'flex';
}

// ============================================
//  RECEPTION DESK WALK-IN BOOKING LOGIC
// ============================================
async function openWalkInModal() {
    const selectEl = document.getElementById('walk-in-patient-select');
    if (selectEl) {
        selectEl.innerHTML = '<option value="" disabled selected>Đang tải danh sách bệnh nhân...</option>';
    }
    document.getElementById('walk-in-form').reset();
    document.getElementById('walk-in-modal').style.display = 'flex';
    toggleWalkInPatientFields();
    
    // Set default fee display
    onWalkInNewPatientTypeChange('Service');
    
    // Fetch existing patients
    try {
        const response = await fetch(`${API_BASE}/admin/patients`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
            window.walkInPatients = await response.json();
            populateWalkInPatients(window.walkInPatients);
        } else {
            console.error("Failed to load patients");
            if (selectEl) selectEl.innerHTML = '<option value="" disabled selected>Lỗi tải danh sách bệnh nhân</option>';
        }
    } catch (e) {
        console.error("Error loading patients for walk-in", e);
        if (selectEl) selectEl.innerHTML = '<option value="" disabled selected>Lỗi kết nối máy chủ</option>';
    }

    // Initialize branch/specialty/doctor dropdowns
    onWalkInBranchChange();
}

function closeWalkInModal() {
    document.getElementById('walk-in-modal').style.display = 'none';
}

function populateWalkInPatients(list) {
    const selectEl = document.getElementById('walk-in-patient-select');
    if (!selectEl) return;
    let html = '<option value="" disabled selected>-- Chọn bệnh nhân từ kết quả tìm kiếm --</option>';
    list.forEach(p => {
        html += `<option value="${p.userId}">${p.fullName} (${p.phoneNumber || 'Không có SĐT'} - ${p.email})</option>`;
    });
    selectEl.innerHTML = html;
}

function filterWalkInPatients() {
    const query = document.getElementById('walk-in-search-patient').value.toLowerCase().trim();
    if (!window.walkInPatients) return;
    
    const filtered = window.walkInPatients.filter(p => 
        p.fullName.toLowerCase().includes(query) || 
        (p.phoneNumber && p.phoneNumber.includes(query)) ||
        p.email.toLowerCase().includes(query)
    );
    populateWalkInPatients(filtered);
}

function toggleWalkInPatientFields() {
    const isExisting = document.getElementById('walk-in-type-existing').checked;
    const existingContainer = document.getElementById('walk-in-existing-container');
    const newContainer = document.getElementById('walk-in-new-container');
    
    const patientSelect = document.getElementById('walk-in-patient-select');
    const newName = document.getElementById('walk-in-new-name');
    const newEmail = document.getElementById('walk-in-new-email');
    const newPhone = document.getElementById('walk-in-new-phone');
    const newDob = document.getElementById('walk-in-new-dob');
    const newNationalId = document.getElementById('walk-in-new-nationalid');
    const newAddress = document.getElementById('walk-in-new-address');

    if (isExisting) {
        existingContainer.style.display = 'flex';
        newContainer.style.display = 'none';
        patientSelect.required = true;
        
        newName.required = false;
        newName.value = '';
        newEmail.required = false;
        newEmail.value = '';
        newPhone.required = false;
        newPhone.value = '';
        newDob.required = false;
        newDob.value = '';
        newNationalId.required = false;
        newNationalId.value = '';
        newAddress.required = false;
        newAddress.value = '';
    } else {
        existingContainer.style.display = 'none';
        newContainer.style.display = 'flex';
        patientSelect.required = false;

        newName.required = true;
        newEmail.required = true;
        newPhone.required = true;
        newDob.required = true;
        newNationalId.required = true;
        newAddress.required = true;
    }
}

function onWalkInNewPatientTypeChange(val) {
    updateWalkInCalculatedFee();
}

function updateWalkInCalculatedFee() {
    const display = document.getElementById('walk-in-fee-display');
    if (!display) return;

    const isExisting = document.getElementById('walk-in-type-existing').checked;
    let patientType = 'Service';
    let serviceTier = 'Standard';
    let isPriority = false;

    if (isExisting) {
        const selectEl = document.getElementById('walk-in-patient-select');
        if (selectEl) {
            const patientId = parseInt(selectEl.value);
            if (patientId) {
                const matchedPat = (window.walkInPatients || []).find(p => p.userId === patientId);
                if (matchedPat) {
                    patientType = matchedPat.patientType || 'Service';
                    serviceTier = matchedPat.serviceTier || 'Standard';
                    isPriority = matchedPat.isPriority || false;
                }
            }
        }
    } else {
        patientType = document.getElementById('walk-in-new-patienttype')?.value || 'Service';
        serviceTier = document.getElementById('walk-in-new-servicetier')?.value || 'Standard';
        isPriority = document.getElementById('walk-in-new-ispriority')?.checked || false;
    }

    let fee = 150000;
    if (serviceTier === 'VIP') {
        fee = 300000;
    } else if (patientType === 'Insurance' || patientType === 'BHYT') {
        fee = 80000;
    }

    display.innerText = fee.toLocaleString('vi-VN') + ' đ';
}

function onWalkInBranchChange() {
    onWalkInSpecialtyChange();
}

async function onWalkInSpecialtyChange() {
    const branch = document.getElementById('walk-in-branch').value;
    const specialty = document.getElementById('walk-in-specialty').value;
    const doctorSelect = document.getElementById('walk-in-doctor');
    const slotSelect = document.getElementById('walk-in-slot');
    
    if (!doctorSelect) return;
    
    if (slotSelect) {
        slotSelect.innerHTML = '<option value="" disabled selected>-- Chọn ca khám --</option>';
    }
    
    if (!specialty) {
        doctorSelect.innerHTML = '<option value="" disabled selected>-- Vui lòng chọn chuyên khoa trước --</option>';
        return;
    }
    
    doctorSelect.innerHTML = '<option value="" disabled selected>Đang tải danh sách bác sĩ...</option>';
    
    try {
        const response = await fetch(`${API_BASE}/auth/doctors`);
        if (response.ok) {
            const doctors = await response.json();
            // Lọc bác sĩ theo chuyên khoa và chi nhánh
            const filtered = doctors.filter(d => 
                (d.hospitalBranch === branch || !d.hospitalBranch) && 
                (d.specialization === specialty)
            );
            
            if (filtered.length === 0) {
                doctorSelect.innerHTML = '<option value="" disabled selected>Không có bác sĩ chuyên khoa này tại chi nhánh</option>';
                return;
            }
            
            let html = '<option value="" disabled selected>-- Chọn bác sĩ --</option>';
            filtered.forEach(d => {
                html += `<option value="${d.userId}">BS. ${d.fullName}</option>`;
            });
            doctorSelect.innerHTML = html;
        } else {
            doctorSelect.innerHTML = '<option value="" disabled selected>Lỗi tải bác sĩ</option>';
        }
    } catch (e) {
        console.error("Error filtering doctors for walkin", e);
        doctorSelect.innerHTML = '<option value="" disabled selected>Lỗi kết nối</option>';
    }
}

async function onWalkInDoctorChange() {
    const doctorId = document.getElementById('walk-in-doctor').value;
    const slotSelect = document.getElementById('walk-in-slot');
    if (!slotSelect || !doctorId) return;
    
    slotSelect.innerHTML = '<option value="" disabled selected>Đang tải ca khám...</option>';
    
    const todayStr = new Date().toISOString().split('T')[0];
    try {
        const response = await fetch(`${API_BASE}/schedule/doctor/${doctorId}/date/${todayStr}`);
        if (response.ok) {
            const slots = await response.json();
            if (slots.length === 0) {
                slotSelect.innerHTML = '<option value="" disabled selected>Hết ca trực trống hôm nay</option>';
                return;
            }
            let html = '<option value="" disabled selected>-- Chọn ca khám --</option>';
            slots.forEach(s => {
                html += `<option value="${s}">${s}</option>`;
            });
            slotSelect.innerHTML = html;
        } else {
            slotSelect.innerHTML = '<option value="" disabled selected>Lỗi tải ca khám</option>';
        }
    } catch (e) {
        console.error("Error loading doctor slots", e);
        slotSelect.innerHTML = '<option value="" disabled selected>Lỗi kết nối</option>';
    }
}

async function handleWalkInSubmit(e) {
    e.preventDefault();
    
    const isNew = document.getElementById('walk-in-type-new').checked;
    const btnSubmit = document.getElementById('btn-submit-walkin');
    
    // Kiểm tra đã xác nhận thanh toán chưa
    if (!document.getElementById('walk-in-pay-status').checked) {
        showToast("Vui lòng xác nhận đã thu phí khám bệnh tại quầy tiếp đón!", "warning");
        return;
    }
    
    btnSubmit.disabled = true;
    btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý tiếp nhận...';
    
    try {
        let patientId = null;
        let patientName = '';
        let patientType = 'Service';
        
        // Bước A: Xác định ID Bệnh nhân
        if (isNew) {
            // Đăng ký bệnh nhân mới
            const fullName = document.getElementById('walk-in-new-name').value.trim();
            const email = document.getElementById('walk-in-new-email').value.trim();
            const phone = document.getElementById('walk-in-new-phone').value.trim();
            const dob = document.getElementById('walk-in-new-dob').value;
            const gender = document.getElementById('walk-in-new-gender').value;
            const bloodType = document.getElementById('walk-in-new-bloodtype').value;
            const patientTypeVal = document.getElementById('walk-in-new-patienttype').value;
            const nationalId = document.getElementById('walk-in-new-nationalid').value.trim();
            const insurance = document.getElementById('walk-in-new-insurance').value.trim();
            const address = document.getElementById('walk-in-new-address').value.trim();
            
            const serviceTier = document.getElementById('walk-in-new-servicetier').value;
            const isPriority = document.getElementById('walk-in-new-ispriority').checked;
            const priorityReason = document.getElementById('walk-in-new-priorityreason').value.trim();

            const regPayload = {
                fullName,
                email,
                password: 'User123456@', // Mật khẩu mặc định hệ thống cấp
                role: 'Patient',
                phoneNumber: phone,
                dateOfBirth: dob,
                gender,
                bloodType,
                patientType: patientTypeVal,
                nationalId,
                insuranceCardNumber: insurance || null,
                address,
                serviceTier,
                isPriority,
                priorityReason: isPriority && priorityReason ? priorityReason : null
            };
            
            const regResponse = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(regPayload)
            });
            
            const regData = await regResponse.json();
            if (!regResponse.ok) {
                showToast(regData.message || "Lỗi khi đăng ký bệnh nhân mới.", "error");
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = '<i class="fa-solid fa-check-double"></i> Tiếp Nhận & Check-in';
                return;
            }
            
            patientId = regData.userId;
            patientName = fullName;
            patientType = patientTypeVal;
        } else {
            const selectEl = document.getElementById('walk-in-patient-select');
            patientId = parseInt(selectEl.value);
            const selectedOption = selectEl.options[selectEl.selectedIndex];
            patientName = selectedOption.text.split(' (')[0];
            
            const matchedPat = window.walkInPatients.find(p => p.userId === patientId);
            patientType = matchedPat ? matchedPat.patientType : 'Service';
        }
        
        if (!patientId) {
            showToast("Không tìm thấy thông tin bệnh nhân hợp lệ.", "error");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-check-double"></i> Tiếp Nhận & Check-in';
            return;
        }
        
        // Bước B: Tạo Lịch khám (Book Appointment)
        const doctorId = parseInt(document.getElementById('walk-in-doctor').value);
        const branch = document.getElementById('walk-in-branch').value;
        const specialty = document.getElementById('walk-in-specialty').value;
        const slot = document.getElementById('walk-in-slot').value;
        const symptoms = document.getElementById('walk-in-symptoms').value.trim() || 'Tiếp nhận trực tiếp vãng lai (Walk-in)';
        const todayStr = new Date().toISOString().split('T')[0];
        
        const matchedPat = isNew ? null : window.walkInPatients.find(p => p.userId === patientId);
        const serviceTier = isNew 
            ? document.getElementById('walk-in-new-servicetier').value 
            : (matchedPat ? matchedPat.serviceTier : 'Standard');
        const isPriority = isNew 
            ? document.getElementById('walk-in-new-ispriority').checked 
            : (matchedPat ? matchedPat.isPriority : false);
        const priorityReason = isNew 
            ? document.getElementById('walk-in-new-priorityreason').value.trim() 
            : (matchedPat ? matchedPat.priorityReason : null);

        const bookingPayload = {
            patientId,
            doctorId,
            appointmentDate: todayStr,
            timeSlot: slot,
            symptoms,
            hospitalBranch: branch,
            serviceTier,
            isPriority,
            priorityReason: isPriority && priorityReason ? priorityReason : null
        };
        
        const bookResponse = await fetch(`${API_BASE}/appointments`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(bookingPayload)
        });
        
        const bookData = await bookResponse.json();
        if (!bookResponse.ok) {
            showToast(bookData.message || "Lỗi tạo cuộc hẹn mới cho bệnh nhân.", "error");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-check-double"></i> Tiếp Nhận & Check-in';
            return;
        }
        
        const appId = bookData.appointmentId || bookData.id;
        
        // Bước C: Check-in tiếp đón + đo sinh hiệu + đóng tiền
        const bp = document.getElementById('walk-in-bp').value.trim();
        const temp = document.getElementById('walk-in-temp').value.trim();
        const weight = document.getElementById('walk-in-weight').value.trim();
        const hr = document.getElementById('walk-in-hr').value.trim();
        const payMethod = document.getElementById('walk-in-pay-method').value;
        const payTx = document.getElementById('walk-in-pay-tx').value.trim();
        
        const checkinPayload = {
            status: 'CheckedIn',
            bloodPressure: bp || null,
            temperature: temp || null,
            weight: weight || null,
            heartRate: hr || null,
            paymentMethod: payMethod,
            paymentTransactionId: payTx || null
        };
        
        const checkinResponse = await fetch(`${API_BASE}/appointments/${appId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(checkinPayload)
        });
        
        const checkinData = await checkinResponse.json();
        if (!checkinResponse.ok) {
            showToast(checkinData.message || "Lỗi xác thực check-in sinh hiệu.", "error");
            btnSubmit.disabled = false;
            btnSubmit.innerHTML = '<i class="fa-solid fa-check-double"></i> Tiếp Nhận & Check-in';
            return;
        }
        
        showToast("Tiếp nhận bệnh nhân vãng lai thành công!", "success");
        closeWalkInModal();
        
        // Bước D: Hiển thị Phiếu khám tiếp đón để in
        const dateStr = new Date().toLocaleDateString('vi-VN');
        
        let vitalsParts = [];
        if (bp) vitalsParts.push(`HA: ${bp} mmHg`);
        if (temp) vitalsParts.push(`T: ${temp}°C`);
        if (weight) vitalsParts.push(`CN: ${weight} kg`);
        if (hr) vitalsParts.push(`NT: ${hr} bpm`);
        const vitalsStr = vitalsParts.length > 0 ? vitalsParts.join(' | ') : 'Chưa đo';
        
        const doctorSelectEl = document.getElementById('walk-in-doctor');
        const doctorName = doctorSelectEl.options[doctorSelectEl.selectedIndex].text;
        const feeStr = patientType === 'Insurance' ? '80.000 đ' : '150.000 đ';
        
        // Nạp dữ liệu vào phiếu in check-in có sẵn
        document.getElementById('rcp-printable-ticket').innerHTML = `
            <div style="text-align:center;margin-bottom:14px;">
                <div style="font-size:24px;color:var(--primary);"><i class="fa-solid fa-hospital-user"></i></div>
                <div style="font-weight:900;font-size:16px;color:var(--dark);margin-top:4px;">PHIẾU TIẾP ĐÓN WALK-IN</div>
                <div style="font-size:11px;color:var(--text-muted);font-weight:600;" id="rcp-ticket-branch">${branch}</div>
                <hr style="border:1px dashed var(--border-color);margin:10px 0 12px;">
            </div>
            
            <div style="text-align:center; margin-bottom:16px; background:rgba(32,201,151,.08); padding:10px; border-radius:8px;">
                <div style="font-size:10px; text-transform:uppercase; color:var(--text-muted); letter-spacing:.5px; font-weight:700;">Số thứ tự khám</div>
                <div style="font-size:32px; font-weight:900; color:var(--success); margin:4px 0;">${checkinData.assignedQueue || 'CC-' + appId}</div>
                <div style="font-size:11px; font-weight:700; color:var(--primary);">${(checkinData.assignedRoom || 'Phòng Khám ' + specialty).toUpperCase()}</div>
            </div>
            
            <table style="width:100%;font-size:12px;border-collapse:collapse;">
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Mã lịch hẹn:</td><td style="font-weight:700;text-align:right;color:var(--primary);" id="rcp-ticket-app-id">#${appId}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Bệnh nhân:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-patient">${patientName.toUpperCase()}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Đối tượng:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-type">${patientType === 'Insurance' ? 'BHYT' : 'Dịch vụ'}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Bác sĩ:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-doctor">${doctorName}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Ngày khám:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-date">${dateStr}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Ca khám:</td><td style="font-weight:700;text-align:right;" id="rcp-ticket-time">${slot}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Sinh hiệu:</td><td style="font-weight:700;text-align:right;color:var(--success);font-size:11px;">${vitalsStr}</td></tr>
                <tr style="border-bottom:1px solid #f0f0f0;"><td style="color:var(--text-muted);padding:5px 0;">Đã đóng phí:</td><td style="font-weight:700;text-align:right;color:var(--success);">${feeStr} (${payMethod})</td></tr>
            </table>
            
            <hr style="border:1px dashed var(--border-color);margin:12px 0 8px;">
            <div style="font-size:10px;color:var(--text-muted);text-align:center;font-style:italic;">Phiếu tiếp nhận trực tiếp · Vui lòng đến đúng phòng khám</div>
        `;
        
        // Mở modal tiếp đón ở bước thành công (Step 3) để hiển thị và in phiếu
        document.getElementById('reception-checkin-modal').style.display = 'flex';
        document.getElementById('reception-scan-step').style.display = 'none';
        document.getElementById('reception-details-step').style.display = 'none';
        document.getElementById('reception-success-step').style.display = 'block';
        
        // Reload reception lists
        loadReceptionAppointments();
        
    } catch (error) {
        console.error("Error in walk-in booking submit", error);
        showToast("Đã xảy ra lỗi không xác định trong quá trình tiếp nhận.", "error");
    } finally {
        btnSubmit.disabled = false;
        btnSubmit.innerHTML = '<i class="fa-solid fa-check-double"></i> Tiếp Nhận & Check-in';
    }
}

// Load Today's Appointments list on the right side
function loadTodayAppointments() {
    const listContainer = document.getElementById('reception-today-list');
    if (!listContainer) return;
    
    const dateLabel = document.getElementById('reception-today-date');
    const today = new Date();
    if (dateLabel) {
        dateLabel.innerText = today.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    
    if (!window.allReceptionAppointments || window.allReceptionAppointments.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:30px; color:#888; font-size:13px;">
                Không có cuộc hẹn nào trong ngày hôm nay.
            </div>
        `;
        return;
    }
    
    const isToday = (dateStr) => {
        const d = new Date(dateStr);
        return d.getDate() === today.getDate() &&
               d.getMonth() === today.getMonth() &&
               d.getFullYear() === today.getFullYear();
    };
    
    const todayApps = window.allReceptionAppointments.filter(app => isToday(app.appointmentDate || app.AppointmentDate));
    
    if (todayApps.length === 0) {
        listContainer.innerHTML = `
            <div style="text-align:center; padding:30px; color:#888; font-size:13px;">
                Không có cuộc hẹn nào trong ngày hôm nay.
            </div>
        `;
        return;
    }
    
    // Sort today's appointments by slot time if possible
    todayApps.sort((a, b) => (a.timeSlot || '').localeCompare(b.timeSlot || ''));
    
    let html = '';
    todayApps.forEach(app => {
        const appId = app.appointmentId || app.id;
        const timeStr = app.timeSlot || 'N/A';
        const statusText = translateStatus(app.status);
        
        let statusClass = 'status-pending';
        if (app.status === 'Confirmed') statusClass = 'status-confirmed';
        else if (app.status === 'CheckedIn') statusClass = 'status-checkedin';
        else if (app.status === 'Completed') statusClass = 'status-completed';
        else if (app.status === 'Cancelled') statusClass = 'status-cancelled';
        
        html += `
            <div onclick="selectReceptionAppointment(${appId})" style="background:rgba(255,255,255,0.65); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-bottom:8px; cursor:pointer; transition:all 0.2s ease; display:flex; justify-content:space-between; align-items:center;" class="today-item">
                <div style="flex:1; min-width:0; padding-right:10px;">
                    <div style="display:flex; align-items:center; gap:6px;">
                        <strong style="font-size:13px; color:var(--dark); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;">${app.patientName}</strong>
                        <span style="font-size:11px; font-weight:600; color:var(--primary); flex-shrink:0;">#${appId}</span>
                    </div>
                    <div style="font-size:11.5px; color:var(--text-muted); margin-top:2px;">
                        BS. ${app.doctorName || 'Chưa chỉ định'} | <i class="fa-regular fa-clock"></i> ${timeStr}
                    </div>
                </div>
                <div style="flex-shrink:0; text-align:right;">
                    <span class="status-badge ${statusClass}" style="font-size:10px; padding:2px 6px;">${statusText}</span>
                </div>
            </div>
        `;
    });
    
    listContainer.innerHTML = html;
}



// ── Vitals History Chart for Patients ─────────────────────────────────────────
let vitalsBpChart = null;
let vitalsTempChart = null;

async function loadPatientVitals() {
    const tbody = document.getElementById('vitals-history-tbody');
    if (!tbody) return;

    try {
        const response = await fetch(`${API_BASE}/appointments/my-appointments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        const appointments = await response.json();
        
        const vitalsData = appointments
            .filter(a => a.bloodPressure || a.temperature || a.weight || a.heartRate)
            .sort((a, b) => new Date(a.appointmentDate) - new Date(b.appointmentDate));

        if (vitalsData.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--text-muted); font-style: italic;">Chưa ghi nhận chỉ số sinh hiệu nào từ các cuộc hẹn trước đây.</td></tr>`;
            
            // Render placeholders inside chart canvases parent elements
            const bpContainer = document.getElementById('vitals-bp-hr-chart')?.parentElement;
            if (bpContainer) {
                bpContainer.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-style: italic; font-size: 12.5px; text-align: center; padding: 20px;">
                    <i class="fa-solid fa-chart-line" style="font-size: 32px; margin-bottom: 8px; color: var(--border-color);"></i>
                    <div>Chưa có dữ liệu Huyết áp & Nhịp tim.<br><span style="font-size: 11px; color: #94a3b8;">Biểu đồ tự động vẽ sau khi hoàn thành ca khám đầu tiên.</span></div>
                </div>`;
            }
            const tempContainer = document.getElementById('vitals-temp-weight-chart')?.parentElement;
            if (tempContainer) {
                tempContainer.innerHTML = `<div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-style: italic; font-size: 12.5px; text-align: center; padding: 20px;">
                    <i class="fa-solid fa-chart-area" style="font-size: 32px; margin-bottom: 8px; color: var(--border-color);"></i>
                    <div>Chưa có dữ liệu Nhiệt độ & Cân nặng.<br><span style="font-size: 11px; color: #94a3b8;">Biểu đồ tự động vẽ sau khi hoàn thành ca khám đầu tiên.</span></div>
                </div>`;
            }
            return;
        }

        // Render table
        tbody.innerHTML = vitalsData.map(a => {
            const dateStr = new Date(a.appointmentDate).toLocaleDateString('vi-VN');
            const bp = a.bloodPressure || '—';
            const temp = a.temperature || '—';
            const weight = a.weight || '—';
            const hr = a.heartRate || '—';
            const docBranch = `BS. ${a.doctorName} (${getLocalizedBranchName(a.hospitalBranch) || 'CareConnect'})`;
            
            return `<tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 10px 16px;"><strong>${dateStr}</strong></td>
                <td style="padding: 10px 16px;">${bp} mmHg</td>
                <td style="padding: 10px 16px;">${temp} °C</td>
                <td style="padding: 10px 16px;">${weight} kg</td>
                <td style="padding: 10px 16px;">${hr} bpm</td>
                <td style="padding: 10px 16px; color: var(--text-muted); font-size: 12px;">${docBranch}</td>
            </tr>`;
        }).reverse().join('');

        // Prepare charts
        const labels = vitalsData.map(a => new Date(a.appointmentDate).toLocaleDateString('vi-VN', { month: 'numeric', day: 'numeric' }));
        const systolic = [];
        const diastolic = [];
        const hrValues = [];
        
        vitalsData.forEach(a => {
            const bpStr = a.bloodPressure || "";
            let sysVal = null, diaVal = null;
            if (bpStr.includes('/')) {
                const parts = bpStr.split('/');
                sysVal = parseFloat(parts[0]);
                diaVal = parseFloat(parts[1]);
            }
            systolic.push(sysVal);
            diastolic.push(diaVal);
            hrValues.push(a.heartRate ? parseFloat(a.heartRate) : null);
        });

        const tempValues = vitalsData.map(a => a.temperature ? parseFloat(a.temperature) : null);
        const weightValues = vitalsData.map(a => a.weight ? parseFloat(a.weight) : null);

        // Chart 1
        const ctxBp = document.getElementById('vitals-bp-hr-chart')?.getContext('2d');
        if (ctxBp) {
            if (vitalsBpChart) vitalsBpChart.destroy();
            vitalsBpChart = new Chart(ctxBp, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Tâm thu (mmHg)', data: systolic, borderColor: 'hsl(354, 85%, 55%)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.15 },
                        { label: 'Tâm trương (mmHg)', data: diastolic, borderColor: 'hsl(210, 85%, 55%)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.15 },
                        { label: 'Nhịp tim (bpm)', data: hrValues, borderColor: 'hsl(160, 85%, 45%)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.15, borderDash: [4, 4] }
                    ]
                },
                options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { font: { size: 10 } } } } }
            });
        }

        // Chart 2
        const ctxTemp = document.getElementById('vitals-temp-weight-chart')?.getContext('2d');
        if (ctxTemp) {
            if (vitalsTempChart) vitalsTempChart.destroy();
            vitalsTempChart = new Chart(ctxTemp, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        { label: 'Nhiệt độ (°C)', data: tempValues, borderColor: 'hsl(35, 90%, 50%)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.15, yAxisID: 'y' },
                        { label: 'Cân nặng (kg)', data: weightValues, borderColor: 'hsl(260, 70%, 55%)', backgroundColor: 'transparent', borderWidth: 2, tension: 0.15, yAxisID: 'y1' }
                    ]
                },
                options: { 
                    responsive: true, 
                    maintainAspectRatio: false, 
                    plugins: { legend: { labels: { font: { size: 10 } } } },
                    scales: {
                        y: { type: 'linear', display: true, position: 'left', suggestedMin: 35, suggestedMax: 41 },
                        y1: { type: 'linear', display: true, position: 'right', suggestedMin: 40, suggestedMax: 100, grid: { drawOnChartArea: false } }
                    }
                }
            });
        }
    } catch (e) {
        console.error('Lỗi khi vẽ biểu đồ sinh hiệu:', e);
        tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 24px; color: var(--danger);">Không thể vẽ biểu đồ sinh hiệu.</td></tr>`;
    }
}

// ── Admin User Editing Modal Actions ───────────────────────────────────────────
let currentEditingUserId = null;

async function openAdminEditUserModal(userId, listType) {
    currentEditingUserId = userId;
    const form = document.getElementById('admin-edit-user-form');
    if (!form) return;
    form.reset();

    try {
        const response = await fetch(`${API_BASE}/admin/users/${userId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('API error');
        const user = await response.json();

        document.getElementById('admin-edit-userid').value = user.userId;
        document.getElementById('admin-edit-role').value = user.role;
        document.getElementById('admin-edit-fullname').value = user.fullName;
        document.getElementById('admin-edit-email').value = user.email;
        document.getElementById('admin-edit-phone').value = user.phoneNumber || '';
        document.getElementById('admin-edit-dob').value = user.dateOfBirth ? user.dateOfBirth.split('T')[0] : '';
        document.getElementById('admin-edit-gender').value = user.gender || '';
        document.getElementById('admin-edit-blood').value = user.bloodType || '';
        document.getElementById('admin-edit-address').value = user.address || '';

        const staffFields = document.getElementById('admin-edit-staff-fields');
        const patFields = document.getElementById('admin-edit-patient-fields');

        const isStaff = ['Doctor', 'Receptionist', 'Finance', 'Pharmacist', 'LabTechnician'].includes(user.role);
        if (isStaff) {
            staffFields.style.display = 'block';
            patFields.style.display = 'none';
            
            // Specialization and Degree are Doctor-specific
            const isDoc = user.role === 'Doctor';
            document.getElementById('group-edit-specialization').style.display = isDoc ? 'block' : 'none';
            document.getElementById('group-edit-degree').style.display = isDoc ? 'block' : 'none';
            
            document.getElementById('admin-edit-specialization').value = user.specialization || '';
            document.getElementById('admin-edit-branch').value = user.hospitalBranch || '';
            document.getElementById('admin-edit-degree').value = user.degree || '';
        } else if (user.role === 'Patient') {
            staffFields.style.display = 'none';
            patFields.style.display = 'block';
            document.getElementById('admin-edit-patient-type').value = user.patientType || 'Service';
            document.getElementById('admin-edit-insurance').value = user.insuranceCardNumber || '';
            document.getElementById('admin-edit-cccd').value = user.nationalId || '';
            document.getElementById('admin-edit-service-tier').value = user.serviceTier || 'Standard';
            const isPriorityCb = document.getElementById('admin-edit-is-priority');
            if (isPriorityCb) {
                isPriorityCb.checked = !!user.isPriority;
                document.getElementById('admin-edit-priority-reason-group').style.display = isPriorityCb.checked ? 'block' : 'none';
            }
            document.getElementById('admin-edit-priority-reason').value = user.priorityReason || '';
        } else {
            staffFields.style.display = 'none';
            patFields.style.display = 'none';
        }

        document.getElementById('admin-edit-user-modal').style.display = 'flex';
    } catch (e) {
        showToast('Lỗi khi tải thông tin chi tiết người dùng.', 'error');
    }
}

function closeAdminEditUserModal() {
    document.getElementById('admin-edit-user-modal').style.display = 'none';
}

async function handleAdminEditUser(e) {
    if (e) e.preventDefault();
    if (!currentEditingUserId) return;

    const fullName = document.getElementById('admin-edit-fullname').value.trim();
    const email = document.getElementById('admin-edit-email').value.trim();
    const password = document.getElementById('admin-edit-password').value;
    const phoneNumber = document.getElementById('admin-edit-phone').value.trim();
    const dateOfBirth = document.getElementById('admin-edit-dob').value || null;
    const gender = document.getElementById('admin-edit-gender').value;
    const bloodType = document.getElementById('admin-edit-blood').value;
    const address = document.getElementById('admin-edit-address').value.trim();
    const role = document.getElementById('admin-edit-role').value;

    let specialization = null, hospitalBranch = null, degree = null;
    let patientType = null, insuranceCardNumber = null, nationalId = null;

    const isStaff = ['Doctor', 'Receptionist', 'Finance', 'Pharmacist', 'LabTechnician'].includes(role);
    if (isStaff) {
        hospitalBranch = document.getElementById('admin-edit-branch').value;
        if (role === 'Doctor') {
            specialization = document.getElementById('admin-edit-specialization').value.trim();
            degree = document.getElementById('admin-edit-degree').value.trim();
        }
    } else if (role === 'Patient') {
        patientType = document.getElementById('admin-edit-patient-type').value;
        insuranceCardNumber = document.getElementById('admin-edit-insurance').value.trim();
        nationalId = document.getElementById('admin-edit-cccd').value.trim();
    }
    
    const serviceTier = role === 'Patient' ? document.getElementById('admin-edit-service-tier').value : 'Standard';
    const isPriority = role === 'Patient' ? document.getElementById('admin-edit-is-priority').checked : false;
    const priorityReason = role === 'Patient' ? document.getElementById('admin-edit-priority-reason').value.trim() : null;

    try {
        const response = await fetch(`${API_BASE}/admin/users/${currentEditingUserId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                fullName,
                email,
                password: password || null,
                phoneNumber,
                dateOfBirth,
                gender,
                bloodType,
                address,
                specialization,
                hospitalBranch,
                degree,
                patientType,
                insuranceCardNumber,
                nationalId,
                serviceTier,
                isPriority,
                priorityReason: isPriority && priorityReason ? priorityReason : null
            })
        });

        const data = await response.json();
        if (response.ok) {
            showToast('✅ Cập nhật thông tin người dùng thành công!', 'success');
            closeAdminEditUserModal();
            loadOverviewData();
            loadAdminStats();
            if (role === 'Patient') {
                loadPatients();
            } else {
                loadStaff();
            }
        } else {
            showToast(data.message || 'Cập nhật thất bại.', 'error');
        }
    } catch (err) {
        showToast('Lỗi kết nối máy chủ khi cập nhật.', 'error');
    }
}

// Booking form BHYT toggle helper
function onBookingPatientTypeChange(val) {
    const group = document.getElementById('booking-insurance-group');
    const input = document.getElementById('booking-insurancecardnumber');
    if (group && input) {
        if (val === 'Insurance') {
            group.style.display = 'block';
            input.required = true;
        } else {
            group.style.display = 'none';
            input.required = false;
            input.value = '';
        }
    }
}

// === SURVEY OBSERVED FEATURES ===

// Subtab switcher for receptionist dashboard
function switchReceptionSubTab(subTab) {
    const checkinBtn = document.getElementById('reception-subtab-checkin-btn');
    const billingBtn = document.getElementById('reception-subtab-billing-btn');
    const checkinView = document.getElementById('reception-checkin-view');
    const billingView = document.getElementById('reception-billing-view');

    if (subTab === 'checkin') {
        if (checkinBtn) {
            checkinBtn.style.color = 'var(--primary)';
            checkinBtn.style.borderBottom = '3px solid var(--primary)';
        }
        if (billingBtn) {
            billingBtn.style.color = 'var(--text-muted)';
            billingBtn.style.borderBottom = 'none';
        }
        if (checkinView) checkinView.style.display = 'block';
        if (billingView) billingView.style.display = 'none';
    } else if (subTab === 'billing') {
        if (checkinBtn) {
            checkinBtn.style.color = 'var(--text-muted)';
            checkinBtn.style.borderBottom = 'none';
        }
        if (billingBtn) {
            billingBtn.style.color = 'var(--primary)';
            billingBtn.style.borderBottom = '3px solid var(--primary)';
        }
        if (checkinView) checkinView.style.display = 'none';
        if (billingView) billingView.style.display = 'block';
        loadBillingRecords();
    }
}


// Simulated QR camera scan
function startSimulatedQrScan() {
    const modal = document.getElementById('camera-qr-scan-modal');
    if (modal) modal.style.display = 'flex';

    const statusEl = document.getElementById('camera-scan-status');
    if (statusEl) statusEl.innerText = 'Đang tìm mã QR...';

    setTimeout(() => {
        if (statusEl) statusEl.innerText = 'Đã nhận diện mã! Đang nạp dữ liệu...';
        
        setTimeout(() => {
            closeCameraQrModal();
            
            let targetCode = '1';
            if (window.allAppointments && window.allAppointments.length > 0) {
                const confirmedApps = window.allAppointments.filter(a => a.status === 'Confirmed' || a.Status === 'Confirmed');
                if (confirmedApps.length > 0) {
                    const randomApp = confirmedApps[Math.floor(Math.random() * confirmedApps.length)];
                    targetCode = randomApp.appointmentId || randomApp.AppointmentId || randomApp.id || '1';
                }
            }
            
            const input = document.getElementById('reception-qr-direct-input');
            if (input) {
                input.value = targetCode;
                lookupByQrCode();
            }
        }, 1000);
    }, 2000);
}

function closeCameraQrModal() {
    const modal = document.getElementById('camera-qr-scan-modal');
    if (modal) modal.style.display = 'none';
}

// Post-consultation billing records loading
async function loadBillingRecords() {
    const container = document.getElementById('reception-billing-list');
    if (container) {
        container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;"><i class="fa-solid fa-spinner fa-spin"></i> Đang tải danh sách...</td></tr>`;
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/medicalrecords/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Không thể tải danh sách bệnh án.');

        const data = await response.json();
        window.allBillingRecords = data.filter(r => r.prescriptionFee > 0);
        displayBillingRecords(window.allBillingRecords);
    } catch (e) {
        console.error(e);
        if (container) {
            container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--danger);">${e.message}</td></tr>`;
        }
    }
}

function filterBillingRecords() {
    const query = document.getElementById('billing-search-input')?.value?.toLowerCase() || '';
    if (!window.allBillingRecords) return;

    const filtered = window.allBillingRecords.filter(rec => {
        return (rec.patientName || '').toLowerCase().includes(query) ||
               (rec.patientEmail || '').toLowerCase().includes(query) ||
               (rec.doctorName || '').toLowerCase().includes(query) ||
               rec.medicalRecordId.toString().includes(query);
    });
    displayBillingRecords(filtered);
}

function displayBillingRecords(records) {
    const container = document.getElementById('reception-billing-list');
    if (!container) return;

    if (records.length === 0) {
        container.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:30px;color:var(--text-muted);"><i class="fa-solid fa-folder-open" style="font-size:24px;margin-bottom:8px;display:block;"></i>Không có hóa đơn đơn thuốc nào.</td></tr>`;
        return;
    }

    let html = '';
    records.forEach(rec => {
        const isPaid = rec.billingStatus === 'Paid';
        const statusBadge = isPaid 
            ? `<span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: rgba(40,167,69,0.15); color: var(--success); font-weight: 700;">Đã thanh toán</span>`
            : `<span style="font-size: 11px; padding: 4px 10px; border-radius: 20px; background: rgba(220,53,69,0.15); color: #dc3545; font-weight: 700;">Chờ thanh toán</span>`;

        const actionBtn = isPaid 
            ? `<button class="btn btn-secondary btn-sm" disabled style="padding: 6px 12px; font-size:12px; border-radius: 4px; opacity:0.6;"><i class="fa-solid fa-check"></i> Hoàn thành</button>`
            : `<button class="btn btn-success btn-sm" onclick="confirmBillingPayment(${rec.medicalRecordId})" style="padding: 6px 12px; font-size:12px; font-weight:700; border-radius: 4px; background:var(--success); color:#fff; border:none; cursor:pointer;"><i class="fa-solid fa-file-signature"></i> Thu tiền &amp; Duyệt</button>`;

        html += `
            <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
                <td style="padding: 12px 8px; font-weight:700; color:var(--dark);">#BA-${rec.medicalRecordId}</td>
                <td style="padding: 12px 8px;"><strong>${rec.patientName}</strong><br><span style="font-size:11px; color:var(--text-muted);">${rec.patientEmail}</span></td>
                <td style="padding: 12px 8px;">${rec.doctorName}</td>
                <td style="padding: 12px 8px; font-weight:600; color:var(--primary);">${rec.diagnosis}</td>
                <td style="padding: 12px 8px; font-family:monospace; max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rec.prescription}">${rec.prescription}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight:700; color:#dc3545;">${Number(rec.prescriptionFee).toLocaleString('vi-VN')} đ</td>
                <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                <td style="padding: 12px 8px; text-align: center;">${actionBtn}</td>
            </tr>
        `;
    });
    container.innerHTML = html;
}

async function confirmBillingPayment(recordId) {
    if (!confirm(`Xác nhận đã thu đủ tiền thuốc của bệnh nhân cho bệnh án #BA-${recordId}?`)) return;

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/medicalrecords/${recordId}/pay`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Không thể duyệt thanh toán hóa đơn.');

        showToast('Thu tiền và duyệt đơn thuốc thành công!', 'success');
        loadBillingRecords();
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
    }
}

// Patient Online VietQR payment for prescriptions
window.activePayingPrescriptionId = null;

function payPrescriptionVietQr(recordId, fee) {
    window.activePayingPrescriptionId = recordId;
    
    const modal = document.getElementById('payment-vietqr-modal');
    if (!modal) return;

    // Set VietQR Image URL
    const qrImg = document.getElementById('vietqr-payment-image');
    if (qrImg) {
        qrImg.src = `https://img.vietqr.io/image/mbb-19031234567890-compact.png?amount=${fee}&addInfo=CareConnect%20DT%20${recordId}&accountName=PHONG%20KHAM%20CARECONNECT`;
    }

    // Set billing info details
    const detailsDiv = document.getElementById('vietqr-transfer-content');
    if (detailsDiv) {
        detailsDiv.innerText = `CareConnect DT ${recordId}`;
    }

    // Set amount display text inside MB Bank details box
    const amountValEl = document.querySelector('#payment-vietqr-modal strong[style*="color: var(--danger)"]');
    if (amountValEl) {
        amountValEl.innerText = `${Number(fee).toLocaleString('vi-VN')} đ`;
    }

    // Redirect confirm button action to confirmPrescriptionOnlinePayment
    const confirmBtn = document.getElementById('btn-confirm-payment');
    if (confirmBtn) {
        confirmBtn.setAttribute('onclick', 'confirmPrescriptionOnlinePayment()');
    }

    modal.style.display = 'flex';
}

async function confirmPrescriptionOnlinePayment() {
    const recordId = window.activePayingPrescriptionId;
    if (!recordId) return;

    const confirmBtn = document.getElementById('btn-confirm-payment');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...';
    }

    try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_BASE}/medicalrecords/${recordId}/pay`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) throw new Error('Không thể duyệt thanh toán đơn thuốc trực tuyến.');

        showToast('Thanh toán đơn thuốc trực tuyến thành công!', 'success');
        closeVietQrModal();
        loadMedicalRecords(); // Reload records list
    } catch (e) {
        console.error(e);
        showToast(e.message, 'error');
    } finally {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.innerHTML = '<i class="fa-solid fa-circle-check"></i> Tôi đã chuyển khoản';
        }
    }
}

// Onboarding Interactive Booking Tour Controller
window.bookingTourActive = false;
window.bookingTourStep = 1;

function showOnboardingTour() {
    startBookingTour();
}

function startBookingTour() {
    window.bookingTourActive = true;
    window.bookingTourStep = 1;
    
    // Show widget
    const widget = document.getElementById('booking-tour-widget');
    if (widget) {
        widget.style.display = 'block';
    }
    
    // Auto-open booking modal
    openBookingModal();
    
    // Register listeners if not already registered
    setupBookingTourListeners();
    
    // Check initial progress and update UI
    checkBookingTourProgress();
}

function closeBookingTour() {
    const widget = document.getElementById('booking-tour-widget');
    if (widget) {
        widget.style.display = 'none';
    }
    window.bookingTourActive = false;
}

function setupBookingTourListeners() {
    const fields = [
        'booking-specialty',
        'booking-branch',
        'booking-doctor',
        'booking-date',
        'booking-slot',
        'booking-symptoms'
    ];
    
    fields.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.dataset.hasTourListener) {
            el.dataset.hasTourListener = 'true';
            el.addEventListener('change', checkBookingTourProgress);
            el.addEventListener('input', checkBookingTourProgress);
        }
    });
}

function checkBookingTourProgress() {
    if (!window.bookingTourActive) return;
    
    const specialty = document.getElementById('booking-specialty')?.value || '';
    const branch = document.getElementById('booking-branch')?.value || '';
    const doctor = document.getElementById('booking-doctor')?.value || '';
    const date = document.getElementById('booking-date')?.value || '';
    const slot = document.getElementById('booking-slot')?.value || '';
    
    let currentStep = 1;
    
    if (specialty && branch) {
        currentStep = 2;
        if (doctor && date) {
            currentStep = 3;
            if (slot) {
                currentStep = 4;
            }
        }
    }
    
    if (currentStep !== window.bookingTourStep) {
        window.bookingTourStep = currentStep;
    }
    updateBookingTourUI();
}

function updateBookingTourUI() {
    if (!window.bookingTourActive) return;
    
    const step = window.bookingTourStep;
    const instructionEl = document.getElementById('booking-tour-instruction');
    const badgeEl = document.getElementById('booking-tour-badge');
    
    if (badgeEl) {
        badgeEl.innerText = `Bước ${step}/4`;
    }
    
    if (instructionEl) {
        if (step === 1) {
            instructionEl.innerHTML = `👉 <strong>Bước 1:</strong> Bạn hãy chọn <strong>Chuyên khoa khám</strong> và <strong>Chi nhánh khám</strong> gần bạn nhất.`;
        } else if (step === 2) {
            instructionEl.innerHTML = `👉 <strong>Bước 2:</strong> Tuyệt vời! Bây giờ hãy chọn <strong>Bác sĩ khám</strong> và nhập <strong>Ngày khám bệnh</strong> mong muốn.`;
        } else if (step === 3) {
            instructionEl.innerHTML = `👉 <strong>Bước 3:</strong> Nhấp chọn một <strong>Ca khám (Khung giờ trống)</strong> thích hợp hiển thị trong bảng giờ khám.`;
        } else if (step === 4) {
            instructionEl.innerHTML = `👉 <strong>Bước 4:</strong> Cuối cùng, hãy nhập ngắn gọn <strong>Lý do khám/Triệu chứng</strong> của bạn và bấm nút <strong>"Xác nhận đặt lịch"</strong> để hoàn tất!`;
        }
    }
    
    // Update step indicator styles
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`tour-step-indicator-${i}`);
        const icon = document.getElementById(`tour-step-icon-${i}`);
        
        if (indicator && icon) {
            indicator.className = ''; // Reset
            icon.className = '';
            
            if (i < step) {
                // Completed
                indicator.className = 'tour-step-completed';
                icon.className = 'fa-solid fa-circle-check';
            } else if (i === step) {
                // Active
                indicator.className = 'tour-step-active';
                icon.className = 'fa-solid fa-circle-play';
            } else {
                // Pending
                icon.className = 'fa-regular fa-circle';
            }
        }
    }
}

function completeBookingTour() {
    const widget = document.getElementById('booking-tour-widget');
    if (!widget) return;
    
    const instructionEl = document.getElementById('booking-tour-instruction');
    const badgeEl = document.getElementById('booking-tour-badge');
    
    if (badgeEl) {
        badgeEl.innerText = 'Hoàn thành 🎉';
        badgeEl.className = 'badge badge-success';
    }
    
    if (instructionEl) {
        instructionEl.innerHTML = `🎉 <strong>Chúc mừng!</strong> Bạn đã hoàn tất đăng ký ca khám đầu tiên thành công. Đăng nhập tài khoản Bác sĩ/Lễ tân để tiếp tục xử lý ca khám nhé!`;
    }
    
    // Mark all steps completed
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`tour-step-indicator-${i}`);
        const icon = document.getElementById(`tour-step-icon-${i}`);
        if (indicator && icon) {
            indicator.className = 'tour-step-completed';
            icon.className = 'fa-solid fa-circle-check';
        }
    }
    
    // Change skip button text to Close
    const skipBtn = widget.querySelector('.onboarding-btn-skip');
    if (skipBtn) {
        skipBtn.innerText = 'Đóng';
        skipBtn.setAttribute('onclick', 'closeBookingTour()');
    }
    
    window.bookingTourActive = false;
}

// Expose onboarding functions to global window object
window.showOnboardingTour = showOnboardingTour;
window.closeBookingTour = closeBookingTour;
window.startBookingTour = startBookingTour;
window.checkBookingTourProgress = checkBookingTourProgress;
window.updateBookingTourUI = updateBookingTourUI;
window.completeBookingTour = completeBookingTour;

// ==========================================
// DƯỢC SĨ (PHARMACIST) DASHBOARD LOGIC
// ==========================================
let pharmacyRecords = [];
let pharmacyInventory = [];

async function loadPharmacistDashboard() {
    try {
        // 1. Tải danh mục thuốc (kho)
        const medRes = await fetch('/api/medicines', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (medRes.ok) {
            pharmacyInventory = await medRes.json();
            renderPharmacyInventory(pharmacyInventory);
        }

        // 2. Tải danh sách bệnh án để lấy đơn thuốc
        const recRes = await fetch('/api/medicalrecords/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (recRes.ok) {
            const allRecords = await recRes.json();
            // Lọc bệnh án có đơn thuốc chi tiết (prescriptionDetails không rỗng)
            pharmacyRecords = allRecords.filter(r => r.prescriptionDetails && r.prescriptionDetails.length > 0);
            renderPharmacyPendingList(pharmacyRecords);
        }
    } catch (err) {
        console.error("Lỗi khi tải bảng điều khiển dược sĩ:", err);
        showToast("Không thể kết nối máy chủ để tải dữ liệu quầy thuốc.", "danger");
    }
}

function renderPharmacyInventory(inventory) {
    const tbody = document.getElementById('pharmacy-inventory-list');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (inventory.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:15px; color:var(--text-muted);">Không có thuốc nào trong danh mục.</td></tr>`;
        return;
    }

    inventory.forEach(med => {
        const isLowStock = med.stockQuantity < 50;
        const stockStyle = isLowStock ? 'color: var(--danger); font-weight: 700;' : 'color: var(--success); font-weight: 600;';
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color); vertical-align: middle;">
                <td style="padding: 12px 8px;">
                    <div style="font-weight: 700; color: var(--dark);">${med.name}</div>
                    <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">${med.activeIngredient || '—'}</div>
                </td>
                <td style="padding: 12px 8px; text-align: center;">${med.unit}</td>
                <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: var(--text-main); white-space: nowrap;">${med.unitPrice.toLocaleString('vi-VN')} đ</td>
                <td style="padding: 12px 8px; text-align: center;">
                    <span style="${stockStyle}">${med.stockQuantity}</span>
                    ${isLowStock ? '<span style="color:var(--danger); font-size:10px; font-weight:700;"><br>(Sắp hết)</span>' : ''}
                </td>
                <td style="padding: 12px 8px; text-align: center; white-space: nowrap;">
                    <div style="display: flex; gap: 4px; justify-content: center; align-items: center;">
                        <button class="btn btn-sm btn-primary" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;" onclick="openRestockModal(${med.medicineId}, '${med.name.replace(/'/g, "\\'")}', ${med.stockQuantity})" title="Nhập thêm kho">
                            <i class="fa-solid fa-plus"></i> Nhập
                        </button>
                        <button class="btn btn-sm btn-warning" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;" onclick="openMedicineModal(${med.medicineId}, '${med.name.replace(/'/g, "\\'")}', '${(med.activeIngredient || '').replace(/'/g, "\\'")}', '${med.unit}', ${med.unitPrice}, ${med.stockQuantity}, '${(med.usageInstruction || '').replace(/'/g, "\\'")}')" title="Sửa thông tin thuốc">
                            <i class="fa-solid fa-pen-to-square"></i> Sửa
                        </button>
                        <button class="btn btn-sm btn-danger" style="padding: 4px 8px; font-size: 11px; border-radius: 4px; display: inline-flex; align-items: center; gap: 3px;" onclick="deleteMedicine(${med.medicineId}, '${med.name.replace(/'/g, "\\'")}')" title="Xóa thuốc">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function renderPharmacyPendingList(records) {
    const tbody = document.getElementById('pharmacy-pending-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">Không có đơn thuốc nào chờ xử lý.</td></tr>`;
        return;
    }

    records.forEach(r => {
        // Đơn thuốc chi tiết
        let medsHtml = '<ul style="margin:0; padding-left:16px; line-height:1.4;">';
        r.prescriptionDetails.forEach(pd => {
            medsHtml += `<li><strong>${pd.medicineName}</strong> x ${pd.quantity} ${pd.unit} <br><span style="font-size:11px; color:var(--text-muted);">${pd.usageInstruction}</span></li>`;
        });
        medsHtml += '</ul>';

        // Trạng thái thanh toán
        const isPaid = r.billingStatus === 'Paid';
        const billingBadge = isPaid 
            ? '<span class="badge badge-success">Đã Thanh Toán</span>' 
            : '<span class="badge badge-danger">Chưa Thanh Toán</span>';

        // Trạng thái cấp phát
        const isDispensed = r.dispenseStatus === 'Dispensed';
        const dispenseBadge = isDispensed 
            ? '<span class="badge badge-success" style="margin-left: 5px;">Đã Phát Thuốc</span>' 
            : '<span class="badge badge-warning" style="margin-left: 5px;">Chờ Phát Thuốc</span>';

        // Nút hành động
        let actionBtn = '';
        if (!isPaid) {
            actionBtn = `<button class="btn btn-sm btn-secondary" disabled title="Yêu cầu thanh toán trước"><i class="fa-solid fa-hourglass"></i> Chờ thanh toán</button>`;
        } else if (isDispensed) {
            actionBtn = `<button class="btn btn-sm btn-success" disabled><i class="fa-solid fa-circle-check"></i> Hoàn thành</button>`;
        } else {
            actionBtn = `<button class="btn btn-sm btn-primary" onclick="dispenseMedicine(${r.medicalRecordId})"><i class="fa-solid fa-paper-plane"></i> Duyệt phát thuốc</button>`;
        }

        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 12px 8px; font-weight: 700; color: var(--primary);">#${r.medicalRecordId}</td>
                <td style="padding: 12px 8px;">
                    <div style="font-weight: 700; color: var(--dark);">${r.patientName}</div>
                    <div style="font-size: 11px; color: var(--text-muted);">${r.patientEmail}</div>
                </td>
                <td style="padding: 12px 8px; font-size: 12.5px;">${medsHtml}</td>
                <td style="padding: 12px 8px; text-align: center;">
                    <div style="margin-bottom: 5px;">${billingBadge}</div>
                    <div>${dispenseBadge}</div>
                </td>
                <td style="padding: 12px 8px; text-align: center;">${actionBtn}</td>
            </tr>
        `;
    });
}

function filterPharmacyRecords() {
    const q = document.getElementById('pharmacy-search-input')?.value?.toLowerCase() || '';
    if (!q) {
        renderPharmacyPendingList(pharmacyRecords);
        return;
    }
    const filtered = pharmacyRecords.filter(r => r.patientName.toLowerCase().includes(q) || r.medicalRecordId.toString().includes(q));
    renderPharmacyPendingList(filtered);
}

async function dispenseMedicine(recordId) {
    if (!confirm(`Xác nhận cấp phát thuốc cho bệnh án #${recordId}? Hệ thống sẽ tiến hành trừ tồn kho thuốc tương ứng.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/medicalrecords/${recordId}/dispense`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("Cấp phát đơn thuốc thành công và đã trừ tồn kho thuốc!", "success");
            loadPharmacistDashboard();
        } else {
            const data = await res.json();
            showToast(data.message || "Không thể cấp phát đơn thuốc.", "danger");
        }
    } catch (err) {
        console.error("Lỗi khi cấp phát thuốc:", err);
        showToast("Lỗi kết nối máy chủ.", "danger");
    }
}


// ==========================================
// KỸ THUẬT VIÊN CẬN LÂM SÀNG (LABTECH) LOGIC
// ==========================================
let labtechRecords = [];

async function loadLabTechDashboard() {
    try {
        const res = await fetch('/api/medicalrecords/all', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const allRecords = await res.json();
            // Lọc bệnh án có chỉ định cận lâm sàng (labRequests không rỗng)
            labtechRecords = allRecords.filter(r => r.labRequests && r.labRequests.length > 0);
            renderLabtechPendingList(labtechRecords);
        }
    } catch (err) {
        console.error("Lỗi khi tải bảng điều khiển KTV cận lâm sàng:", err);
        showToast("Không thể tải danh sách chỉ định cận lâm sàng.", "danger");
    }
}

function renderLabtechPendingList(records) {
    const tbody = document.getElementById('labtech-pending-list');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">Không có chỉ định cận lâm sàng nào chờ thực hiện.</td></tr>`;
        return;
    }

    records.forEach(r => {
        r.labRequests.forEach(lr => {
            const isCompleted = lr.status === 'Completed';
            const statusBadge = isCompleted 
                ? '<span class="badge badge-success">Hoàn thành</span>' 
                : '<span class="badge badge-warning">Chờ kết quả</span>';

            let actionBtn = '';
            if (isCompleted) {
                actionBtn = `<button class="btn btn-sm btn-secondary" disabled><i class="fa-solid fa-circle-check"></i> Đã cập nhật</button>`;
            } else {
                actionBtn = `<button class="btn btn-sm btn-primary" onclick="openLabResultModal(${r.medicalRecordId}, ${lr.labRequestId}, '${lr.labType}')"><i class="fa-solid fa-pen-to-square"></i> Nhập kết quả</button>`;
            }

            tbody.innerHTML += `
                <tr style="border-bottom: 1px solid var(--border-color);">
                    <td style="padding: 12px 8px; font-weight: 700; color: var(--primary);">#${r.medicalRecordId}</td>
                    <td style="padding: 12px 8px;">
                        <div style="font-weight: 700; color: var(--dark);">${r.patientName}</div>
                        <div style="font-size: 11px; color: var(--text-muted);">${r.patientEmail}</div>
                    </td>
                    <td style="padding: 12px 8px; font-weight: 500; color: var(--text-main);">${r.doctorName}</td>
                    <td style="padding: 12px 8px; font-weight: 700; color: var(--dark);">${lr.labType}</td>
                    <td style="padding: 12px 8px; font-weight: 600; text-align: right;">${lr.fee.toLocaleString('vi-VN')} đ</td>
                    <td style="padding: 12px 8px; max-width: 250px; font-style: italic;">
                        ${isCompleted ? lr.results : '<span style="color:var(--text-muted);">Chưa thực hiện</span>'}
                        ${lr.imageUrl ? `<br><a href="${lr.imageUrl}" target="_blank" style="font-size:11px; color:var(--primary); text-decoration:none;"><i class="fa-solid fa-image"></i> Xem ảnh</a>` : ''}
                    </td>
                    <td style="padding: 12px 8px; text-align: center;">${statusBadge}</td>
                    <td style="padding: 12px 8px; text-align: center;">${actionBtn}</td>
                </tr>
            `;
        });
    });
}

function filterLabtechRecords() {
    const q = document.getElementById('labtech-search-input')?.value?.toLowerCase() || '';
    if (!q) {
        renderLabtechPendingList(labtechRecords);
        return;
    }
    const filtered = labtechRecords.filter(r => r.patientName.toLowerCase().includes(q) || r.medicalRecordId.toString().includes(q));
    renderLabtechPendingList(filtered);
}

function openLabResultModal(recordId, labId, labType) {
    document.getElementById('labtech-record-id').value = recordId;
    document.getElementById('labtech-lab-id').value = labId;
    document.getElementById('labtech-modal-type').value = labType;
    document.getElementById('labtech-modal-results').value = '';
    document.getElementById('labtech-modal-image').value = '';
    
    document.getElementById('labtech-result-modal').style.display = 'flex';
}

function closeLabResultModal() {
    document.getElementById('labtech-result-modal').style.display = 'none';
}

// Bắt sự kiện nộp form kết quả cận lâm sàng
const labResultForm = document.getElementById('labtech-result-form');
if (labResultForm) {
    labResultForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const recordId = document.getElementById('labtech-record-id').value;
        const labId = document.getElementById('labtech-lab-id').value;
        const results = document.getElementById('labtech-modal-results').value;
        const imageUrl = document.getElementById('labtech-modal-image').value;

        try {
            const res = await fetch(`/api/medicalrecords/${recordId}/labs/${labId}`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ results, imageUrl })
            });

            if (res.ok) {
                showToast("Cập nhật kết quả cận lâm sàng thành công!", "success");
                closeLabResultModal();
                loadLabTechDashboard();
            } else {
                const data = await res.json();
                showToast(data.message || "Không thể cập nhật kết quả.", "danger");
            }
        } catch (err) {
            console.error("Lỗi khi nộp kết quả cận lâm sàng:", err);
            showToast("Lỗi kết nối máy chủ.", "danger");
        }
    });
}

// Expose Pharmacist & Labtech functions to global window object
window.loadPharmacistDashboard = loadPharmacistDashboard;
window.filterPharmacyRecords = filterPharmacyRecords;
window.dispenseMedicine = dispenseMedicine;
window.loadLabTechDashboard = loadLabTechDashboard;
window.filterLabtechRecords = filterLabtechRecords;
window.openLabResultModal = openLabResultModal;
window.closeLabResultModal = closeLabResultModal;

function openRestockModal(medId, name, currentStock) {
    document.getElementById('restock-medicine-id').value = medId;
    document.getElementById('restock-modal-name').value = name;
    document.getElementById('restock-modal-current').value = currentStock;
    document.getElementById('restock-modal-qty').value = '';
    
    document.getElementById('pharmacist-restock-modal').style.display = 'flex';
}

function closeRestockModal() {
    document.getElementById('pharmacist-restock-modal').style.display = 'none';
}

// Bắt sự kiện nộp form nhập kho
const restockForm = document.getElementById('pharmacist-restock-form');
if (restockForm) {
    restockForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const medId = document.getElementById('restock-medicine-id').value;
        const qty = parseInt(document.getElementById('restock-modal-qty').value, 10);

        try {
            const res = await fetch(`/api/medicines/${medId}/restock`, {
                method: 'PUT',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ quantity: qty })
            });

            if (res.ok) {
                showToast("Nhập kho thuốc thành công!", "success");
                closeRestockModal();
                loadPharmacistDashboard();
            } else {
                const data = await res.json();
                showToast(data.message || "Không thể nhập kho thuốc.", "danger");
            }
        } catch (err) {
            console.error("Lỗi khi nhập kho thuốc:", err);
            showToast("Lỗi kết nối máy chủ.", "danger");
        }
    });
}

window.openRestockModal = openRestockModal;
window.closeRestockModal = closeRestockModal;

function openMedicineModal(id = '', name = '', ingredient = '', unit = '', price = '', qty = '', instruction = '') {
    const isEdit = id !== '';
    document.getElementById('medicine-modal-title').innerHTML = isEdit 
        ? `<i class="fa-solid fa-edit"></i> Chỉnh Sửa Thông Tin Thuốc` 
        : `<i class="fa-solid fa-plus"></i> Thêm Thuốc / Hóa Chất Mới`;
    
    document.getElementById('medicine-modal-id').value = id;
    document.getElementById('medicine-modal-name').value = name;
    document.getElementById('medicine-modal-ingredient').value = ingredient;
    document.getElementById('medicine-modal-unit').value = unit;
    document.getElementById('medicine-modal-price').value = price;
    document.getElementById('medicine-modal-qty').value = qty;
    document.getElementById('medicine-modal-instruction').value = instruction;
    
    document.getElementById('pharmacist-medicine-modal').style.display = 'flex';
}

function closeMedicineModal() {
    document.getElementById('pharmacist-medicine-modal').style.display = 'none';
}

// Bắt sự kiện nộp form thêm/sửa thuốc
const medicineForm = document.getElementById('pharmacist-medicine-form');
if (medicineForm) {
    medicineForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const id = document.getElementById('medicine-modal-id').value;
        const name = document.getElementById('medicine-modal-name').value;
        const activeIngredient = document.getElementById('medicine-modal-ingredient').value;
        const unit = document.getElementById('medicine-modal-unit').value;
        const unitPrice = parseFloat(document.getElementById('medicine-modal-price').value);
        const stockQuantity = parseInt(document.getElementById('medicine-modal-qty').value, 10);
        const usageInstruction = document.getElementById('medicine-modal-instruction').value;

        const payload = { name, activeIngredient, unit, unitPrice, stockQuantity, usageInstruction };
        const isEdit = id !== '';
        const url = isEdit ? `/api/medicines/${id}` : '/api/medicines';
        const method = isEdit ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showToast(isEdit ? "Cập nhật thông tin thuốc thành công!" : "Thêm thuốc mới vào danh mục thành công!", "success");
                closeMedicineModal();
                loadPharmacistDashboard();
            } else {
                const data = await res.json();
                showToast(data.message || "Không thể lưu thông tin thuốc.", "danger");
            }
        } catch (err) {
            console.error("Lỗi khi lưu thông tin thuốc:", err);
            showToast("Lỗi kết nối máy chủ.", "danger");
        }
    });
}

async function deleteMedicine(id, name) {
    if (!confirm(`Bạn có chắc chắn muốn xóa thuốc/hóa chất '${name}' khỏi danh mục? Hành động này không thể hoàn tác.`)) {
        return;
    }

    try {
        const res = await fetch(`/api/medicines/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            showToast("Đã xóa thuốc khỏi danh mục thành công!", "success");
            loadPharmacistDashboard();
        } else {
            const data = await res.json();
            showToast(data.message || "Không thể xóa thuốc này.", "danger");
        }
    } catch (err) {
        console.error("Lỗi khi xóa thuốc:", err);
        showToast("Lỗi kết nối máy chủ.", "danger");
    }
}

window.openMedicineModal = openMedicineModal;
window.closeMedicineModal = closeMedicineModal;
window.deleteMedicine = deleteMedicine;

// ==========================================
// BÁC SĨ (DOCTOR) SMART PRESCRIBING LOGIC
// ==========================================
window.currentDoctorPrescription = [];
window.doctorMedicinesList = [];

async function loadMedicinesIntoDoctorSelect() {
    const select = document.getElementById('doctor-prescription-medicine');
    if (!select) return;
    select.innerHTML = '<option value="">-- Chọn thuốc/hóa chất --</option>';

    try {
        const res = await fetch('/api/medicines', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const medicines = await res.json();
            window.doctorMedicinesList = medicines;
            medicines.forEach(med => {
                const label = `${med.name} - ${med.unitPrice.toLocaleString('vi-VN')}đ / ${med.unit} (Tồn kho: ${med.stockQuantity})`;
                const option = document.createElement('option');
                option.value = med.medicineId;
                option.text = label;
                if (med.stockQuantity <= 0) {
                    option.disabled = true;
                    option.text += ' [Hết hàng]';
                }
                select.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Lỗi khi tải thuốc cho bác sĩ:", err);
    }
}

function updateUsageInstructionHint() {
    const select = document.getElementById('doctor-prescription-medicine');
    const instructionInput = document.getElementById('doctor-prescription-instruction');
    if (!select || !instructionInput) return;
    
    const medId = parseInt(select.value, 10);
    if (!medId || !window.doctorMedicinesList) {
        instructionInput.value = '';
        return;
    }
    
    const med = window.doctorMedicinesList.find(m => m.medicineId === medId);
    if (med) {
        instructionInput.value = med.usageInstruction || '';
    }
}

function addMedicineToPrescription() {
    const select = document.getElementById('doctor-prescription-medicine');
    const qtyInput = document.getElementById('doctor-prescription-qty');
    const instructionInput = document.getElementById('doctor-prescription-instruction');
    
    if (!select || !qtyInput || !instructionInput) return;
    
    const medId = parseInt(select.value, 10);
    const quantity = parseInt(qtyInput.value, 10);
    const usageInstruction = instructionInput.value.trim();
    
    if (!medId) {
        showToast("Vui lòng chọn thuốc/hóa chất.", "warning");
        return;
    }
    if (!quantity || quantity <= 0) {
        showToast("Số lượng phải lớn hơn 0.", "warning");
        return;
    }
    
    const med = window.doctorMedicinesList.find(m => m.medicineId === medId);
    if (!med) return;
    
    if (quantity > med.stockQuantity) {
        showToast(`Số lượng kê đơn (${quantity}) vượt quá tồn kho hiện tại của thuốc (${med.stockQuantity}).`, "warning");
        return;
    }
    
    const existingIndex = window.currentDoctorPrescription.findIndex(item => item.medicineId === medId);
    if (existingIndex !== -1) {
        // Kiểm tra tổng số lượng có vượt quá tồn kho không
        if (window.currentDoctorPrescription[existingIndex].quantity + quantity > med.stockQuantity) {
            showToast(`Tổng số lượng kê đơn (${window.currentDoctorPrescription[existingIndex].quantity + quantity}) vượt quá tồn kho (${med.stockQuantity}).`, "warning");
            return;
        }
        window.currentDoctorPrescription[existingIndex].quantity += quantity;
    } else {
        window.currentDoctorPrescription.push({
            medicineId: medId,
            medicineName: med.name,
            unit: med.unit,
            quantity: quantity,
            usageInstruction: usageInstruction
        });
    }
    
    select.value = '';
    qtyInput.value = '';
    instructionInput.value = '';
    
    updateDoctorPrescribedListUI();
}

function removeMedicineFromPrescription(index) {
    window.currentDoctorPrescription.splice(index, 1);
    updateDoctorPrescribedListUI();
}

function updateDoctorPrescribedListUI() {
    const container = document.getElementById('doctor-prescribed-list-container');
    const tbody = document.getElementById('doctor-prescribed-tbody');
    const textarea = document.getElementById('record-prescription');
    
    if (!container || !tbody || !textarea) return;
    tbody.innerHTML = '';
    
    if (window.currentDoctorPrescription.length === 0) {
        container.style.display = 'none';
        textarea.value = '';
        return;
    }
    
    container.style.display = 'block';
    
    let summaryText = '';
    window.currentDoctorPrescription.forEach((item, index) => {
        summaryText += `${item.medicineName} x ${item.quantity} ${item.unit} (${item.usageInstruction})\n`;
        
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid var(--border-color); font-size: 11.5px;">
                <td style="padding: 6px 8px; font-weight: 700; color: var(--dark);">${item.medicineName}</td>
                <td style="padding: 6px 8px; text-align: center; font-weight: 600;">x ${item.quantity} ${item.unit}</td>
                <td style="padding: 6px 8px; color: var(--text-muted); font-style: italic;">${item.usageInstruction}</td>
                <td style="padding: 6px 8px; text-align: center;">
                    <a href="#" style="color: var(--danger); text-decoration: none;" onclick="removeMedicineFromPrescription(${index}); return false;" title="Xóa thuốc"><i class="fa-solid fa-trash"></i></a>
                </td>
            </tr>
        `;
    });
    
    textarea.value = summaryText.trim();
}

window.loadMedicinesIntoDoctorSelect = loadMedicinesIntoDoctorSelect;
window.updateUsageInstructionHint = updateUsageInstructionHint;
window.addMedicineToPrescription = addMedicineToPrescription;
window.removeMedicineFromPrescription = removeMedicineFromPrescription;
