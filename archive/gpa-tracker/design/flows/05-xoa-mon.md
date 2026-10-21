# Flow 05 – Xoá một môn học (F4, F5)

```mermaid
flowchart TD
    Start([Người dùng bấm 'Xoá' trên một dòng]) --> Confirm{"Hộp xác nhận:<br/>'Xoá môn #quot;tên môn#quot;?'"}
    Confirm -- "Huỷ / đóng hộp thoại" --> Cancel([Không thay đổi gì])
    Confirm -- Đồng ý --> Busy{"Dòng này đang<br/>được xoá?"}
    Busy -- Có --> Cancel
    Busy -- Không --> Lock["Khoá nút 'Xoá' của dòng"]
    Lock --> Delete["DELETE môn theo id trên Supabase"]
    Delete --> DelOK{Kết quả?}
    DelOK -- "Lỗi (mất mạng / RLS / server)" --> Err["Báo: 'Không xoá được môn học.<br/>Vui lòng thử lại.'<br/>Giữ dòng trong danh sách, mở khoá nút"]
    Err --> Fail([Kết thúc – không thay đổi])
    DelOK -- "Thành công<br/>(kể cả khi môn đã không còn trên server)" --> Remove["Bỏ dòng khỏi danh sách"]
    Remove --> Cache["Ghi cache (lỗi ghi → bỏ qua)"]
    Cache --> WasEditing{"Đang sửa<br/>chính môn này?"}
    WasEditing -- Có --> ResetForm["Form về chế độ thêm, xoá trắng"] --> Recalc
    WasEditing -- Không --> Recalc[["Tính lại tổng kết (Flow 03)"]]
    Recalc --> IsEmpty{Danh sách rỗng?}
    IsEmpty -- Có --> EmptyState["Hiện '—' và 'Hãy thêm môn học đầu tiên'"] --> Done
    IsEmpty -- Không --> Done([Hoàn tất])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Người dùng bấm Huỷ trong hộp xác nhận | Không gọi Supabase, không thay đổi gì. |
| Xoá môn cuối cùng | Danh sách rỗng → trạng thái trống của Flow 03. |
| Xoá môn đang được sửa | Form về chế độ thêm. |
| Môn đã bị xoá trên server từ trước | Coi là thành công (DELETE idempotent), bỏ dòng khỏi danh sách. |
| Supabase lỗi / offline | Báo lỗi, dòng vẫn còn. |
| Bấm "Xoá" liên tục | Nút bị khoá khi đang xoá. |
