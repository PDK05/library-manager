# Flow 02 – Thêm môn học (F1, F5)

## 2a. Luồng thêm môn

```mermaid
flowchart TD
    Start([Người dùng nhập Tên môn, Số tín chỉ, Điểm hệ 10]) --> Submit["Nhấn 'Thêm môn' hoặc Enter"]
    Submit --> Busy{Đang chờ lưu<br/>lần trước?}
    Busy -- Có --> Ignore([Bỏ qua lần bấm])
    Busy -- Không --> ClearErr[Xoá thông báo lỗi cũ]
    ClearErr --> Validate[["Kiểm tra dữ liệu (2b)"]]
    Validate --> Valid{Hợp lệ?}
    Valid -- Không --> ShowErr["Hiện lỗi dưới từng ô sai<br/>Focus ô sai đầu tiên<br/>Giữ nguyên dữ liệu đã nhập"]
    ShowErr --> Start
    Valid -- Có --> Lock["Khoá nút 'Thêm môn'"]
    Lock --> Insert["INSERT vào Supabase<br/>(tên đã trim, tín chỉ, điểm đã làm tròn)"]
    Insert --> InsertOK{Thành công?}
    InsertOK -- "Không (mất mạng / chưa đăng nhập / RLS từ chối / lỗi server)" --> SaveErr["Báo: 'Không lưu được môn học.<br/>Vui lòng thử lại.'<br/>Giữ nguyên dữ liệu trong form"]
    SaveErr --> Unlock1[Mở khoá nút] --> Start
    InsertOK -- Có --> AddRow["Thêm dòng trả về từ Supabase vào danh sách"]
    AddRow --> Cache["Ghi cache 'gpa-tracker:v1'<br/>(lỗi ghi → bỏ qua)"]
    Cache --> Recalc[["Tính lại tổng kết (Flow 03)"]]
    Recalc --> Reset["Xoá trắng form<br/>Focus ô Tên môn<br/>Mở khoá nút"]
    Reset --> Done([Hoàn tất])
```

## 2b. Sub-flow kiểm tra dữ liệu (dùng chung cho Thêm và Sửa)

```mermaid
flowchart TD
    In([Giá trị thô từ 3 ô nhập]) --> N1["Tên = trim(tên)"]
    N1 --> N2{Tên rỗng?}
    N2 -- Có --> EN1["Lỗi: 'Vui lòng nhập tên môn'"]
    N2 -- Không --> N3{"Dài > 100 ký tự?"}
    N3 -- Có --> EN2["Lỗi: 'Tên môn tối đa 100 ký tự'"]
    N3 -- Không --> NOK[Tên hợp lệ]

    In --> C1["Tín chỉ = trim(tín chỉ)"]
    C1 --> C2{Rỗng?}
    C2 -- Có --> EC1["Lỗi: 'Vui lòng nhập số tín chỉ'"]
    C2 -- Không --> C3{"Là số nguyên<br/>(chỉ gồm chữ số)?"}
    C3 -- "Không (2.5, abc, -1, 1e1)" --> EC2["Lỗi: 'Số tín chỉ phải là số nguyên'"]
    C3 -- Có --> C4{"1 ≤ tín chỉ ≤ 10?"}
    C4 -- Không --> EC3["Lỗi: 'Số tín chỉ phải từ 1 đến 10'"]
    C4 -- Có --> COK[Tín chỉ hợp lệ]

    In --> S1["Điểm = trim(điểm), đổi ',' thành '.'"]
    S1 --> S2{Rỗng?}
    S2 -- Có --> ES1["Lỗi: 'Vui lòng nhập điểm'"]
    S2 -- Không --> S3{"Đúng dạng số thập phân?<br/>(vd. 8, 8.5, 8,5)"}
    S3 -- "Không (abc, 8.5.1, 1e1, 8,,5)" --> ES2["Lỗi: 'Điểm phải là số'"]
    S3 -- Có --> S4{"0 ≤ điểm ≤ 10?<br/>(trên giá trị gốc)"}
    S4 -- Không --> ES3["Lỗi: 'Điểm phải từ 0 đến 10'"]
    S4 -- Có --> S5["Làm tròn 1 chữ số thập phân<br/>(8.45 → 8.5; 8.44 → 8.4)"]
    S5 --> SOK[Điểm hợp lệ]

    NOK & COK & SOK --> AllOK([Hợp lệ: trả về dữ liệu đã chuẩn hoá])
    EN1 & EN2 & EC1 & EC2 & EC3 & ES1 & ES2 & ES3 --> Fail([Không hợp lệ: trả về lỗi theo từng ô])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Tên chỉ toàn khoảng trắng | Lỗi "Vui lòng nhập tên môn". |
| Tên đúng 100 ký tự sau trim / 101 ký tự | Hợp lệ / lỗi. |
| Tín chỉ `0`, `11`, `2.5`, `-1` | Lỗi tương ứng. |
| Điểm `8,5` và `8.5` | Cả hai → 8.5. |
| Điểm `8.45` / `8.44` | Làm tròn → 8.5 / 8.4 (dùng làm tròn thập phân chính xác, tránh sai số float). |
| Điểm `10.04` / `10.05` / `-0.01` | 10.0 hợp lệ / lỗi / lỗi. |
| Nhiều ô sai cùng lúc | Hiện lỗi dưới tất cả các ô sai, focus ô sai đầu tiên. |
| Bấm Enter / nút nhiều lần liên tiếp | Chỉ gửi một lần (nút bị khoá khi đang lưu). |
| Trùng tên với môn đã có | Cho phép. |
| Supabase lỗi / offline | Báo lỗi tiếng Việt, form giữ nguyên dữ liệu, danh sách không đổi. |
