# Flow 01 – Đăng nhập và phân quyền (F1)

## 1a. Mở trang và đăng nhập

```mermaid
flowchart TD
    Start([Mở trang]) --> Sess{"Có phiên Supabase<br/>còn hiệu lực?"}
    Sess -- Không --> LoginForm["Hiện form đăng nhập"]
    Sess -- Có --> Role[["Xác định vai trò (1d)"]]

    LoginForm --> Submit["Nhập email + mật khẩu<br/>Nhấn 'Đăng nhập' hoặc Enter"]
    Submit --> Busy{Đang chờ<br/>lần trước?}
    Busy -- Có --> Ignore([Bỏ qua lần bấm])
    Busy -- Không --> V1{"Email rỗng hoặc<br/>sai định dạng?"}
    V1 -- Có --> E1["Lỗi dưới ô email:<br/>'Vui lòng nhập email hợp lệ'"] --> LoginForm
    V1 -- Không --> V2{Mật khẩu rỗng?}
    V2 -- Có --> E2["Lỗi: 'Vui lòng nhập mật khẩu'"] --> LoginForm
    V2 -- Không --> Lock["Khoá nút"] --> Auth["signInWithPassword"]
    Auth --> AuthOK{Kết quả?}
    AuthOK -- "Sai email / mật khẩu" --> E3["Báo: 'Email hoặc mật khẩu không đúng'<br/>Xoá ô mật khẩu, giữ email"] --> Unlock[Mở khoá nút] --> LoginForm
    AuthOK -- "Mất mạng / lỗi server" --> E4["Báo: 'Không kết nối được máy chủ.<br/>Vui lòng thử lại.'"] --> Unlock
    AuthOK -- "Quá nhiều lần thử" --> E5["Báo: 'Bạn thử quá nhiều lần.<br/>Vui lòng đợi rồi thử lại.'"] --> Unlock
    AuthOK -- Thành công --> Role
```

## 1b. Độc giả đăng ký tài khoản

```mermaid
flowchart TD
    Start([Bấm 'Đăng ký tài khoản độc giả']) --> Form["Nhập email, mật khẩu, nhập lại mật khẩu"]
    Form --> V{"Kiểm tra form"}
    V -- "Email sai định dạng" --> E1["'Vui lòng nhập email hợp lệ'"] --> Form
    V -- "Mật khẩu < 8 ký tự" --> E2["'Mật khẩu tối thiểu 8 ký tự'"] --> Form
    V -- "Nhập lại không khớp" --> E3["'Mật khẩu nhập lại không khớp'"] --> Form
    V -- Hợp lệ --> Norm["Email = trim + chữ thường"] --> SignUp["signUp<br/>Trigger CSDL tìm hồ sơ độc giả<br/>có email này và chưa xoá"]
    SignUp --> R{Kết quả?}
    R -- "Không có hồ sơ độc giả với email này" --> E4["'Email chưa được đăng ký tại thư viện.<br/>Vui lòng liên hệ thủ thư.'"] --> Form
    R -- "Email đã có tài khoản" --> E5["'Email này đã có tài khoản. Vui lòng đăng nhập.'"] --> Form
    R -- "Mất mạng / lỗi server" --> E6["'Không kết nối được máy chủ.<br/>Vui lòng thử lại.'<br/>Giữ dữ liệu đã nhập"] --> Form
    R -- "Thành công: liên kết tài khoản với hồ sơ độc giả" --> Role[["Xác định vai trò (1d)"]]
```

## 1c. Đăng xuất và hết phiên

```mermaid
flowchart TD
    A([Bấm 'Đăng xuất']) --> Out["signOut<br/>(lỗi mạng vẫn xoá phiên ở máy)"] --> Login([Về trang đăng nhập])
    B([Bất kỳ thao tác nào trả về lỗi phiên hết hạn / JWT không hợp lệ]) --> Refresh{Làm mới token<br/>thành công?}
    Refresh -- Có --> Retry([Thực hiện lại thao tác một lần])
    Refresh -- Không --> Msg["Báo: 'Phiên đăng nhập đã hết hạn.<br/>Vui lòng đăng nhập lại.'"] --> Login
```

## 1d. Sub-flow xác định vai trò

```mermaid
flowchart TD
    In([Đã có phiên]) --> Q["Đọc hồ sơ của user hiện tại<br/>(bảng nhân viên / độc giả)"]
    Q --> Ok{Đọc được?}
    Ok -- "Lỗi mạng" --> Err["'Không kết nối được máy chủ.'<br/>Nút 'Thử lại'"] --> Q
    Ok -- Có --> R{Vai trò?}
    R -- Thủ thư --> Admin([Trang quản trị])
    R -- Độc giả --> St{"Thẻ Hoạt động?"}
    St -- "Bị khoá" --> Locked["Vẫn vào trang độc giả,<br/>hiện cảnh báo 'Thẻ của bạn đang bị khoá'"] --> Reader([Trang độc giả])
    St -- "Hoạt động" --> Reader
    R -- "Không có hồ sơ / hồ sơ đã bị xoá" --> NoRole["signOut<br/>Báo: 'Tài khoản không còn hiệu lực.<br/>Vui lòng liên hệ thủ thư.'"] --> Login([Trang đăng nhập])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Email có khoảng trắng / chữ hoa | Trim và đổi chữ thường trước khi gửi. |
| Sai mật khẩu | Thông báo chung "Email hoặc mật khẩu không đúng" (không tiết lộ email có tồn tại hay không). |
| Đăng ký bằng email không có trong hồ sơ độc giả | Từ chối, hướng dẫn liên hệ thủ thư. |
| Đăng ký email đã có tài khoản | Từ chối, gợi ý đăng nhập. |
| Thủ thư cố đăng ký qua form độc giả | Email thủ thư không có trong bảng độc giả → bị từ chối. |
| Độc giả bị xoá (mềm) khi đang đăng nhập | Lần đọc hồ sơ tiếp theo → đăng xuất, báo tài khoản không còn hiệu lực. |
| Độc giả bị khoá thẻ | Vẫn đăng nhập xem được thông tin của mình; chỉ không được mượn sách (Flow 04). |
| Độc giả gõ URL trang quản trị | Router kiểm tra vai trò → chuyển về trang độc giả; RLS chặn mọi truy vấn quản trị dù client bị sửa. |
| Phiên hết hạn giữa chừng khi đang nhập form | Thử làm mới token; nếu thất bại thì về trang đăng nhập (dữ liệu form chưa lưu sẽ mất — báo rõ trong thông báo). |
| Mở nhiều tab, đăng xuất ở một tab | Các tab khác nhận sự kiện `SIGNED_OUT` từ `onAuthStateChange` → về trang đăng nhập. |
