// Xác định vai trò sau khi có phiên (Flow 1d).
import { formatDate } from '../lib/format.js';

export const ROLE = {
  librarian: 'librarian',
  reader: 'reader',
};

export const HOME = {
  [ROLE.librarian]: '#/quan-tri',
  [ROLE.reader]: '#/doc-gia',
};

// Cảnh báo trên trang độc giả theo trang_thai_hien_thi của v_doc_gia; null khi thẻ hoạt động.
export function readerWarning(reader) {
  if (reader.trang_thai_hien_thi === 'bi_khoa') {
    return 'Thẻ của bạn đang bị khoá. Vui lòng liên hệ thủ thư.';
  }
  if (reader.trang_thai_hien_thi === 'het_han') {
    return `Thẻ của bạn đã hết hạn ngày ${formatDate(reader.ngay_het_han)}.`;
  }
  return null;
}

// librarian / reader là dòng thu_thu / v_doc_gia của user hiện tại (null nếu không có).
// Không có hồ sơ nào (chưa liên kết hoặc độc giả đã bị xoá) → role null.
export function decideRole(librarian, reader) {
  if (librarian) return { role: ROLE.librarian, profile: librarian, warning: null };
  if (reader) return { role: ROLE.reader, profile: reader, warning: readerWarning(reader) };
  return { role: null, profile: null, warning: null };
}

export async function loadRole(client, userId) {
  const [librarian, reader] = await Promise.all([
    client.from('thu_thu').select('id, ho_ten, email').eq('user_id', userId).maybeSingle(),
    client
      .from('v_doc_gia')
      .select('id, ma_the, ho_ten, email, ngay_het_han, trang_thai_hien_thi')
      .eq('user_id', userId)
      .eq('da_xoa', false)
      .maybeSingle(),
  ]);
  const error = librarian.error ?? reader.error;
  if (error) throw error;
  return decideRole(librarian.data, reader.data);
}
