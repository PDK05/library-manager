// Truy vấn Supabase cho quản lý độc giả. Mọi hàm trả { error } thay vì ném lỗi Supabase;
// lỗi phiên (JWT hết hạn) được ném để withSession làm mới token hoặc đăng xuất (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { PAGE_SIZE, buildSearchPattern, pageRange } from '../books/query.js';
import { supabase } from '../lib/supabase.js';

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

// Độc giả chưa xoá, kèm trạng thái hiển thị, số đang mượn và tiền phạt chưa thu (view v_doc_gia), sắp theo mã thẻ
export async function listReaders({ page, term }) {
  const { from, to } = pageRange(page, PAGE_SIZE);
  const { data, count, error } = await run(() => {
    let query = supabase
      .from('v_doc_gia')
      .select(
        'id, ma_the, ho_ten, email, so_dien_thoai, ngay_het_han, trang_thai, trang_thai_hien_thi, user_id, so_dang_muon, tong_phat_chua_thanh_toan',
        { count: 'exact' },
      )
      .eq('da_xoa', false);
    const pattern = buildSearchPattern(term);
    if (pattern) query = query.ilike('tim_kiem', pattern);
    return query.order('ma_the').range(from, to);
  });
  return { rows: data ?? [], count: count ?? 0, error };
}

// Trả về mã thẻ CSDL vừa sinh (DG000001…)
export async function createReader(values) {
  const { data, error } = await run(() => supabase.from('doc_gia').insert(values).select('ma_the'));
  return { maThe: data?.[0]?.ma_the ?? null, error };
}

// gone = true khi không có dòng nào được cập nhật (độc giả vừa bị xoá)
export async function updateReader(id, values) {
  const { data, error } = await run(() =>
    supabase.from('doc_gia').update(values).eq('id', id).eq('da_xoa', false).select('id'),
  );
  return { gone: !error && data.length === 0, error };
}

// RPC xoa_doc_gia: kiểm tra sách đang mượn / phạt chưa thu và xoá mềm trong một transaction
export async function deleteReader(id) {
  const { error } = await run(() => supabase.rpc('xoa_doc_gia', { p_doc_gia_id: id }));
  return { error };
}
