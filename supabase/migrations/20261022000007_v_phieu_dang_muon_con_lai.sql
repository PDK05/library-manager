-- F7: trang độc giả cần "còn N ngày" theo hom_nay() của server (không dùng giờ trình duyệt).
-- Thêm cột so_ngay_con_lai ở cuối view (create or replace chỉ cho phép thêm cột cuối).
-- Độc giả đọc view này với quyền của mình (security_invoker) nên chỉ thấy phiếu của chính họ.
create or replace view public.v_phieu_dang_muon with (security_invoker = true) as
select
  pm.id as phieu_muon_id,
  pm.doc_gia_id,
  dg.ma_the,
  dg.ho_ten,
  pm.sach_id,
  s.ten_sach,
  pm.ngay_muon,
  pm.han_tra,
  greatest(public.hom_nay() - pm.han_tra, 0) as so_ngay_tre,
  greatest(public.hom_nay() - pm.han_tra, 0) * 5000 as phat_du_kien,
  public.f_unaccent(lower(dg.ma_the || ' ' || dg.ho_ten || ' ' || s.ten_sach)) as tim_kiem,
  pm.han_tra - public.hom_nay() as so_ngay_con_lai
from public.phieu_muon pm
join public.doc_gia dg on dg.id = pm.doc_gia_id
join public.sach s on s.id = pm.sach_id
where pm.ngay_tra is null;

-- View chỉ để đọc: bỏ các quyền ghi thừa mà Supabase cấp mặc định
revoke all on public.v_phieu_dang_muon from authenticated;
grant select on public.v_phieu_dang_muon to authenticated;
