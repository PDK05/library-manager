# Common errors

Lỗi đã gặp và cách sửa, nhóm theo loại. Xem trước khi viết code mới ở khu vực liên quan.

## Xử lý lỗi Supabase Auth (F1)

- **Lỗi:** đăng ký bằng email có tên miền không nhận được thư (`.test`, sai chính tả) báo nhầm "Không kết nối được máy chủ".
  - **Nguyên nhân:** `signupErrorMessage` (`src/auth/errors.js`) không biết mã `email_address_invalid` nên rơi xuống nhánh lỗi chung.
  - **Cách sửa:** thêm thông báo `emailRejected` và nhánh riêng theo `error.code`, kèm dòng test trong `errors.test.js` (commit 86d85a5).
  - **Bài học:** khi gặp mã lỗi Supabase mới, map theo `error.code` và thêm test. Đừng để lỗi lạ rơi vào thông báo "mất kết nối". Trigger `lien_ket_tai_khoan` trả lỗi không có code ("Database error saving new user") nên phải nhận diện theo nội dung.

## Cấu hình repo / Windows

- **Lỗi:** xuống dòng CRLF/LF lẫn lộn giữa các máy, và thư mục tạm của Playwright MCP lọt vào git.
  - **Cách sửa:** thêm `.gitattributes` (`* text=auto eol=lf`, riêng `.bat/.cmd/.ps1` giữ CRLF) và bổ sung `.gitignore` (commit b66b9a2).
  - **Bài học:** thiết lập chuẩn hoá xuống dòng ngay từ đầu dự án trên Windows, và kiểm tra `git status` sau khi chạy MCP để không commit file sinh ra.
