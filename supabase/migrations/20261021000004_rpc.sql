-- RPC nghiệp vụ: một transaction, khoá dòng, CSDL là nơi quyết định cuối cùng.
-- Lỗi nghiệp vụ: message = mã lỗi, detail = JSON kèm số liệu để client dựng thông báo tiếng Việt.

create function public.lap_phieu_muon(p_doc_gia_id uuid, p_sach_id uuid)
returns public.phieu_muon
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thu_thu_id uuid := public.thu_thu_hien_tai();
  v_hom_nay date := public.hom_nay();
  v_doc_gia public.doc_gia;
  v_sach public.sach;
  v_ly_do jsonb := '[]'::jsonb;
  v_dang_muon integer;
  v_qua_han integer;
  v_cung_dau_sach integer;
  v_tong_phat integer;
  v_sach_dang_muon integer;
  v_phieu public.phieu_muon;
begin
  if v_thu_thu_id is null then
    raise exception 'KHONG_CO_QUYEN' using errcode = '42501';
  end if;

  -- Luôn khoá độc giả trước rồi đến sách để tránh deadlock
  select * into v_doc_gia from public.doc_gia
  where id = p_doc_gia_id and not da_xoa
  for update;
  if not found then
    raise exception 'DOC_GIA_KHONG_TON_TAI';
  end if;

  select * into v_sach from public.sach
  where id = p_sach_id and not da_xoa
  for update;
  if not found then
    raise exception 'SACH_KHONG_TON_TAI';
  end if;

  -- Flow 4b: gom tất cả lý do
  if v_doc_gia.trang_thai = 'bi_khoa' then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'THE_BI_KHOA');
  end if;
  if v_doc_gia.ngay_het_han < v_hom_nay then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'THE_HET_HAN', 'ngay_het_han', v_doc_gia.ngay_het_han);
  end if;

  select
    count(*),
    count(*) filter (where han_tra < v_hom_nay),
    count(*) filter (where sach_id = p_sach_id)
  into v_dang_muon, v_qua_han, v_cung_dau_sach
  from public.phieu_muon
  where doc_gia_id = p_doc_gia_id and ngay_tra is null;

  if v_qua_han > 0 then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'CO_SACH_QUA_HAN', 'so_sach', v_qua_han);
  end if;

  select coalesce(sum(tp.so_tien), 0) into v_tong_phat
  from public.tien_phat tp
  join public.phieu_muon pm on pm.id = tp.phieu_muon_id
  where pm.doc_gia_id = p_doc_gia_id and tp.trang_thai = 'chua_thanh_toan';

  if v_tong_phat > 0 then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'CON_PHAT', 'so_tien', v_tong_phat);
  end if;
  if v_dang_muon >= 5 then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'DA_MUON_TOI_DA', 'toi_da', 5);
  end if;
  if v_cung_dau_sach > 0 then
    v_ly_do := v_ly_do || jsonb_build_object('ma', 'DANG_MUON_DAU_SACH');
  end if;

  if jsonb_array_length(v_ly_do) > 0 then
    raise exception 'KHONG_DU_DIEU_KIEN' using detail = v_ly_do::text;
  end if;

  select count(*) into v_sach_dang_muon
  from public.phieu_muon
  where sach_id = p_sach_id and ngay_tra is null;

  if v_sach_dang_muon >= v_sach.so_luong then
    raise exception 'HET_SACH';
  end if;

  insert into public.phieu_muon (doc_gia_id, sach_id, ngay_muon, han_tra, thu_thu_lap_id)
  values (p_doc_gia_id, p_sach_id, v_hom_nay, v_hom_nay + 14, v_thu_thu_id)
  returning * into v_phieu;

  return v_phieu;
end;
$$;

create function public.nhan_tra_sach(p_phieu_id uuid)
returns jsonb
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thu_thu_id uuid := public.thu_thu_hien_tai();
  v_hom_nay date := public.hom_nay();
  v_phieu public.phieu_muon;
  v_phat public.tien_phat;
  v_so_ngay_tre integer;
