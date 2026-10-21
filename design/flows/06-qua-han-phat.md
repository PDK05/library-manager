# Flow 06 – Quá hạn và tiền phạt (F6)

## 6a. Danh sách phiếu quá hạn

```mermaid
flowchart TD
    Start([Mở tab 'Quá hạn']) --> Q["Truy vấn phiếu chưa trả với han_tra < hôm nay (giờ server)<br/>Tính số ngày trễ và phạt dự kiến = ngày trễ × 5.000 đ"]
    Q --> R{Kết quả?}
    R -- "Lỗi mạng / RLS" --> Err["Báo lỗi chung, nút 'Thử lại'"] --> Q
    R -- "0 dòng" --> Empty["'Không có sách nào quá hạn'"] --> End([Kết thúc])
    R -- "Có dòng" --> Sort["Sắp xếp số ngày trễ giảm dần,<br/>cùng số ngày thì theo họ tên"]
    Sort --> Show["Bảng: mã thẻ, họ tên, SĐT, sách,<br/>hạn trả, số ngày trễ, phạt dự kiến<br/>Phân trang 20 dòng"]
    Show --> Act{Thủ thư bấm?}
    Act -- "'Nhận trả' trên một dòng" --> Return[["Flow 05 từ bước xác nhận"]] --> Q
    Act -- Không --> End
```

## 6b. Thu tiền phạt

```mermaid
flowchart TD
    Start([Mở tab 'Tiền phạt']) --> Q["Truy vấn khoản phạt 'Chưa thanh toán'<br/>Mặc định nhóm theo độc giả, hiện tổng mỗi người"]
    Q --> R{Kết quả?}
    R -- Lỗi --> Err["Báo lỗi chung, nút 'Thử lại'"] --> Q
    R -- "0 dòng" --> Empty["'Không có khoản phạt nào chưa thanh toán'"] --> End([Kết thúc])
    R -- "Có dòng" --> Show["Bảng: độc giả, sách, số ngày trễ, số tiền, ngày phát sinh"]
    Show --> Pay["Bấm 'Đã thu tiền' trên một khoản"]
    Pay --> Confirm{"Xác nhận:<br/>'Xác nhận đã thu X đ của «độc giả»?'"}
    Confirm -- Huỷ --> Show
    Confirm -- Đồng ý --> Lock["Khoá nút"] --> RPC["RPC thu_tien_phat(phat_id)<br/>UPDATE trạng thái = 'Đã thanh toán',<br/>ngay_thu = hôm nay, nguoi_thu = thủ thư hiện tại<br/>WHERE trạng thái = 'Chưa thanh toán'"]
    RPC --> R2{Kết quả?}
    R2 -- "0 dòng (đã được thu trước đó)" --> E1["'Khoản phạt này đã được thu'<br/>Bỏ khỏi danh sách"] --> Show
    R2 -- "Lỗi mạng / RLS / server" --> E2["Báo lỗi chung, giữ dòng, mở khoá nút"] --> Show
    R2 -- Thành công --> Ok["Báo: 'Đã ghi nhận thu X đ'<br/>Bỏ dòng, cập nhật tổng"] --> Left{Còn khoản nào?}
    Left -- Có --> Show
    Left -- Không --> Empty
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Phiếu hết hạn hôm nay (`han_tra = hôm nay`) | Chưa tính là quá hạn. |
| Mở trang qua nửa đêm | Số ngày trễ tính lại khi tải lại danh sách; không tự cập nhật theo thời gian thực. |
| Phạt dự kiến (6a) khác phạt thực tế | Phạt thực tế chỉ được tạo khi nhận trả (Flow 05), dựa trên ngày trả thật. |
| Hai thủ thư cùng bấm "Đã thu tiền" | Điều kiện `WHERE trạng thái = 'Chưa thanh toán'` → người sau nhận "đã được thu". |
| Thu một phần tiền phạt | Ngoài phạm vi: chỉ ghi nhận thu đủ một khoản. |
| Miễn / huỷ khoản phạt | Ngoài phạm vi (PRD không nêu) — ghi chú để duyệt. |
| Độc giả đã bị xoá mềm có phạt chưa thu | Không xảy ra: không xoá được độc giả còn phạt (Flow 3c). |
| Định dạng tiền | `5.000 đ` (dấu chấm phân cách hàng nghìn, `Intl.NumberFormat('vi-VN')`). |
