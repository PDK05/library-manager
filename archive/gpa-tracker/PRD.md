# PRD – GPA Tracker (Ứng dụng tính điểm trung bình tích lũy)

## 1. Tổng quan
### 1.1 Mục tiêu
Ứng dụng web giúp sinh viên nhập điểm các môn đã học và xem ngay điểm trung bình
tích lũy (GPA) hệ 4 và hệ 10, cùng xếp loại học lực. Không cần đăng nhập; dữ liệu lưu trên Supabase.

### 1.2 Đối tượng sử dụng
- Sinh viên đại học học theo tín chỉ.

### 1.3 Phạm vi
- Trong phạm vi: nhập/sửa/xoá môn học, quy đổi điểm, tính GPA, lưu dữ liệu trên Supabase (kèm bản sao trên trình duyệt).
- Ngoài phạm vi: tài khoản người dùng, đồng bộ nhiều máy, nhập từ file Excel.

## 2. Chức năng
### F1. Thêm môn học
**Flow:**
1. Người dùng nhập Tên môn, Số tín chỉ, Điểm hệ 10 vào form.
2. Nhấn "Thêm môn" (hoặc Enter).
3. Hệ thống kiểm tra dữ liệu; hợp lệ thì thêm vào bảng, xoá trắng form, đặt con trỏ vào ô Tên môn.

**Validation Rules:**
- Tên môn: không để trống, tối đa 100 ký tự (bỏ khoảng trắng 2 đầu).
- Số tín chỉ: số nguyên từ 1 đến 10.
- Điểm hệ 10: số từ 0 đến 10, chấp nhận cả dấu phẩy (8,5) và dấu chấm (8.5);
  làm tròn 1 chữ số thập phân.
- Lỗi hiển thị ngay dưới ô nhập tương ứng, bằng tiếng Việt.

### F2. Quy đổi điểm
| Điểm hệ 10 | Điểm chữ | Hệ 4 |
|------------|----------|------|
| 8.5 – 10   | A        | 4.0  |
| 8.0 – 8.4  | B+       | 3.5  |
| 7.0 – 7.9  | B        | 3.0  |
| 6.5 – 6.9  | C+       | 2.5  |
| 5.5 – 6.4  | C        | 2.0  |
| 5.0 – 5.4  | D+       | 1.5  |
| 4.0 – 4.9  | D        | 1.0  |
| < 4.0      | F        | 0.0  |

### F3. Tính GPA và xếp loại
- GPA hệ 4 = Σ(điểm hệ 4 × tín chỉ) / Σ tín chỉ; GPA hệ 10 tương tự. Làm tròn 2 chữ số.
- Hiển thị: tổng số môn, tổng tín chỉ, tín chỉ đạt (điểm ≥ 4.0), GPA hệ 4, GPA hệ 10.
- Xếp loại theo GPA hệ 4: Xuất sắc (3.6–4.0), Giỏi (3.2–<3.6), Khá (2.5–<3.2),
  Trung bình (2.0–<2.5), Yếu (<2.0).
- Chưa có môn nào: hiển thị "—" và dòng hướng dẫn "Hãy thêm môn học đầu tiên".

### F4. Sửa và xoá môn học
- Mỗi dòng có nút "Sửa" (đưa dữ liệu lên form, nút đổi thành "Lưu") và "Xoá".
- Xoá cần xác nhận. Sửa dùng cùng validation với F1.

### F5. Lưu dữ liệu
- Mọi thay đổi lưu vào Supabase (bảng môn học), tải lại trang không mất dữ liệu.
- Không có màn hình đăng nhập: mỗi trình duyệt là một người dùng ẩn danh (Supabase anonymous sign-in).
  Row Level Security chỉ cho phép mỗi người đọc/ghi môn học của chính mình.
- Bản sao lưu trong localStorage (key: "gpa-tracker:v1") để hiển thị ngay khi tải trang
  và khi không kết nối được Supabase; có mạng lại thì dữ liệu Supabase là chuẩn.
- Lỗi khi lưu lên Supabase: báo lỗi bằng tiếng Việt, không mất dữ liệu đang nhập.
- Dữ liệu localStorage hỏng/không đọc được: bỏ qua, khởi tạo danh sách rỗng, không làm trắng trang.
- Nút "Xoá tất cả" (có xác nhận).

## 3. Yêu cầu phi chức năng
- Giao diện responsive (điện thoại ≥ 360px), tiếng Việt, dễ đọc.
- Công nghệ: Vite + HTML/CSS/JavaScript thuần, Supabase (PostgreSQL) làm CSDL. Unit test bằng Vitest.
- Triển khai: Vercel, có URL công khai.

## 4. Danh sách chức năng & trạng thái
| STT | Chức năng       | Mã  | Phụ thuộc | Trạng thái |
|-----|-----------------|-----|-----------|------------|
| 1   | Thêm môn học    | F1  | –         | [ ] Chưa làm |
| 2   | Quy đổi điểm    | F2  | F1        | [ ] Chưa làm |
| 3   | Tính GPA        | F3  | F2        | [ ] Chưa làm |
| 4   | Sửa/xoá môn     | F4  | F1        | [ ] Chưa làm |
| 5   | Lưu dữ liệu     | F5  | F1, F4    | [ ] Chưa làm |
