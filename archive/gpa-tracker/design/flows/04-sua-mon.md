# Flow 04 – Sửa môn học (F4, F5)

```mermaid
flowchart TD
    Start([Người dùng bấm 'Sửa' trên một dòng]) --> Editing{"Form đang sửa<br/>môn khác?"}
    Editing -- Có --> Discard["Bỏ thay đổi chưa lưu của môn trước"] --> Load
    Editing -- Không --> Load["Đưa tên, tín chỉ, điểm lên form<br/>Ghi nhớ id môn đang sửa<br/>Nút đổi thành 'Lưu', hiện nút 'Huỷ'<br/>Đánh dấu dòng đang sửa, focus ô Tên môn"]
    Load --> Act{Người dùng chọn}
    Act -- "Huỷ (hoặc Esc)" --> Reset
    Act -- "Bấm 'Xoá' trên chính dòng đang sửa" --> DelFlow[["Flow 05 – Xoá môn"]]
    DelFlow --> Reset
    Act -- "'Lưu' hoặc Enter" --> Busy{Đang chờ lưu?}
    Busy -- Có --> Load
    Busy -- Không --> Validate[["Kiểm tra dữ liệu (Flow 02 – 2b)"]]
    Validate --> Valid{Hợp lệ?}
    Valid -- Không --> ShowErr["Hiện lỗi dưới ô sai<br/>Giữ nguyên dữ liệu, vẫn ở chế độ sửa"] --> Load
    Valid -- Có --> Same{"Dữ liệu không đổi<br/>so với bản gốc?"}
    Same -- Có --> Reset
    Same -- Không --> Lock[Khoá nút 'Lưu']
    Lock --> Update["UPDATE môn theo id trên Supabase"]
    Update --> UpdOK{Kết quả?}
    UpdOK -- "Lỗi (mất mạng / RLS / server)" --> SaveErr["Báo: 'Không lưu được thay đổi.<br/>Vui lòng thử lại.'<br/>Giữ dữ liệu trong form, mở khoá nút"] --> Load
    UpdOK -- "Không có dòng nào được cập nhật<br/>(môn không còn tồn tại)" --> Gone["Báo: 'Môn học không còn tồn tại'<br/>Xoá môn khỏi danh sách + cache"] --> Reset
    UpdOK -- Thành công --> Apply["Thay dòng trong danh sách bằng dữ liệu trả về"]
    Apply --> Cache["Ghi cache (lỗi ghi → bỏ qua)"]
    Cache --> Recalc[["Tính lại tổng kết (Flow 03)"]]
    Recalc --> Reset["Về chế độ thêm: xoá trắng form,<br/>nút trở lại 'Thêm môn', ẩn 'Huỷ',<br/>bỏ đánh dấu dòng, focus ô Tên môn"]
    Reset --> Done([Hoàn tất])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Bấm "Sửa" dòng B khi đang sửa dòng A | Bỏ thay đổi chưa lưu của A, nạp B. |
| Dữ liệu sửa không hợp lệ | Cùng thông báo lỗi như F1, vẫn ở chế độ sửa. |
| Bấm "Lưu" mà không thay đổi gì | Không gọi Supabase, về chế độ thêm. |
| Xoá chính dòng đang sửa | Sau khi xoá thành công, form về chế độ thêm. |
| Xoá dòng khác khi đang sửa | Không ảnh hưởng form đang sửa. |
| "Xoá tất cả" khi đang sửa | Sau khi xoá thành công, form về chế độ thêm (Flow 06). |
| Supabase lỗi / offline | Báo lỗi, giữ dữ liệu trong form, danh sách không đổi. |
| Môn đã bị xoá trên server (UPDATE trả 0 dòng) | Báo "Môn học không còn tồn tại", xoá khỏi danh sách. |
| Bấm "Lưu" nhiều lần | Chỉ gửi một lần. |
