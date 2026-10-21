-- Trigger nghiệp vụ, liên kết tài khoản và RLS

-- Hàm xác định vai trò (SECURITY DEFINER để policy không đệ quy qua RLS)
create function public.thu_thu_hien_tai() returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.thu_thu where user_id = auth.uid() $$;

create function public.la_thu_thu() returns boolean
language sql stable security definer
set search_path = ''
as $$ select exists (select 1 from public.thu_thu where user_id = auth.uid()) $$;

create function public.doc_gia_hien_tai() returns uuid
language sql stable security definer
set search_path = ''
as $$ select id from public.doc_gia where user_id = auth.uid() and not da_xoa $$;

-- doc_gia: mã thẻ không sửa, email khoá khi đã có tài khoản, ngày hết hạn ≥ hôm nay
create function public.tg_doc_gia_kiem_tra() returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.ngay_het_han < public.hom_nay() then
      raise exception 'NGAY_HET_HAN_KHONG_HOP_LE';
    end if;
    return new;
  end if;

  if old.da_xoa then
    raise exception 'DA_XOA';
  end if;
  if new.ma_the is distinct from old.ma_the then
    raise exception 'MA_THE_KHONG_SUA_DUOC';
  end if;
  if new.email is distinct from old.email and old.user_id is not null then
    raise exception 'EMAIL_KHONG_SUA_DUOC';
  end if;
  if new.ngay_het_han is distinct from old.ngay_het_han and new.ngay_het_han < public.hom_nay() then
    raise exception 'NGAY_HET_HAN_KHONG_HOP_LE';
  end if;
  new.ngay_cap_nhat := now();
  return new;
end;
$$;

create trigger doc_gia_kiem_tra
before insert or update on public.doc_gia
for each row execute function public.tg_doc_gia_kiem_tra();

-- sach: năm xuất bản ≤ năm nay; số lượng ≥ số đang cho mượn; không xoá khi còn sách đang mượn.
-- Dòng sách đã bị UPDATE khoá, nên số phiếu đọc ở đây không lệch với lap_phieu_muon.
create function public.tg_sach_kiem_tra() returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_dang_muon integer;
begin
  if tg_op = 'UPDATE' and old.da_xoa then
    raise exception 'DA_XOA';
  end if;

  if new.nam_xuat_ban is not null
     and (tg_op = 'INSERT' or new.nam_xuat_ban is distinct from old.nam_xuat_ban)
     and new.nam_xuat_ban > extract(year from public.hom_nay()) then
    raise exception 'NAM_XUAT_BAN_KHONG_HOP_LE';
  end if;

  if tg_op = 'UPDATE' then
    if new.so_luong < old.so_luong or (new.da_xoa and not old.da_xoa) then
      select count(*) into v_dang_muon
      from public.phieu_muon
      where sach_id = new.id and ngay_tra is null;

      if new.da_xoa and v_dang_muon > 0 then
        raise exception 'CON_SACH_DANG_MUON'
          using detail = json_build_object('so_dang_muon', v_dang_muon)::text;
      end if;
      if new.so_luong < v_dang_muon then
        raise exception 'SO_LUONG_NHO_HON_DANG_MUON'
          using detail = json_build_object('so_dang_muon', v_dang_muon)::text;
      end if;
    end if;
    new.ngay_cap_nhat := now();
  end if;
  return new;
end;
$$;

create trigger sach_kiem_tra
before insert or update on public.sach
for each row execute function public.tg_sach_kiem_tra();

-- Liên kết auth.users với thu_thu hoặc doc_gia theo email; không khớp thì huỷ đăng ký (Flow 1b, 1d)
create function public.tg_lien_ket_tai_khoan() returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.thu_thu
  set user_id = new.id
  where email = lower(new.email) and user_id is null;
  if found then
    return new;
  end if;

  update public.doc_gia
  set user_id = new.id
  where email = lower(new.email) and not da_xoa and user_id is null;
  if found then
    return new;
  end if;

  raise exception 'EMAIL_CHUA_DANG_KY';
end;
$$;

create trigger lien_ket_tai_khoan
after insert on auth.users
for each row execute function public.tg_lien_ket_tai_khoan();

-- RLS: không có policy DELETE; phieu_muon và tien_phat chỉ ghi qua RPC
alter table public.thu_thu enable row level security;
alter table public.doc_gia enable row level security;
alter table public.sach enable row level security;
alter table public.phieu_muon enable row level security;
alter table public.tien_phat enable row level security;

create policy thu_thu_select on public.thu_thu
for select to authenticated
using ((select public.la_thu_thu()));

create policy doc_gia_select on public.doc_gia
for select to authenticated
using ((select public.la_thu_thu()) or id = (select public.doc_gia_hien_tai()));

create policy doc_gia_insert on public.doc_gia
for insert to authenticated
with check ((select public.la_thu_thu()));

create policy doc_gia_update on public.doc_gia
for update to authenticated
using ((select public.la_thu_thu()))
with check ((select public.la_thu_thu()));

create policy sach_select on public.sach
for select to authenticated
using (
  (select public.la_thu_thu())
  or not da_xoa
  or exists (
    select 1 from public.phieu_muon pm
    where pm.sach_id = sach.id and pm.doc_gia_id = (select public.doc_gia_hien_tai())
  )
);

create policy sach_insert on public.sach
for insert to authenticated
with check ((select public.la_thu_thu()));

create policy sach_update on public.sach
for update to authenticated
using ((select public.la_thu_thu()))
with check ((select public.la_thu_thu()));

create policy phieu_muon_select on public.phieu_muon
for select to authenticated
using ((select public.la_thu_thu()) or doc_gia_id = (select public.doc_gia_hien_tai()));

create policy tien_phat_select on public.tien_phat
for select to authenticated
using (
  (select public.la_thu_thu())
  or exists (
    select 1 from public.phieu_muon pm
    where pm.id = tien_phat.phieu_muon_id and pm.doc_gia_id = (select public.doc_gia_hien_tai())
  )
);
