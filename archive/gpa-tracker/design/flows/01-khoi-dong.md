# Flow 01 – Khởi động trang và tải dữ liệu (F5)

```mermaid
flowchart TD
    Start([Người dùng mở trang]) --> ReadCache["Đọc localStorage 'gpa-tracker:v1'"]
    ReadCache --> HasCache{Có dữ liệu?}
    HasCache -- Không --> EmptyList[Danh sách rỗng]
    HasCache -- Có --> Parse{"JSON.parse thành công<br/>và là mảng?"}
    Parse -- "Không (cache hỏng)" --> DropCache["Bỏ qua cache hỏng<br/>(ghi log console)"] --> EmptyList
    Parse -- Có --> FilterItems["Lọc phần tử: giữ môn có cấu trúc hợp lệ<br/>(id, tên, tín chỉ, điểm đúng ràng buộc)"]
    FilterItems --> CacheList[Danh sách từ cache]
    EmptyList --> Render1["Hiển thị bảng + tổng kết (Flow 03)"]
    CacheList --> Render1

    Render1 --> Session{"Đã có phiên Supabase<br/>trong trình duyệt?"}
    Session -- Có --> Fetch
    Session -- Không --> SignIn[signInAnonymously]
    SignIn --> SignInOK{Thành công?}
    SignInOK -- "Không (mất mạng / tắt anonymous sign-in / Supabase lỗi)" --> Offline
    SignInOK -- Có --> Fetch["SELECT môn học của user<br/>(RLS lọc theo auth.uid)"]
    Fetch --> FetchOK{Thành công?}
    FetchOK -- "Không (mất mạng / timeout / lỗi server)" --> Offline["Giữ dữ liệu cache đang hiển thị<br/>Báo: 'Không kết nối được máy chủ,<br/>đang hiển thị dữ liệu đã lưu trên máy'"]
    FetchOK -- Có --> Replace["Thay danh sách bằng dữ liệu Supabase<br/>(kể cả khi Supabase rỗng mà cache có dữ liệu)"]
    Replace --> WriteCache["Ghi đè cache 'gpa-tracker:v1'"]
    WriteCache --> WriteOK{Ghi được?}
    WriteOK -- "Không (đầy bộ nhớ / chế độ riêng tư)" --> Render2
    WriteOK -- Có --> Render2["Hiển thị lại bảng + tổng kết (Flow 03)"]
    Render2 --> Ready([Sẵn sàng thao tác])
    Offline --> ReadyOffline(["Sẵn sàng – chế độ chỉ xem<br/>(thao tác ghi sẽ báo lỗi)"])
```

## Edge cases

| Tình huống | Xử lý |
|------------|-------|
| Lần đầu mở, chưa có cache | Danh sách rỗng, hiển thị "—" và "Hãy thêm môn học đầu tiên". |
| Cache không phải JSON / không phải mảng | Bỏ qua, danh sách rỗng, trang vẫn hoạt động bình thường. |
| Cache có vài phần tử sai cấu trúc (thiếu trường, điểm > 10, tín chỉ không nguyên…) | Bỏ phần tử đó, giữ phần còn lại. |
| `localStorage` bị chặn (truy cập ném lỗi) | Coi như không có cache; vẫn tải từ Supabase. |
| Anonymous sign-in bị tắt hoặc lỗi | Chế độ chỉ xem với dữ liệu cache + thông báo lỗi. |
| Phiên hết hạn / token không hợp lệ | Supabase client tự làm mới; nếu thất bại → đăng nhập ẩn danh lại (user mới, danh sách Supabase rỗng). |
| Supabase rỗng nhưng cache có dữ liệu | Supabase là chuẩn → danh sách rỗng, cache bị ghi đè. |
| Mất mạng khi đang tải | Giữ dữ liệu cache đã hiển thị, báo lỗi; không làm trắng trang. |
