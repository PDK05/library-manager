# Flow 05 – Trả sách (F5)

```mermaid
flowchart TD
    Start([Thủ thư mở 'Nhận trả sách']) --> Find["Tìm phiếu đang mượn<br/>theo mã thẻ / họ tên độc giả hoặc tên sách"]
    Find --> Found{Có phiếu?}
    Found -- "Lỗi mạng" --> EF["Báo lỗi chung"] --> Find
    Found -- Không --> NoLoan["'Không có phiếu mượn nào đang mở'"] --> Find
    Found -- Có --> List["Danh sách phiếu: sách, độc giả, ngày mượn, hạn trả,<br/>số ngày trễ + tiền phạt dự kiến (nếu quá hạn)"]
    List --> Pick["Bấm 'Nhận trả' trên một phiếu"]
    Pick --> Confirm{"Xác nhận:<br/>'Nhận trả «sách» của «độc giả»?'<br/>(kèm tiền phạt dự kiến nếu trễ)"}
    Confirm -- Huỷ --> List
    Confirm -- Đồng ý --> Lock["Khoá nút"] --> RPC["RPC nhan_tra_sach(phieu_id)<br/>Transaction: khoá phiếu,<br/>ngay_tra = hôm nay (giờ server)"]
    RPC --> Done{"Phiếu đã trả<br/>trước đó?"}
    Done -- Có --> E1["'Phiếu này đã được trả ngày dd/mm/yyyy'<br/>Bỏ khỏi danh sách đang mượn"] --> List
    Done -- Không --> Late{"ngay_tra > han_tra?"}
    Late -- Không --> NoFine["Cập nhật phiếu: đã trả"]
    Late -- Có --> Fine["Số ngày trễ = ngay_tra − han_tra<br/>INSERT khoản phạt = ngày trễ × 5.000 đ,<br/>trạng thái 'Chưa thanh toán'"]
    NoFine & Fine --> Commit{Commit thành công?}
    Commit -- "Lỗi mạng / RLS / server" --> E2["Báo lỗi chung; phiếu vẫn đang mượn<br/>Mở khoá nút"] --> List
    Commit -- Có --> Ok["Báo: 'Đã nhận trả'<br/>Nếu trễ: 'Trễ N ngày, phạt X đ'<br/>Bỏ phiếu khỏi danh sách, số còn lại của sách +1"]
    Ok --> More{"Còn phiếu của<br/>độc giả này?"}
    More -- Có --> List
    More -- Không --> End([Hoàn tất])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Trả đúng ngày hạn trả | Không trễ, không phạt. |
| Trả sau hạn 1 ngày | Phạt 5.000 đ. |
| Hai thủ thư cùng nhận trả một phiếu | RPC khoá phiếu; người sau nhận "Phiếu này đã được trả". |
| Mất mạng sau khi server đã commit nhưng client chưa nhận phản hồi | Client báo lỗi; khi thử lại, RPC trả "đã được trả" (idempotent) → không tạo phạt lần hai. |
| Sách đã bị xoá mềm | Vẫn nhận trả bình thường (phiếu tham chiếu sách đã xoá). — Thực tế không xảy ra vì không xoá được sách đang mượn. |
| Độc giả bị khoá thẻ / thẻ hết hạn | Vẫn nhận trả bình thường. |
| Tiền phạt rất lớn (trễ nhiều tháng) | Không giới hạn trần (PRD không nêu) — ghi chú để duyệt. |
| Trả nhầm phiếu | Ngoài phạm vi: không có chức năng huỷ trả; hộp xác nhận nêu rõ tên sách và độc giả để giảm nhầm lẫn. |
