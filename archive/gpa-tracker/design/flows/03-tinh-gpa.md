# Flow 03 – Quy đổi điểm, tính GPA và xếp loại (F2, F3)

Chạy mỗi khi danh sách môn thay đổi (tải trang, thêm, sửa, xoá, xoá tất cả). Là hàm thuần, không gọi Supabase.

## 3a. Quy đổi một điểm hệ 10 (đã làm tròn 1 chữ số)

```mermaid
flowchart TD
    In([Điểm hệ 10 đã làm tròn]) --> A{"≥ 8.5?"}
    A -- Có --> RA["A – 4.0"]
    A -- Không --> BP{"≥ 8.0?"}
    BP -- Có --> RBP["B+ – 3.5"]
    BP -- Không --> B{"≥ 7.0?"}
    B -- Có --> RB["B – 3.0"]
    B -- Không --> CP{"≥ 6.5?"}
    CP -- Có --> RCP["C+ – 2.5"]
    CP -- Không --> C{"≥ 5.5?"}
    C -- Có --> RC["C – 2.0"]
    C -- Không --> DP{"≥ 5.0?"}
    DP -- Có --> RDP["D+ – 1.5"]
    DP -- Không --> D{"≥ 4.0?"}
    D -- Có --> RD["D – 1.0"]
    D -- Không --> RF["F – 0.0"]
```

## 3b. Tính tổng kết và xếp loại

```mermaid
flowchart TD
    Start([Danh sách môn học]) --> Empty{Danh sách rỗng?}
    Empty -- Có --> ShowEmpty["Tổng số môn = 0, tổng tín chỉ = 0, tín chỉ đạt = 0<br/>GPA hệ 4 = '—', GPA hệ 10 = '—', xếp loại = '—'<br/>Hiện 'Hãy thêm môn học đầu tiên'"]
    ShowEmpty --> Done([Hiển thị])
    Empty -- Không --> Loop["Với mỗi môn: quy đổi điểm (3a)<br/>→ điểm chữ, điểm hệ 4 hiển thị trên dòng"]
    Loop --> Sum["Tổng số môn = số dòng<br/>Tổng tín chỉ = Σ tín chỉ<br/>Tín chỉ đạt = Σ tín chỉ của môn có điểm ≥ 4.0"]
    Sum --> GPA["GPA hệ 4 = Σ(hệ 4 × tín chỉ) / Σ tín chỉ<br/>GPA hệ 10 = Σ(hệ 10 × tín chỉ) / Σ tín chỉ<br/>Làm tròn 2 chữ số"]
    GPA --> X{"GPA hệ 4 (đã làm tròn)"}
    X -- "≥ 3.6" --> XS[Xuất sắc]
    X -- "3.2 – < 3.6" --> G[Giỏi]
    X -- "2.5 – < 3.2" --> K[Khá]
    X -- "2.0 – < 2.5" --> TB[Trung bình]
    X -- "< 2.0" --> Y[Yếu]
    XS & G & K & TB & Y --> Show["Hiển thị: tổng số môn, tổng tín chỉ, tín chỉ đạt,<br/>GPA hệ 4, GPA hệ 10, xếp loại"]
    Show --> Done
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Danh sách rỗng | "—" cho GPA và xếp loại, dòng "Hãy thêm môn học đầu tiên". Không chia cho 0. |
| Điểm đúng biên: 8.5, 8.0, 7.0, 6.5, 5.5, 5.0, 4.0 | Thuộc bậc cao hơn (A, B+, B, C+, C, D+, D). |
| Điểm 3.9 / 4.0 | F (không tính tín chỉ đạt) / D (tính tín chỉ đạt). |
| Tất cả môn đều F | GPA = 0.00, xếp loại Yếu, tín chỉ đạt = 0. |
| GPA hệ 4 = 3.595 | Làm tròn 3.60 → Xuất sắc. |
| GPA hệ 4 = 4.0 | Xuất sắc. |
| Chỉ một môn | GPA = điểm của môn đó. |
