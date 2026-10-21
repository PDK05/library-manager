// Truy vấn Supabase cho phiếu quá hạn và tiền phạt. Mọi hàm trả { error } thay vì ném lỗi Supabase;
// lỗi phiên (JWT hết hạn) được ném để withSession làm mới token hoặc đăng xuất (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { supabase } from '../lib/supabase.js';

export const PAGE_SIZE = 20;

async function run(buildQuery) {
  return withSession(async () => {
    let result;
    try {
      result = await buildQuery();
    } catch (thrown) {
      return { data: null, count: null, error: thrown };
    }
    if (isSessionError(result.error)) throw result.error;
    return result;
  });
}

// Phiếu quá hạn (view v_phieu_qua_han): trễ nhiều ngày nhất lên đầu (= hạn trả sớm nhất), cùng ngày theo họ tên
export async function listOverdue({ page }) {
  const from = (page - 1) * PAGE_SIZE;
  const { data, count, error } = await run(() =>
    supabase
      .from('v_phieu_qua_han')
      .select('phieu_muon_id, ma_the, ho_ten, so_dien_thoai, ten_sach, han_tra, so_ngay_tre, phat_du_kien', { count: 'exact' })
      .order('han_tra')
      .order('ho_ten')
      .order('phieu_muon_id')
      .range(from, from + PAGE_SIZE - 1),
  );
  return { rows: data ?? [], count: count ?? 0, error };
}

// Khoản phạt chưa thanh toán, kèm độc giả và sách; làm phẳng để dùng trực tiếp ở giao diện
export async function listUnpaidFines() {
  const { data, error } = await run(() =>
    supabase
      .from('tien_phat')
      .select('id, so_ngay_tre, so_tien, ngay_phat_sinh, phieu_muon(doc_gia(id, ma_the, ho_ten), sach(ten_sach))')
      .eq('trang_thai', 'chua_thanh_toan')
      .order('ngay_phat_sinh')
      .order('id'),
  );
  const rows = (data ?? []).map((row) => ({
    id: row.id,
    so_ngay_tre: row.so_ngay_tre,
    so_tien: row.so_tien,
    ngay_phat_sinh: row.ngay_phat_sinh,
    doc_gia_id: row.phieu_muon.doc_gia.id,
    ma_the: row.phieu_muon.doc_gia.ma_the,
    ho_ten: row.phieu_muon.doc_gia.ho_ten,
    ten_sach: row.phieu_muon.sach.ten_sach,
  }));
  return { rows, error };
}

// RPC thu_tien_phat: chỉ chuyển khoản còn "Chưa thanh toán"; ngày thu theo giờ server
export async function payFine(fineId) {
  const { data, error } = await run(() => supabase.rpc('thu_tien_phat', { p_phat_id: fineId }));
  return { result: data ?? null, error };
}
