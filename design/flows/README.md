# Business flows – Library Manager

Mỗi file mô tả một flow nghiệp vụ bằng Mermaid, gồm cả happy path và edge case.

| File | Flow | Chức năng |
|------|------|-----------|
| [01-dang-nhap.md](01-dang-nhap.md) | Mở trang, đăng nhập, đăng ký độc giả, đăng xuất, hết phiên | F1 |
| [02-quan-ly-sach.md](02-quan-ly-sach.md) | Thêm / sửa / xoá / tìm sách (kèm sub-flow kiểm tra dữ liệu) | F2 |
| [03-quan-ly-doc-gia.md](03-quan-ly-doc-gia.md) | Thêm / sửa / xoá / tìm độc giả | F3 |
| [04-muon-sach.md](04-muon-sach.md) | Lập phiếu mượn, kiểm tra điều kiện mượn | F4 |
| [05-tra-sach.md](05-tra-sach.md) | Nhận trả sách, tính tiền phạt | F5 |
| [06-qua-han-phat.md](06-qua-han-phat.md) | Danh sách quá hạn, thu tiền phạt | F6 |
| [07-trang-doc-gia.md](07-trang-doc-gia.md) | Độc giả tra cứu sách, xem phiếu mượn và tiền phạt | F7 |

## Quyết định thiết kế chung (PRD chưa nói rõ — cần duyệt)

1. **Ghi Supabase trước, cập nhật giao diện sau (pessimistic write).** Giao diện chỉ thay đổi khi Supabase trả về thành công; khi lỗi, form giữ nguyên dữ liệu đang nhập và không cần rollback.
2. **Quy tắc nghiệp vụ quan trọng chạy trong Postgres** (hàm RPC `lap_phieu_muon`, `nhan_tra_sach`, `thu_tien_phat` trong một transaction, khoá dòng bằng `SELECT … FOR UPDATE`). Client vẫn kiểm tra trước để báo lỗi sớm, nhưng CSDL là nơi quyết định cuối cùng — tránh hai thủ thư cùng cho mượn cuốn cuối.
3. **"Hôm nay" lấy theo giờ server, múi giờ Asia/Ho_Chi_Minh**, không tin đồng hồ máy người dùng. Số ngày trễ = ngày trả − hạn trả (theo ngày lịch); trả đúng ngày hạn trả là không trễ.
4. **Xoá sách là xoá mềm** (cột `da_xoa`): sách biến mất khỏi danh mục và tìm kiếm nhưng phiếu mượn cũ vẫn tham chiếu được. Xoá độc giả cũng là xoá mềm vì lý do tương tự; email của độc giả đã xoá được giải phóng để dùng lại.
5. **Thẻ hết hạn được tính động** (so sánh `ngay_het_han` với hôm nay), không phải một trạng thái lưu riêng. Trạng thái lưu chỉ có Hoạt động / Bị khoá.
6. **Chống bấm hai lần:** nút gửi / nút xác nhận bị vô hiệu hoá trong lúc chờ Supabase.
7. **Cho phép trùng tên sách** (khác tác giả, khác lần xuất bản); chỉ ISBN là duy nhất.
8. **Tìm kiếm không dấu:** dùng extension `unaccent` của Postgres; chuỗi tìm kiếm được trim, rỗng = hiện toàn bộ danh sách.
9. **Lỗi chung khi gọi Supabase:** mất mạng / lỗi server → "Không kết nối được máy chủ. Vui lòng thử lại."; RLS từ chối → "Bạn không có quyền thực hiện thao tác này."; hết phiên → Flow 01c.
10. **Không có chế độ offline:** không cache dữ liệu nghiệp vụ trong `localStorage` (khác bản GPA cũ), vì dữ liệu dùng chung nhiều người và thay đổi liên tục.
