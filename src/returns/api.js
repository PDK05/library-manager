// Truy vấn Supabase cho nhận trả sách. Mọi hàm trả { error } thay vì ném lỗi Supabase;
// lỗi phiên (JWT hết hạn) được ném để withSession làm mới token hoặc đăng xuất (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { buildSearchPattern } from '../books/query.js';
import { supabase } from '../lib/supabase.js';

async function run(buildQuery) {
  return withSession(async () => {
    let result;
    try {
      result = await buildQuery();
    } catch (thrown) {
      return { data: null, error: thrown };
    }
    if (isSessionError(result.error)) throw result.error;
    return result;
  });
}

// Phiếu đang mượn (view v_phieu_dang_muon), tìm theo mã thẻ / họ tên độc giả / tên sách.
// Quá hạn nhiều ngày nhất lên đầu, sau đó theo hạn trả.
export async function listOpenLoans({ term }) {
  const { data, error } = await run(() => {
    let query = supabase
      .from('v_phieu_dang_muon')
      .select('phieu_muon_id, doc_gia_id, ma_the, ho_ten, ten_sach, ngay_muon, han_tra, so_ngay_tre, phat_du_kien');
    const pattern = buildSearchPattern(term);
    if (pattern) query = query.ilike('tim_kiem', pattern);
    return query.order('han_tra').order('phieu_muon_id').limit(100);
  });
  return { rows: data ?? [], error };
}

// RPC nhan_tra_sach: khoá phiếu, ngày trả theo giờ server, tự tạo khoản phạt nếu trễ
export async function returnLoan(loanId) {
  const { data, error } = await run(() => supabase.rpc('nhan_tra_sach', { p_phieu_id: loanId }));
  return { result: data ?? null, error };
}