begin
  if v_thu_thu_id is null then
    raise exception 'KHONG_CO_QUYEN' using errcode = '42501';
  end if;

  select * into v_phieu from public.phieu_muon
  where id = p_phieu_id
  for update;
  if not found then
    raise exception 'PHIEU_KHONG_TON_TAI';
  end if;

  -- Idempotent: trả lại lần hai không tạo phạt lần hai
  if v_phieu.ngay_tra is not null then
    raise exception 'DA_TRA' using detail = json_build_object('ngay_tra', v_phieu.ngay_tra)::text;
  end if;

  update public.phieu_muon
  set ngay_tra = v_hom_nay, thu_thu_nhan_tra_id = v_thu_thu_id
  where id = p_phieu_id
  returning * into v_phieu;

  v_so_ngay_tre := v_hom_nay - v_phieu.han_tra;
  if v_so_ngay_tre > 0 then
    insert into public.tien_phat (phieu_muon_id, so_ngay_tre, so_tien, ngay_phat_sinh)
    values (p_phieu_id, v_so_ngay_tre, v_so_ngay_tre * 5000, v_hom_nay)
    returning * into v_phat;
  end if;

  return jsonb_build_object(
    'phieu_muon', to_jsonb(v_phieu),
    'tien_phat', case when v_so_ngay_tre > 0 then to_jsonb(v_phat) end
  );
end;
$$;

create function public.thu_tien_phat(p_phat_id uuid)
returns public.tien_phat
language plpgsql security definer
set search_path = ''
as $$
declare
  v_thu_thu_id uuid := public.thu_thu_hien_tai();
  v_phat public.tien_phat;
begin
  if v_thu_thu_id is null then
    raise exception 'KHONG_CO_QUYEN' using errcode = '42501';
  end if;

  update public.tien_phat
  set trang_thai = 'da_thanh_toan', ngay_thu = public.hom_nay(), nguoi_thu_id = v_thu_thu_id
  where id = p_phat_id and trang_thai = 'chua_thanh_toan'
  returning * into v_phat;

  if not found then
    if exists (select 1 from public.tien_phat where id = p_phat_id) then
      raise exception 'DA_THU';
    end if;
    raise exception 'PHAT_KHONG_TON_TAI';
  end if;

  return v_phat;
end;
$$;

-- Xoá mềm độc giả và xoá tài khoản đăng nhập (nếu có) để email dùng lại được (ERD quyết định #6)
create function public.xoa_doc_gia(p_doc_gia_id uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  v_doc_gia public.doc_gia;
  v_dang_muon integer;
  v_tong_phat integer;
begin
  if not public.la_thu_thu() then
    raise exception 'KHONG_CO_QUYEN' using errcode = '42501';
  end if;

  select * into v_doc_gia from public.doc_gia
  where id = p_doc_gia_id and not da_xoa
  for update;
  if not found then
    raise exception 'DOC_GIA_KHONG_TON_TAI';
  end if;

  select count(*) into v_dang_muon
  from public.phieu_muon
  where doc_gia_id = p_doc_gia_id and ngay_tra is null;
  if v_dang_muon > 0 then
    raise exception 'CON_SACH' using detail = json_build_object('so_sach', v_dang_muon)::text;
  end if;

  select coalesce(sum(tp.so_tien), 0) into v_tong_phat
  from public.tien_phat tp
  join public.phieu_muon pm on pm.id = tp.phieu_muon_id
  where pm.doc_gia_id = p_doc_gia_id and tp.trang_thai = 'chua_thanh_toan';
  if v_tong_phat > 0 then
    raise exception 'CON_PHAT' using detail = json_build_object('so_tien', v_tong_phat)::text;
  end if;

  update public.doc_gia
  set da_xoa = true, user_id = null
  where id = p_doc_gia_id;

  if v_doc_gia.user_id is not null then
    delete from auth.users where id = v_doc_gia.user_id;
  end if;
end;
$$;
