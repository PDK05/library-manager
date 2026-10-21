-- Bảng, kiểu, hàm tiện ích và ràng buộc CHECK/unique (design/ERD.md)

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create type public.trang_thai_the as enum ('hoat_dong', 'bi_khoa');
create type public.trang_thai_phat as enum ('chua_thanh_toan', 'da_thanh_toan');

-- "Hôm nay" theo giờ server, múi giờ Việt Nam
create function public.hom_nay() returns date
language sql stable
set search_path = ''
as $$ select (now() at time zone 'Asia/Ho_Chi_Minh')::date $$;

-- unaccent() không IMMUTABLE nên bọc lại để dùng trong cột generated
create function public.f_unaccent(text) returns text
language sql immutable strict parallel safe
set search_path = ''
as $$ select extensions.unaccent('extensions.unaccent'::regdictionary, $1) $$;

create table public.thu_thu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete restrict,
  ho_ten text not null check (ho_ten = btrim(ho_ten) and char_length(ho_ten) between 1 and 100),
  email text not null unique check (email = lower(btrim(email)) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  ngay_tao timestamptz not null default now()
);

create sequence public.doc_gia_ma_the_seq;

create table public.doc_gia (
  id uuid primary key default gen_random_uuid(),
  ma_the text not null unique default 'DG' || lpad(nextval('public.doc_gia_ma_the_seq')::text, 6, '0'),
  ho_ten text not null check (ho_ten = btrim(ho_ten) and char_length(ho_ten) between 1 and 100),
  email text not null check (email = lower(btrim(email)) and char_length(email) <= 254 and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  so_dien_thoai text not null check (so_dien_thoai ~ '^0[0-9]{9}$'),
  ngay_het_han date not null default (public.hom_nay() + interval '1 year')::date,
  trang_thai public.trang_thai_the not null default 'hoat_dong',
  user_id uuid unique references auth.users (id) on delete restrict,
  da_xoa boolean not null default false,
  tim_kiem text generated always as (
    public.f_unaccent(lower(ma_the || ' ' || ho_ten || ' ' || email || ' ' || so_dien_thoai))
  ) stored,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

alter sequence public.doc_gia_ma_the_seq owned by public.doc_gia.ma_the;

create unique index doc_gia_email_uq on public.doc_gia (email) where not da_xoa;
create index doc_gia_tim_kiem_trgm on public.doc_gia using gin (tim_kiem extensions.gin_trgm_ops);

create table public.sach (
  id uuid primary key default gen_random_uuid(),
  ten_sach text not null check (ten_sach = btrim(ten_sach) and char_length(ten_sach) between 1 and 200),
  tac_gia text not null check (tac_gia = btrim(tac_gia) and char_length(tac_gia) between 1 and 100),
  the_loai text not null check (the_loai = btrim(the_loai) and char_length(the_loai) between 1 and 50),
  isbn text check (isbn ~ '^([0-9]{9}[0-9X]|[0-9]{13})$'),
  nam_xuat_ban smallint check (nam_xuat_ban >= 1000),
  so_luong integer not null check (so_luong between 1 and 1000),
  da_xoa boolean not null default false,
  tim_kiem text generated always as (
    public.f_unaccent(lower(ten_sach || ' ' || tac_gia || ' ' || the_loai || ' ' || coalesce(isbn, '')))
  ) stored,
  ngay_tao timestamptz not null default now(),
  ngay_cap_nhat timestamptz not null default now()
);

create unique index sach_isbn_uq on public.sach (isbn) where not da_xoa and isbn is not null;
create index sach_tim_kiem_trgm on public.sach using gin (tim_kiem extensions.gin_trgm_ops);

create table public.phieu_muon (
  id uuid primary key default gen_random_uuid(),
  doc_gia_id uuid not null references public.doc_gia (id) on delete restrict,
  sach_id uuid not null references public.sach (id) on delete restrict,
  ngay_muon date not null,
  han_tra date not null,
  ngay_tra date,
  thu_thu_lap_id uuid not null references public.thu_thu (id) on delete restrict,
  thu_thu_nhan_tra_id uuid references public.thu_thu (id) on delete restrict,
  ngay_tao timestamptz not null default now(),
  check (han_tra = ngay_muon + 14),
  check (ngay_tra is null or ngay_tra >= ngay_muon),
  check ((ngay_tra is null) = (thu_thu_nhan_tra_id is null))
);

-- Một độc giả không giữ hai cuốn cùng đầu sách
create unique index phieu_muon_dang_muon_uq on public.phieu_muon (doc_gia_id, sach_id) where ngay_tra is null;
create index phieu_muon_doc_gia_dang_muon on public.phieu_muon (doc_gia_id) where ngay_tra is null;
create index phieu_muon_sach_dang_muon on public.phieu_muon (sach_id) where ngay_tra is null;
create index phieu_muon_han_tra_dang_muon on public.phieu_muon (han_tra) where ngay_tra is null;
create index phieu_muon_doc_gia on public.phieu_muon (doc_gia_id);
create index phieu_muon_sach on public.phieu_muon (sach_id);
create index phieu_muon_thu_thu_lap on public.phieu_muon (thu_thu_lap_id);
create index phieu_muon_thu_thu_nhan_tra on public.phieu_muon (thu_thu_nhan_tra_id);

create table public.tien_phat (
  id uuid primary key default gen_random_uuid(),
  phieu_muon_id uuid not null unique references public.phieu_muon (id) on delete restrict,
  so_ngay_tre integer not null check (so_ngay_tre > 0),
  so_tien integer not null,
  trang_thai public.trang_thai_phat not null default 'chua_thanh_toan',
  ngay_phat_sinh date not null,
  ngay_thu date,
  nguoi_thu_id uuid references public.thu_thu (id) on delete restrict,
  check (so_tien = so_ngay_tre * 5000),
  check ((trang_thai = 'da_thanh_toan') = (ngay_thu is not null)),
  check ((ngay_thu is null) = (nguoi_thu_id is null))
);

create index tien_phat_chua_thanh_toan on public.tien_phat (trang_thai) where trang_thai = 'chua_thanh_toan';
create index tien_phat_nguoi_thu on public.tien_phat (nguoi_thu_id);
