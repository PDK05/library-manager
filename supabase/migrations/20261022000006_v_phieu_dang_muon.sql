-- F5: danh sách phiếu đang mượn để nhận trả (tìm theo mã thẻ / họ tên độc giả / tên sách).
-- Số ngày trễ và tiền phạt dự kiến tính theo hom_nay() của server, giống v_phieu_qua_han.
create view public.v_phieu_dang_muon with (security_invoker = true) as
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
  public.f_unaccent(lower(dg.ma_the || ' ' || dg.ho_ten || ' ' || s.ten_sach)) as tim_kiem
from public.phieu_muon pm
join public.doc_gia dg on dg.id = pm.doc_gia_id
join public.sach s on s.id = pm.sach_id
where pm.ngay_tra is null;

grant select on public.v_phieu_dang_muon to authenticated;
