// Truy vấn Supabase cho trang độc giả. Chạy với quyền độc giả: RLS chỉ trả phiếu và khoản phạt của chính họ.
// Mọi hàm trả { error } thay vì ném lỗi Supabase; lỗi phiên (JWT hết hạn) được ném để withSession xử lý (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { supabase } from '../lib/supabase.js';

export const HISTORY_PAGE_SIZE = 20;

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

// Phiếu chưa trả của tôi, hạn trả sớm nhất (hoặc đã quá hạn) lên đầu
export async function listMyLoans() {
  const { data, error } = await run(() =>
    supabase
      .from('v_phieu_dang_muon')
      .select('phieu_muon_id, ten_sach, ngay_muon, han_tra, so_ngay_tre, phat_du_kien, so_ngay_con_lai')
      .order('han_tra')
      .order('phieu_muon_id'),
  );
  return { rows: data ?? [], error };
}

// Phiếu đã trả kèm khoản phạt, mới trả nhất trước
export async function listMyHistory({ page }) {
  const from = (page - 1) * HISTORY_PAGE_SIZE;
  const { data, count, error } = await run(() =>
    supabase
      .from('phieu_muon')
      .select('id, ngay_muon, ngay_tra, sach(ten_sach), tien_phat(so_ngay_tre, so_tien, trang_thai)', { count: 'exact' })
      .not('ngay_tra', 'is', null)
      .order('ngay_tra', { ascending: false })
      .order('id')
      .range(from, from + HISTORY_PAGE_SIZE - 1),
  );
  return { rows: data ?? [], count: count ?? 0, error };
}

// Tổng tiền phạt chưa thanh toán của tôi (cột của v_doc_gia)
export async function getMyUnpaidTotal(readerId) {
  const { data, error } = await run(() =>
    supabase.from('v_doc_gia').select('tong_phat_chua_thanh_toan').eq('id', readerId).maybeSingle(),
  );
  return { total: data?.tong_phat_chua_thanh_toan ?? 0, error };
}
