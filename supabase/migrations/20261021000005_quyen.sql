-- Quyền: anon không đọc/ghi gì; authenticated chỉ ghi các cột được phép, còn lại qua RPC.
-- RLS quyết định dòng nào; GRANT theo cột chặn sửa ma_the, user_id, da_xoa của doc_gia.

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke execute on all functions in schema public from public, anon, authenticated;

grant select on public.thu_thu, public.doc_gia, public.sach, public.phieu_muon, public.tien_phat
  to authenticated;
grant select on public.v_sach, public.v_doc_gia, public.v_phieu_qua_han to authenticated;

grant insert (ho_ten, email, so_dien_thoai, ngay_het_han, trang_thai),
      update (ho_ten, email, so_dien_thoai, ngay_het_han, trang_thai)
  on public.doc_gia to authenticated;
grant usage on sequence public.doc_gia_ma_the_seq to authenticated;

grant insert (ten_sach, tac_gia, the_loai, isbn, nam_xuat_ban, so_luong),
      update (ten_sach, tac_gia, the_loai, isbn, nam_xuat_ban, so_luong, da_xoa)
  on public.sach to authenticated;

-- Hàm dùng trong cột generated, default, policy và view
grant execute on function
  public.hom_nay(),
  public.f_unaccent(text),
  public.la_thu_thu(),
  public.thu_thu_hien_tai(),
  public.doc_gia_hien_tai(),
  public.so_dang_muon(uuid)
  to authenticated;

-- RPC (tự kiểm tra la_thu_thu() ở đầu hàm)
grant execute on function
  public.lap_phieu_muon(uuid, uuid),
  public.nhan_tra_sach(uuid),
  public.thu_tien_phat(uuid),
  public.xoa_doc_gia(uuid)
  to authenticated;

-- Đối tượng tạo sau này không tự cấp quyền cho anon
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;
