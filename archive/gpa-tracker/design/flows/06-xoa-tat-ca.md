# Flow 06 – Xoá tất cả môn học (F5)

```mermaid
flowchart TD
    Start([Người dùng bấm 'Xoá tất cả']) --> Empty{Danh sách rỗng?}
    Empty -- Có --> Disabled(["Nút bị vô hiệu hoá – không làm gì"])
    Empty -- Không --> Confirm{"Hộp xác nhận:<br/>'Xoá tất cả N môn học?<br/>Không thể hoàn tác.'"}
    Confirm -- "Huỷ / đóng hộp thoại" --> Cancel([Không thay đổi gì])
    Confirm -- Đồng ý --> Lock["Khoá nút 'Xoá tất cả'"]
    Lock --> Delete["DELETE toàn bộ môn của user trên Supabase<br/>(RLS giới hạn theo auth.uid)"]
    Delete --> DelOK{Thành công?}
    DelOK -- "Không (mất mạng / RLS / server)" --> Err["Báo: 'Không xoá được dữ liệu.<br/>Vui lòng thử lại.'<br/>Giữ nguyên danh sách, mở khoá nút"]
    Err --> Fail([Kết thúc – không thay đổi])
    DelOK -- Có --> Clear["Danh sách = rỗng"]
    Clear --> Cache["Ghi cache mảng rỗng (lỗi ghi → bỏ qua)"]
    Cache --> ResetForm["Nếu đang sửa: form về chế độ thêm, xoá trắng"]
    ResetForm --> Recalc[["Tính lại tổng kết (Flow 03)<br/>→ '—' và 'Hãy thêm môn học đầu tiên'"]]
    Recalc --> Done([Hoàn tất])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Danh sách rỗng | Nút "Xoá tất cả" bị vô hiệu hoá. |
| Người dùng bấm Huỷ | Không thay đổi gì. |
| Đang sửa một môn | Sau khi xoá, form về chế độ thêm. |
| Supabase lỗi / offline | Báo lỗi, danh sách và cache giữ nguyên (không xoá cache trước khi server xác nhận). |
| Chỉ xoá dữ liệu của chính user | Đảm bảo bởi RLS; câu lệnh vẫn lọc theo `user_id` để không phụ thuộc vào việc RLS có bật hay không. |
