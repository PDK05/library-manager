# Flow 02 – Quản lý sách (F2)

## 2a. Thêm / sửa sách

```mermaid
flowchart TD
    Start([Thủ thư bấm 'Thêm sách'<br/>hoặc 'Sửa' trên một dòng]) --> Mode{Chế độ?}
    Mode -- Thêm --> Empty["Form trống, nút 'Thêm sách'"]
    Mode -- Sửa --> Load["Đưa dữ liệu dòng lên form<br/>Nút đổi thành 'Lưu', hiện nút 'Huỷ'"]
    Empty & Load --> Input["Nhập / chỉnh dữ liệu<br/>Nhấn nút hoặc Enter"]
    Input --> Cancel{Bấm 'Huỷ'?}
    Cancel -- Có --> Reset
    Cancel -- Không --> Busy{Đang chờ lưu?}
    Busy -- Có --> Ignore([Bỏ qua lần bấm])
    Busy -- Không --> Validate[["Kiểm tra dữ liệu (2b)"]]
    Validate --> Valid{Hợp lệ?}
    Valid -- Không --> ShowErr["Hiện lỗi dưới từng ô sai<br/>Focus ô sai đầu tiên<br/>Giữ dữ liệu đã nhập"] --> Input
    Valid -- Có --> Lock["Khoá nút"] --> Save["Thêm: INSERT<br/>Sửa: UPDATE … WHERE id = ? AND da_xoa = false<br/>(CSDL kiểm tra số lượng ≥ số đang cho mượn)"]
    Save --> R{Kết quả?}
    R -- "Trùng ISBN (unique violation)" --> E1["Lỗi dưới ô ISBN:<br/>'ISBN đã tồn tại'"] --> Unlock[Mở khoá nút] --> Input
    R -- "Số lượng < số đang cho mượn" --> E2["Lỗi dưới ô Số lượng:<br/>'Đang có N cuốn được mượn,<br/>số lượng không được nhỏ hơn N'"] --> Unlock
    R -- "Sửa: 0 dòng được cập nhật" --> E3["Báo: 'Sách không còn tồn tại'<br/>Bỏ dòng khỏi danh sách"] --> Reset
    R -- "Mất mạng / RLS / server" --> E4["Báo lỗi chung (README #9)<br/>Giữ dữ liệu trong form"] --> Unlock
    R -- Thành công --> Apply["Cập nhật dòng trong danh sách<br/>bằng dữ liệu trả về"]
    Apply --> Reset["Xoá trắng form, về chế độ Thêm<br/>Focus ô Tên sách, mở khoá nút"] --> Done([Hoàn tất])
```

## 2b. Sub-flow kiểm tra dữ liệu sách (dùng chung cho Thêm và Sửa)

```mermaid
flowchart TD
    In([Giá trị thô từ form]) --> T["Tên sách = trim"] --> T1{"Rỗng / > 200 ký tự?"}
    T1 -- Rỗng --> ET1["'Vui lòng nhập tên sách'"]
    T1 -- "> 200" --> ET2["'Tên sách tối đa 200 ký tự'"]
    T1 -- Không --> TOK[Tên hợp lệ]

    In --> A["Tác giả = trim"] --> A1{"Rỗng / > 100 ký tự?"}
    A1 -- Rỗng --> EA1["'Vui lòng nhập tác giả'"]
    A1 -- "> 100" --> EA2["'Tác giả tối đa 100 ký tự'"]
    A1 -- Không --> AOK[Tác giả hợp lệ]

    In --> G["Thể loại = trim"] --> G1{"Rỗng / > 50 ký tự?"}
    G1 -- Rỗng --> EG1["'Vui lòng nhập thể loại'"]
    G1 -- "> 50" --> EG2["'Thể loại tối đa 50 ký tự'"]
    G1 -- Không --> GOK[Thể loại hợp lệ]

    In --> I["ISBN = trim, bỏ dấu '-' và khoảng trắng"] --> I1{Rỗng?}
    I1 -- Có --> IOK["ISBN = null (hợp lệ)"]
    I1 -- Không --> I2{"Đúng 10 hoặc 13 chữ số?<br/>(ISBN-10 cho phép X ở cuối)"}
    I2 -- Không --> EI["'ISBN phải gồm 10 hoặc 13 chữ số'"]
    I2 -- Có --> IOK2[ISBN hợp lệ]

    In --> Y["Năm XB = trim"] --> Y1{Rỗng?}
    Y1 -- Có --> YOK["Năm = null (hợp lệ)"]
    Y1 -- Không --> Y2{"Số nguyên<br/>1000 ≤ năm ≤ năm hiện tại?"}
    Y2 -- "Không phải số nguyên" --> EY1["'Năm xuất bản phải là số nguyên'"]
    Y2 -- "Ngoài khoảng" --> EY2["'Năm xuất bản từ 1000 đến năm hiện tại'"]
    Y2 -- Có --> YOK2[Năm hợp lệ]

    In --> Q["Số lượng = trim"] --> Q1{Rỗng?}
    Q1 -- Có --> EQ1["'Vui lòng nhập số lượng'"]
    Q1 -- Không --> Q2{"Số nguyên?"}
    Q2 -- "Không (2.5, abc, -1)" --> EQ2["'Số lượng phải là số nguyên'"]
    Q2 -- Có --> Q3{"1 ≤ số lượng ≤ 1000?"}
    Q3 -- Không --> EQ3["'Số lượng từ 1 đến 1000'"]
    Q3 -- Có --> QOK[Số lượng hợp lệ]

    TOK & AOK & GOK & IOK & IOK2 & YOK & YOK2 & QOK --> AllOK([Hợp lệ nếu không có lỗi nào])
    ET1 & ET2 & EA1 & EA2 & EG1 & EG2 & EI & EY1 & EY2 & EQ1 & EQ2 & EQ3 --> Fail([Không hợp lệ: trả về lỗi theo từng ô])
```

