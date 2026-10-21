# Flow 03 – Quản lý độc giả (F3)

## 3a. Thêm / sửa độc giả

```mermaid
flowchart TD
    Start([Bấm 'Thêm độc giả' hoặc 'Sửa']) --> Mode{Chế độ?}
    Mode -- Thêm --> Empty["Form trống<br/>Ngày hết hạn mặc định = hôm nay + 1 năm<br/>Trạng thái = Hoạt động"]
    Mode -- Sửa --> Load["Đưa dữ liệu lên form, mã thẻ chỉ đọc<br/>Email chỉ đọc nếu độc giả đã có tài khoản<br/>Nút 'Lưu' + 'Huỷ'"]
    Empty & Load --> Input["Nhập / chỉnh dữ liệu, nhấn nút hoặc Enter"]
    Input --> Cancel{Bấm 'Huỷ'?}
    Cancel -- Có --> Reset
    Cancel -- Không --> Busy{Đang chờ lưu?}
    Busy -- Có --> Ignore([Bỏ qua])
    Busy -- Không --> Validate[["Kiểm tra dữ liệu (3b)"]]
    Validate --> Valid{Hợp lệ?}
    Valid -- Không --> ShowErr["Lỗi dưới từng ô sai, focus ô sai đầu tiên"] --> Input
    Valid -- Có --> Lock["Khoá nút"] --> Save["Thêm: INSERT (CSDL sinh mã thẻ DG000001…)<br/>Sửa: UPDATE … WHERE id = ? AND da_xoa = false"]
    Save --> R{Kết quả?}
    R -- "Trùng email" --> E1["Lỗi dưới ô Email: 'Email đã được sử dụng'"] --> Unlock[Mở khoá] --> Input
    R -- "Sửa: 0 dòng" --> E2["'Độc giả không còn tồn tại'<br/>Bỏ dòng khỏi danh sách"] --> Reset
    R -- "Mất mạng / RLS / server" --> E3["Báo lỗi chung, giữ dữ liệu form"] --> Unlock
    R -- Thành công --> Apply["Cập nhật danh sách bằng dữ liệu trả về<br/>Thêm mới: hiện mã thẻ vừa sinh"]
    Apply --> Reset["Xoá trắng form, về chế độ Thêm, focus ô Họ tên"] --> Done([Hoàn tất])
```

## 3b. Sub-flow kiểm tra dữ liệu độc giả

```mermaid
flowchart TD
    In([Giá trị thô]) --> N["Họ tên = trim, gộp khoảng trắng liên tiếp"] --> N1{"Rỗng / > 100 ký tự?"}
    N1 -- Rỗng --> EN1["'Vui lòng nhập họ tên'"]
    N1 -- "> 100" --> EN2["'Họ tên tối đa 100 ký tự'"]
    N1 -- Không --> NOK[OK]

    In --> M["Email = trim, chữ thường"] --> M1{Rỗng?}
    M1 -- Có --> EM1["'Vui lòng nhập email'"]
    M1 -- Không --> M2{"Đúng định dạng<br/>x@y.z, ≤ 254 ký tự?"}
    M2 -- Không --> EM2["'Email không hợp lệ'"]
    M2 -- Có --> MOK[OK]

    In --> P["SĐT = trim, bỏ khoảng trắng, '.', '-'"] --> P1{Rỗng?}
    P1 -- Có --> EP1["'Vui lòng nhập số điện thoại'"]
    P1 -- Không --> P2{"Đúng 10 chữ số,<br/>bắt đầu bằng 0?"}
    P2 -- Không --> EP2["'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0'"]
    P2 -- Có --> POK[OK]

    In --> D["Ngày hết hạn"] --> D1{Hợp lệ?}
    D1 -- "Rỗng / sai định dạng" --> ED1["'Vui lòng chọn ngày hết hạn'"]
    D1 -- "Trước hôm nay" --> ED2["'Ngày hết hạn phải từ hôm nay trở đi'"]
    D1 -- Có --> DOK[OK]

    NOK & MOK & POK & DOK --> AllOK([Hợp lệ nếu không có lỗi])
    EN1 & EN2 & EM1 & EM2 & EP1 & EP2 & ED1 & ED2 --> Fail([Lỗi theo từng ô])
```

## 3c. Xoá độc giả

```mermaid
flowchart TD
    Start([Bấm 'Xoá' trên một dòng]) --> Confirm{"Xác nhận:<br/>'Xoá độc giả «họ tên» («mã thẻ»)?'"}
    Confirm -- Huỷ --> End([Kết thúc])
    Confirm -- Đồng ý --> Lock["Khoá nút"] --> Del["RPC xoa_doc_gia: trong một transaction<br/>kiểm tra phiếu đang mượn và phạt chưa thanh toán<br/>rồi xoá mềm"]
    Del --> R{Kết quả?}
    R -- "Còn sách đang mượn" --> E1["'Không thể xoá: độc giả còn N sách chưa trả'"] --> Unlock[Mở khoá] --> End
    R -- "Còn tiền phạt" --> E2["'Không thể xoá: độc giả còn X đ tiền phạt chưa thanh toán'"] --> Unlock
    R -- "Lỗi mạng / RLS / server" --> E3["Báo lỗi chung, giữ dòng"] --> Unlock
    R -- "Thành công (kể cả đã xoá trước đó)" --> Remove["Bỏ dòng khỏi danh sách<br/>Tài khoản đăng nhập (nếu có) mất hiệu lực (Flow 1d)"] --> End
```

## 3d. Tìm kiếm

Giống Flow 2d, tìm trên mã thẻ, họ tên, email, số điện thoại. Mỗi dòng hiển thị trạng thái thẻ:
**Hoạt động**, **Bị khoá**, hoặc **Hết hạn** (tính động khi `ngay_het_han < hôm nay`).
Không có kết quả → "Không tìm thấy độc giả phù hợp"; chưa có ai → "Chưa có độc giả nào".

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Email `An@Gmail.COM ` | Lưu `an@gmail.com`; trùng không phân biệt hoa thường. |
| Email trùng độc giả đã xoá mềm | Cho phép (unique chỉ áp dụng cho độc giả chưa xoá). |
| SĐT `090 123 4567` / `+84901234567` | Hợp lệ (bỏ khoảng trắng) / lỗi (PRD yêu cầu bắt đầu bằng 0). |
| Đổi email khi độc giả đã có tài khoản | Ô email bị khoá; CSDL cũng từ chối để email hồ sơ luôn khớp tài khoản. |
| Khoá thẻ độc giả đang mượn sách | Cho phép; độc giả không mượn thêm được, vẫn trả sách bình thường. |
| Gia hạn thẻ đã hết hạn | Sửa ngày hết hạn sang ngày ≥ hôm nay → trạng thái hiển thị về Hoạt động. |
| Hai thủ thư cùng thêm độc giả | Mã thẻ sinh từ sequence trong CSDL nên không trùng. |
| Xoá độc giả có phạt đã thanh toán, không còn sách mượn | Cho phép; lịch sử vẫn giữ. |
