-- View tính toán (không lưu). security_invoker để RLS của bảng gốc vẫn áp dụng.

-- Độc giả chỉ thấy phiếu của mình qua RLS, nên số đang cho mượn của một đầu sách
-- được đếm bằng hàm SECURITY DEFINER; hàm chỉ trả về con số, không lộ phiếu của người khác.
create function public.so_dang_muon(p_sach_id uuid) returns integer
language sql stable security definer
set search_path = ''
as $$
  select count(*)::integer from public.phieu_muon
  where sach_id = p_sach_id and ngay_tra is null
$$;

create view public.v_sach with (security_invoker = true) as
select
  s.*,
  d.so_dang_muon,
  s.so_luong - d.so_dang_muon as so_con_lai
from public.sach s
cross join lateral (select public.so_dang_muon(s.id) as so_dang_muon) d;

create view public.v_doc_gia with (security_invoker = true) as
select
  dg.*,
  case
    when dg.trang_thai = 'bi_khoa' then 'bi_khoa'
    when dg.ngay_het_han < public.hom_nay() then 'het_han'
    else 'hoat_dong'
  end as trang_thai_hien_thi,
  m.so_dang_muon,
  m.so_qua_han,
  p.tong_phat_chua_thanh_toan
from public.doc_gia dg
cross join lateral (
  select
    count(*)::integer as so_dang_muon,
    (count(*) filter (where pm.han_tra < public.hom_nay()))::integer as so_qua_han
  from public.phieu_muon pm
  where pm.doc_gia_id = dg.id and pm.ngay_tra is null
) m
cross join lateral (
  select coalesce(sum(tp.so_tien), 0)::integer as tong_phat_chua_thanh_toan
  from public.tien_phat tp
  join public.phieu_muon pm on pm.id = tp.phieu_muon_id
  where pm.doc_gia_id = dg.id and tp.trang_thai = 'chua_thanh_toan'
) p;

create view public.v_phieu_qua_han with (security_invoker = true) as
select
  pm.id as phieu_muon_id,
  pm.doc_gia_id,
  dg.ma_the,
  dg.ho_ten,
  dg.so_dien_thoai,
  pm.sach_id,
  s.ten_sach,
  pm.ngay_muon,
  pm.han_tra,
  public.hom_nay() - pm.han_tra as so_ngay_tre,
  (public.hom_nay() - pm.han_tra) * 5000 as phat_du_kien
from public.phieu_muon pm
join public.doc_gia dg on dg.id = pm.doc_gia_id
join public.sach s on s.id = pm.sach_id
where pm.ngay_tra is null and pm.han_tra < public.hom_nay();
