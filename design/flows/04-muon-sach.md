# Flow 04 – Mượn sách (F4)

## 4a. Lập phiếu mượn

```mermaid
flowchart TD
    Start([Thủ thư mở 'Lập phiếu mượn']) --> PickR["Tìm và chọn độc giả<br/>(theo mã thẻ / họ tên / SĐT)"]
    PickR --> RInfo["Hiện tóm tắt độc giả: trạng thái thẻ,<br/>số sách đang mượn, sách quá hạn, tiền phạt chưa trả"]
    RInfo --> Pre[["Kiểm tra điều kiện độc giả (4b)"]]
    Pre --> PreOK{Đủ điều kiện?}
    PreOK -- Không --> Show["Hiện tất cả lý do không được mượn<br/>Khoá bước chọn sách"] --> PickR
    PreOK -- Có --> PickB["Tìm và chọn sách<br/>(chỉ hiện sách chưa xoá)"]
    PickB --> Avail{"Số còn lại > 0<br/>và độc giả chưa mượn<br/>đầu sách này?"}
    Avail -- "Hết sách" --> EB1["'Sách đã được mượn hết'"] --> PickB
    Avail -- "Đang mượn cùng đầu sách" --> EB2["'Độc giả đang mượn sách này'"] --> PickB
    Avail -- Có --> Preview["Hiện: ngày mượn = hôm nay,<br/>hạn trả = hôm nay + 14 ngày"]
    Preview --> Confirm{"Bấm 'Lập phiếu'<br/>(nút khoá khi đang chờ)"}
    Confirm -- "Huỷ / đổi lựa chọn" --> PickB
    Confirm -- "Lập phiếu" --> RPC["RPC lap_phieu_muon(doc_gia_id, sach_id)<br/>Transaction: khoá dòng độc giả và sách,<br/>kiểm tra lại toàn bộ 4b + còn sách,<br/>INSERT phiếu với ngày theo giờ server"]
    RPC --> R{Kết quả?}
    R -- "Vi phạm điều kiện<br/>(trạng thái đã thay đổi)" --> ER1["Báo lý do cụ thể từ CSDL<br/>Tải lại tóm tắt độc giả và sách"] --> RInfo
    R -- "Hết sách (người khác vừa mượn cuốn cuối)" --> ER2["'Sách vừa được mượn hết'"] --> PickB
    R -- "Lỗi mạng / RLS / server" --> ER3["Báo lỗi chung, giữ lựa chọn<br/>Mở khoá nút"] --> Confirm
    R -- Thành công --> Ok["Báo: 'Đã lập phiếu. Hạn trả: dd/mm/yyyy'<br/>Cập nhật số còn lại và số sách đang mượn"]
    Ok --> Next{"Mượn tiếp cho<br/>độc giả này?"}
    Next -- Có --> Pre
    Next -- Không --> Done([Hoàn tất, xoá lựa chọn])
```

## 4b. Sub-flow kiểm tra điều kiện độc giả

Chạy ở client để báo lỗi sớm và chạy lại trong RPC `lap_phieu_muon`. Thu thập **tất cả** lý do, không dừng ở lý do đầu tiên.

```mermaid
flowchart TD
    In([Độc giả]) --> C1{"Trạng thái = Hoạt động?"}
    C1 -- Không --> L1["'Thẻ độc giả đang bị khoá'"]
    In --> C2{"ngay_het_han ≥ hôm nay?"}
    C2 -- Không --> L2["'Thẻ độc giả đã hết hạn ngày dd/mm/yyyy'"]
    In --> C3{"Có phiếu chưa trả<br/>với hạn trả < hôm nay?"}
    C3 -- Có --> L3["'Độc giả có N sách quá hạn chưa trả'"]
    In --> C4{"Tổng phạt chưa thanh toán > 0?"}
    C4 -- Có --> L4["'Độc giả còn X đ tiền phạt chưa thanh toán'"]
    In --> C5{"Số phiếu đang mượn < 5?"}
    C5 -- Không --> L5["'Độc giả đã mượn tối đa 5 cuốn'"]
    C1 -- Có --> OK1["Đạt"]
    C2 -- Có --> OK2["Đạt"]
    C3 -- Không --> OK3["Đạt"]
    C4 -- Không --> OK4["Đạt"]
    C5 -- Có --> OK5["Đạt"]
    OK1 & OK2 & OK3 & OK4 & OK5 --> Pass([Đủ điều kiện nếu không có lý do nào])
    L1 & L2 & L3 & L4 & L5 --> Fail([Không đủ điều kiện: danh sách lý do])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Hai thủ thư cùng cho mượn cuốn cuối cùng | RPC khoá dòng sách (`FOR UPDATE`); người sau nhận "Sách vừa được mượn hết". |
| Hai thủ thư cùng cho một độc giả mượn, đang có 4 cuốn | RPC khoá dòng độc giả; người sau nhận "đã mượn tối đa 5 cuốn". |
| Độc giả có sách quá hạn nhưng chưa trả → chưa có khoản phạt | Vẫn bị chặn bởi điều kiện 3 (quá hạn), không cần chờ phát sinh phạt. |
| Thẻ hết hạn đúng hôm nay (`ngay_het_han = hôm nay`) | Vẫn mượn được. |
| Hạn trả vượt quá ngày hết hạn thẻ | Cho phép (PRD không cấm) — ghi chú để duyệt. |
| Độc giả bị xoá / sách bị xoá trong lúc đang chọn | RPC báo "Độc giả không còn tồn tại" / "Sách không còn tồn tại". |
| Đồng hồ máy thủ thư sai ngày | Ngày mượn và hạn trả lấy từ server; ngày hiển thị ở bước xem trước chỉ mang tính tham khảo và được thay bằng giá trị server trả về. |
| Bấm 'Lập phiếu' hai lần | Nút bị khoá khi đang chờ; dù vậy RPC vẫn chặn trùng đầu sách. |
