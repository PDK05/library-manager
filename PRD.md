# PRD – Library Manager (Ứng dụng quản lý thư viện)

## 1. Tổng quan
### 1.1 Mục tiêu
Ứng dụng web giúp thư viện quản lý đầu sách, độc giả, việc mượn/trả sách và tiền phạt quá hạn.
Độc giả đăng nhập để tra cứu sách và theo dõi sách mình đang mượn. Dữ liệu lưu trên Supabase.

### 1.2 Đối tượng sử dụng
- **Thủ thư:** quản lý sách, độc giả, lập phiếu mượn, nhận trả, thu tiền phạt.
- **Độc giả:** tra cứu sách, xem sách đang mượn, hạn trả, lịch sử mượn và tiền phạt của mình.

### 1.3 Phạm vi
- Trong phạm vi: đăng nhập/phân quyền, quản lý sách, quản lý độc giả, mượn/trả sách, quá hạn và phạt.
- Ngoài phạm vi: đặt trước sách, gia hạn phiếu mượn, quản lý từng bản sách theo mã vạch,
  thanh toán trực tuyến, gửi email/SMS nhắc hạn, nhập dữ liệu từ file Excel, chế độ offline.

### 1.4 Tham số nghiệp vụ (giá trị đề xuất – cần duyệt)
| Tham số | Giá trị |
|---------|---------|
| Thời hạn mượn | 14 ngày kể từ ngày mượn |
| Số sách tối đa một độc giả mượn cùng lúc | 5 cuốn |
| Tiền phạt quá hạn | 5.000 đ / ngày trễ / cuốn |
| Thời hạn thẻ độc giả mặc định | 1 năm kể từ ngày tạo |
| Múi giờ tính ngày | Asia/Ho_Chi_Minh, tính theo ngày lịch |
| Số dòng mỗi trang danh sách | 20 |

## 2. Chức năng
### F1. Đăng nhập và phân quyền
- Đăng nhập bằng email + mật khẩu (Supabase Auth). Sau đăng nhập, thủ thư vào trang quản trị,
  độc giả vào trang độc giả.
- Tài khoản thủ thư do quản trị viên tạo sẵn trong Supabase; không có đăng ký thủ thư trên giao diện.
- Độc giả tự đăng ký tài khoản bằng **đúng email đã được thủ thư khai báo** trong hồ sơ độc giả (F3).
  Email không có trong danh sách độc giả hoặc đã có tài khoản → từ chối đăng ký.
- Mật khẩu tối thiểu 8 ký tự. Có nút Đăng xuất.
- Row Level Security: thủ thư đọc/ghi mọi dữ liệu; độc giả chỉ đọc danh mục sách và phiếu mượn,
  tiền phạt của chính mình.
- Phiên đăng nhập hết hạn → quay về trang đăng nhập, báo bằng tiếng Việt.

### F2. Quản lý sách (thủ thư)
**Flow:** thêm / sửa / xoá đầu sách, tìm kiếm, xem danh sách có phân trang.

**Validation Rules:**
- Tên sách: bắt buộc, tối đa 200 ký tự (bỏ khoảng trắng 2 đầu).
- Tác giả: bắt buộc, tối đa 100 ký tự.
- Thể loại: bắt buộc, tối đa 50 ký tự.
- ISBN: không bắt buộc; nếu nhập thì là 10 hoặc 13 chữ số (cho phép dấu gạch ngang, được bỏ khi lưu),
  không trùng với sách khác.
- Năm xuất bản: không bắt buộc; số nguyên từ 1000 đến năm hiện tại.
- Số lượng: số nguyên từ 1 đến 1000. Khi sửa, không được nhỏ hơn số cuốn đang cho mượn.
- Số còn lại = Số lượng − số cuốn đang cho mượn (hệ thống tự tính, không nhập tay).
- Lỗi hiển thị ngay dưới ô nhập tương ứng, bằng tiếng Việt.

**Xoá:** cần xác nhận; không được xoá khi còn cuốn đang cho mượn. Lịch sử mượn của sách đã xoá vẫn được giữ.

**Tìm kiếm:** theo tên sách, tác giả, thể loại, ISBN; không phân biệt hoa thường và dấu tiếng Việt.
Không có kết quả → "Không tìm thấy sách phù hợp".

