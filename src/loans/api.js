// Truy vấn Supabase cho lập phiếu mượn. Mọi hàm trả { error } thay vì ném lỗi Supabase;
// lỗi phiên (JWT hết hạn) được ném để withSession làm mới token hoặc đăng xuất (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { supabase } from '../lib/supabase.js';
import { todayInVietnam } from '../readers/date.js';

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

// Ngày hôm nay theo đồng hồ server (hom_nay()); lỗi mạng thì dùng giờ Việt Nam của máy chỉ để hiển thị
export async function fetchToday() {
  const { data, error } = await run(() => supabase.rpc('hom_nay'));
  return error || typeof data !== 'string' ? todayInVietnam() : data;
}

// Độc giả chưa xoá kèm số sách đang mượn / quá hạn / tiền phạt chưa thu (view v_doc_gia)
export async function getReader(id) {
  const { data, error } = await run(() =>
    supabase
      .from('v_doc_gia')
      .select(
        'id, ma_the, ho_ten, so_dien_thoai, ngay_het_han, trang_thai, trang_thai_hien_thi, so_dang_muon, so_qua_han, tong_phat_chua_thanh_toan',
      )
      .eq('id', id)
      .eq('da_xoa', false)
      .maybeSingle(),
  );
  return { reader: data ?? null, error };
}

// Sách chưa xoá kèm số còn lại (view v_sach)
export async function getBook(id) {
  const { data, error } = await run(() =>
    supabase
      .from('v_sach')
      .select('id, ten_sach, tac_gia, so_luong, so_con_lai')
      .eq('id', id)
      .eq('da_xoa', false)
      .maybeSingle(),
  );
  return { book: data ?? null, error };
}

// Các phiếu đang mượn của độc giả, hạn trả gần nhất trước
export async function listActiveLoans(readerId) {
  const { data, error } = await run(() =>
    supabase
      .from('phieu_muon')
      .select('id, sach_id, han_tra, sach(ten_sach)')
      .eq('doc_gia_id', readerId)
      .is('ngay_tra', null)
      .order('han_tra'),
  );
  return { loans: data ?? [], error };
}

// RPC lap_phieu_muon: kiểm tra lại mọi điều kiện, khoá dòng và lập phiếu với ngày theo giờ server
export async function createLoan(readerId, bookId) {
  const { data, error } = await run(() =>
    supabase.rpc('lap_phieu_muon', { p_doc_gia_id: readerId, p_sach_id: bookId }),
  );
  return { loan: data ?? null, error };
}