## 2c. Xoá sách

```mermaid
flowchart TD
    Start([Bấm 'Xoá' trên một dòng]) --> Pre{"Số đang cho mượn > 0?<br/>(theo dữ liệu đang hiển thị)"}
    Pre -- Có --> Block["Báo: 'Không thể xoá: còn N cuốn đang được mượn'"] --> End([Kết thúc])
    Pre -- Không --> Confirm{"Xác nhận:<br/>'Xoá sách «tên»?'"}
    Confirm -- Huỷ --> End
    Confirm -- Đồng ý --> Lock["Khoá nút"] --> Del["Xoá mềm: UPDATE da_xoa = true<br/>CSDL kiểm tra lại không có phiếu đang mượn"]
    Del --> R{Kết quả?}
    R -- "Có phiếu đang mượn (vừa phát sinh)" --> Block2["Báo: 'Không thể xoá: sách đang được mượn'<br/>Tải lại dòng"] --> Unlock[Mở khoá nút] --> End
    R -- "Lỗi mạng / RLS / server" --> Err["Báo lỗi chung, giữ dòng"] --> Unlock
    R -- "Thành công (kể cả khi đã bị xoá trước đó)" --> Remove["Bỏ dòng khỏi danh sách"] --> Page{"Trang hiện tại<br/>hết dòng?"}
    Page -- "Có và không phải trang 1" --> Prev["Lùi về trang trước"] --> End
    Page -- Không --> End
```

## 2d. Tìm kiếm và phân trang

```mermaid
flowchart TD
    Start([Gõ vào ô tìm kiếm]) --> Deb["Chờ 300 ms sau lần gõ cuối"] --> Trim["Từ khoá = trim"]
    Trim --> E{Rỗng?}
    E -- Có --> All["Truy vấn tất cả sách chưa xoá"]
    E -- Không --> Search["Truy vấn unaccent + ILIKE<br/>trên tên, tác giả, thể loại, ISBN"]
    All & Search --> Page["Lấy trang 1, 20 dòng/trang<br/>kèm tổng số dòng"]
    Page --> R{Kết quả?}
    R -- Lỗi --> Err["Báo lỗi chung, giữ kết quả cũ"]
    R -- "0 dòng, có từ khoá" --> NoHit["'Không tìm thấy sách phù hợp'"]
    R -- "0 dòng, không từ khoá" --> NoBook["'Chưa có sách nào. Hãy thêm sách đầu tiên.'"]
    R -- "Có dòng" --> Show["Hiện bảng: tên, tác giả, thể loại,<br/>số lượng, còn lại, nút Sửa / Xoá"]
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| ISBN `978-604-1-23456-7` | Bỏ dấu `-` → 13 chữ số, hợp lệ. |
| ISBN trùng sách đã xoá mềm | Cho phép (ràng buộc unique chỉ áp dụng cho sách chưa xoá). |
| Năm XB = năm sau | Lỗi. |
| Giảm số lượng xuống dưới số đang cho mượn | Lỗi dưới ô Số lượng, nêu số cuốn đang mượn. |
| Hai thủ thư cùng sửa một sách | Lần lưu sau ghi đè lần trước (chấp nhận, last-write-wins). |
| Sửa sách mà người khác vừa xoá | UPDATE trả 0 dòng → báo "Sách không còn tồn tại". |
| Xoá sách đang có người mượn | Bị chặn ở client và kiểm tra lại ở CSDL. |
| Tìm "nguyen du" | Khớp "Nguyễn Du" (không dấu, không phân biệt hoa thường). |
| Từ khoá chứa `%` hoặc `_` | Escape trước khi đưa vào ILIKE. |
| Gõ nhanh liên tục | Debounce; chỉ hiện kết quả của truy vấn mới nhất (bỏ kết quả về muộn). |
