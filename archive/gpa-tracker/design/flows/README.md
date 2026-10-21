# Business flows – GPA Tracker

Mỗi file mô tả một flow nghiệp vụ bằng Mermaid, gồm cả happy path và edge case.

| File | Flow | Chức năng |
|------|------|-----------|
| [01-khoi-dong.md](01-khoi-dong.md) | Mở trang: đọc cache, đăng nhập ẩn danh, tải dữ liệu Supabase | F5 |
| [02-them-mon.md](02-them-mon.md) | Thêm môn học (kèm sub-flow kiểm tra dữ liệu dùng chung) | F1, F5 |
| [03-tinh-gpa.md](03-tinh-gpa.md) | Quy đổi điểm, tính GPA, xếp loại, hiển thị tổng kết | F2, F3 |
| [04-sua-mon.md](04-sua-mon.md) | Sửa môn học | F4, F5 |
| [05-xoa-mon.md](05-xoa-mon.md) | Xoá một môn học | F4, F5 |
| [06-xoa-tat-ca.md](06-xoa-tat-ca.md) | Xoá tất cả môn học | F5 |

## Quyết định thiết kế chung (PRD chưa nói rõ — cần duyệt)

1. **Ghi Supabase trước, cập nhật giao diện sau (pessimistic write).** Thêm/sửa/xoá chỉ thay đổi danh sách và cache sau khi Supabase trả về thành công. Nhờ vậy khi lỗi, form vẫn giữ nguyên dữ liệu đang nhập (PRD F5) và không cần cơ chế rollback.
2. **Offline = chỉ xem.** Khi không kết nối được Supabase, trang hiển thị dữ liệu từ cache; thao tác ghi vẫn cho thử nhưng sẽ báo lỗi. Không có hàng đợi đồng bộ (ngoài phạm vi: "đồng bộ nhiều máy").
3. **Chống bấm hai lần:** nút gửi / nút xác nhận bị vô hiệu hoá trong lúc chờ Supabase.
4. **Cho phép trùng tên môn** (sinh viên có thể học lại một môn).
5. **Xếp loại dựa trên GPA hệ 4 đã làm tròn 2 chữ số** — khớp với con số người dùng nhìn thấy (vd. 3.595 → 3.60 → Xuất sắc).
6. **Điểm: kiểm tra khoảng [0, 10] trên giá trị gốc rồi mới làm tròn** (vd. `10.04` → 10.0 hợp lệ; `10.05` → báo lỗi).
7. **Có nút "Huỷ" khi đang sửa** để quay về chế độ thêm mà không lưu (PRD chỉ nêu "Sửa"/"Lưu").
8. **Cache hỏng một phần:** JSON không đọc được hoặc không phải mảng → danh sách rỗng; phần tử nào sai cấu trúc thì bỏ qua phần tử đó, giữ các phần tử hợp lệ.
9. **Ghi localStorage thất bại** (đầy bộ nhớ, chế độ riêng tư) → bỏ qua im lặng; Supabase vẫn là nguồn dữ liệu chuẩn.
