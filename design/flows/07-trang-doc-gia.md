# Flow 07 – Trang độc giả (F7)

Mọi truy vấn chạy với quyền độc giả; RLS chỉ trả về danh mục sách (chưa xoá) và phiếu mượn, tiền phạt của chính độc giả đó.

```mermaid
flowchart TD
    Start([Độc giả đăng nhập thành công - Flow 1d]) --> Banner{"Trạng thái thẻ?"}
    Banner -- "Bị khoá" --> W1["Cảnh báo: 'Thẻ của bạn đang bị khoá.<br/>Vui lòng liên hệ thủ thư.'"]
    Banner -- "Hết hạn" --> W2["Cảnh báo: 'Thẻ của bạn đã hết hạn ngày dd/mm/yyyy.'"]
    Banner -- "Hoạt động" --> Tabs
    W1 & W2 --> Tabs{Chọn tab}

    Tabs -- "Tra cứu sách" --> S["Ô tìm kiếm như Flow 2d (chỉ xem)<br/>Cột: tên, tác giả, thể loại, năm, còn lại"]
    S --> SR{Kết quả?}
    SR -- "Còn lại = 0" --> Out["Hiện 'Hết sách' thay cho số"]
    SR -- "0 dòng" --> NoHit["'Không tìm thấy sách phù hợp'"]
    SR -- Lỗi --> Err1["Báo lỗi chung"]

    Tabs -- "Sách đang mượn" --> L["Truy vấn phiếu chưa trả của tôi"]
    L --> LR{Kết quả?}
    LR -- "0 dòng" --> NoLoan["'Bạn không mượn sách nào'"]
    LR -- Lỗi --> Err2["Báo lỗi chung"]
    LR -- "Có dòng" --> LShow["Bảng: sách, ngày mượn, hạn trả, còn N ngày<br/>Quá hạn: tô đỏ, 'Trễ N ngày - phạt dự kiến X đ'<br/>Còn ≤ 2 ngày: tô vàng 'Sắp đến hạn'"]

    Tabs -- "Lịch sử & tiền phạt" --> H["Truy vấn phiếu đã trả + khoản phạt của tôi<br/>Mới nhất trước, phân trang 20 dòng"]
    H --> HR{Kết quả?}
    HR -- "0 dòng" --> NoHist["'Chưa có lịch sử mượn'"]
    HR -- Lỗi --> Err3["Báo lỗi chung"]
    HR -- "Có dòng" --> HShow["Bảng lịch sử: sách, ngày mượn, ngày trả, trễ<br/>Tổng tiền phạt chưa thanh toán ở đầu trang"]
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Độc giả sửa request để đọc phiếu của người khác | RLS trả về 0 dòng. |
| Độc giả gọi INSERT/UPDATE bất kỳ bảng nào | RLS từ chối; giao diện độc giả không có nút ghi. |
| Sách đã bị xoá mềm nằm trong lịch sử | Vẫn hiện tên sách trong lịch sử (RLS cho đọc sách đã xoá nếu gắn với phiếu của chính độc giả). |
| Thẻ bị khoá / hết hạn | Vẫn xem được mọi tab, chỉ hiện cảnh báo. |
| Độc giả chưa từng mượn | Các tab hiện thông báo trống tương ứng. |
| Hạn trả hôm nay | Hiện "Hạn trả hôm nay" (tô vàng), chưa tính trễ. |
