-- Tài khoản test cho e2e (chỉ dùng trên project dev). Mật khẩu chung: Test@12345
-- Email đuôi .test (RFC 2606) nên không gửi mail thật. Chạy lại được: bỏ qua dòng đã có.
--
-- thuthu.test@thuvien.test       thủ thư
-- docgia.test@thuvien.test       độc giả, thẻ hoạt động
-- docgia.khoa@thuvien.test       độc giả, thẻ bị khoá
-- docgia.chuadangky@thuvien.test độc giả có hồ sơ, chưa có tài khoản (để test đăng ký)

insert into public.thu_thu (ho_ten, email)
values ('Thủ thư Test', 'thuthu.test@thuvien.test')
on conflict (email) do nothing;

insert into public.doc_gia (ho_ten, email, so_dien_thoai, trang_thai)
select v.ho_ten, v.email, v.so_dien_thoai, v.trang_thai::public.trang_thai_the
from (values
  ('Độc giả Test', 'docgia.test@thuvien.test', '0900000001', 'hoat_dong'),
  ('Độc giả Bị Khoá', 'docgia.khoa@thuvien.test', '0900000002', 'bi_khoa'),
  ('Độc giả Chưa Đăng Ký', 'docgia.chuadangky@thuvien.test', '0900000003', 'hoat_dong')
) as v (ho_ten, email, so_dien_thoai, trang_thai)
where not exists (select 1 from public.doc_gia d where d.email = v.email and not d.da_xoa);

-- Tạo user đã xác nhận email; trigger lien_ket_tai_khoan gán user_id vào hồ sơ.
-- Các cột token để '' vì Supabase Auth không đọc được NULL ở những cột này.
with new_users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  )
  select
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    e.email, extensions.crypt('Test@12345', extensions.gen_salt('bf')), now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  from (values
    ('thuthu.test@thuvien.test'),
    ('docgia.test@thuvien.test'),
    ('docgia.khoa@thuvien.test')
  ) as e (email)
  where not exists (select 1 from auth.users u where u.email = e.email)
  returning id, email
)
insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(), n.id, n.id::text, 'email',
  jsonb_build_object('sub', n.id::text, 'email', n.email, 'email_verified', true),
  now(), now(), now()
from new_users n;
