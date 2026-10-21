// Truy vấn Supabase cho quản lý sách. Mọi hàm trả { error } thay vì ném lỗi Supabase;
// lỗi phiên (JWT hết hạn) được ném để withSession làm mới token hoặc đăng xuất (Flow 1c).
import { isSessionError } from '../auth/errors.js';
import { withSession } from '../auth/session.js';
import { supabase } from '../lib/supabase.js';
import { PAGE_SIZE, buildSearchPattern, pageRange } from './query.js';

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

// Sách chưa xoá, kèm số đang cho mượn / còn lại (view v_sach), sắp theo tên
export async function listBooks({ page, term }) {
  const { from, to } = pageRange(page, PAGE_SIZE);
  const { data, count, error } = await run(() => {
    let query = supabase
      .from('v_sach')
      .select('id, ten_sach, tac_gia, the_loai, isbn, nam_xuat_ban, so_luong, so_dang_muon, so_con_lai', {
        count: 'exact',
      })
      .eq('da_xoa', false);
    const pattern = buildSearchPattern(term);
    if (pattern) query = query.ilike('tim_kiem', pattern);
    return query.order('ten_sach').order('id').range(from, to);
  });
  return { rows: data ?? [], count: count ?? 0, error };
}

export async function createBook(values) {
  const { error } = await run(() => supabase.from('sach').insert(values));
  return { error };
}

// gone = true khi không có dòng nào được cập nhật (sách vừa bị xoá)
export async function updateBook(id, values) {
  const { data, error } = await run(() =>
    supabase.from('sach').update(values).eq('id', id).eq('da_xoa', false).select('id'),
  );
  return { gone: !error && data.length === 0, error };
}

// Xoá mềm. Đã bị xoá trước đó (0 dòng) vẫn coi là thành công.
export async function deleteBook(id) {
  const { error } = await run(() =>
    supabase.from('sach').update({ da_xoa: true }).eq('id', id).eq('da_xoa', false),
  );
  return { error };
}