### F3. Quản lý độc giả (thủ thư)
- Thêm / sửa / xoá / tìm độc giả (theo mã thẻ, họ tên, email, số điện thoại).
- Mã thẻ: hệ thống tự sinh dạng `DG000001`, không sửa được.
- Họ tên: bắt buộc, tối đa 100 ký tự.
- Email: bắt buộc, đúng định dạng, không trùng; lưu chữ thường. Không sửa được khi độc giả đã có tài khoản.
- Số điện thoại: bắt buộc, 10 chữ số, bắt đầu bằng 0.
- Ngày hết hạn thẻ: mặc định 1 năm kể từ ngày tạo; khi sửa phải là ngày từ hôm nay trở đi.
- Trạng thái: Hoạt động / Bị khoá.
- Xoá: cần xác nhận; không được xoá khi độc giả còn sách đang mượn hoặc còn tiền phạt chưa thanh toán.

### F4. Mượn sách (thủ thư)
- Thủ thư chọn độc giả và một đầu sách; mỗi phiếu mượn là một cuốn.
- Điều kiện được mượn (vi phạm điều nào thì báo lý do tương ứng):
  1. Thẻ độc giả đang Hoạt động và chưa hết hạn.
  2. Độc giả không có sách quá hạn chưa trả.
  3. Độc giả không còn tiền phạt chưa thanh toán.
  4. Số sách đang mượn < 5.
  5. Độc giả chưa đang mượn cùng đầu sách này.
  6. Sách còn ít nhất 1 cuốn.
- Ngày mượn = hôm nay, hạn trả = ngày mượn + 14 ngày.
- Lập phiếu là một thao tác nguyên tử trên CSDL: hai thủ thư cùng cho mượn cuốn cuối cùng
  thì chỉ một người thành công.

### F5. Trả sách (thủ thư)
- Thủ thư tìm phiếu đang mượn (theo độc giả hoặc sách), bấm "Nhận trả" và xác nhận.
- Ngày trả = hôm nay. Số còn lại của sách tăng 1.
- Trả trễ → tự tạo khoản phạt = số ngày trễ × 5.000 đ, trạng thái "Chưa thanh toán".

### F6. Quá hạn và tiền phạt (thủ thư)
- Danh sách phiếu quá hạn: độc giả, sách, hạn trả, số ngày trễ, tiền phạt dự kiến tính đến hôm nay;
  sắp xếp theo số ngày trễ giảm dần.
- Danh sách tiền phạt chưa thanh toán; nút "Đã thu tiền" (có xác nhận) chuyển sang "Đã thanh toán"
  và ghi ngày thu.

### F7. Trang độc giả
- Tra cứu sách (như tìm kiếm F2, chỉ xem), thấy số cuốn còn lại.
- Xem sách đang mượn với hạn trả; sách quá hạn được làm nổi bật kèm tiền phạt dự kiến.
- Xem lịch sử mượn và các khoản phạt của mình.

## 3. Yêu cầu phi chức năng
- Giao diện responsive (điện thoại ≥ 360px), tiếng Việt, dễ đọc.
- Công nghệ: Vite + HTML/CSS/JavaScript thuần, Supabase (PostgreSQL + Auth) làm CSDL. Unit test bằng Vitest.
- Lỗi kết nối/ghi Supabase: báo lỗi bằng tiếng Việt, không mất dữ liệu đang nhập trong form.
- Triển khai: Vercel, có URL công khai.

## 4. Danh sách chức năng & trạng thái
| STT | Chức năng              | Mã | Phụ thuộc  | Trạng thái   |
|-----|------------------------|----|------------|--------------|
| 1   | Đăng nhập & phân quyền | F1 | –          | [x] Xong |
| 2   | Quản lý sách           | F2 | F1         | [x] Xong |
| 3   | Quản lý độc giả        | F3 | F1         | [x] Xong |
| 4   | Mượn sách              | F4 | F2, F3     | [x] Xong |
| 5   | Trả sách               | F5 | F4         | [x] Xong |
| 6   | Quá hạn & tiền phạt    | F6 | F5         | [ ] Chưa làm |
| 7   | Trang độc giả          | F7 | F2, F4, F6 | [ ] Chưa làm |
