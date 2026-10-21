// Tìm kiếm và phân trang danh sách sách (Flow 2d). Hàm thuần.

export const PAGE_SIZE = 20;

// Cột tim_kiem trong CSDL đã bỏ dấu và chữ thường (f_unaccent(lower(...))),
// nên từ khoá phải được chuẩn hoá giống vậy trước khi đưa vào ILIKE.
export function stripDiacritics(text) {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Trả về mẫu ILIKE, hoặc null khi từ khoá rỗng (hiện toàn bộ danh sách).
// Escape \ % _ để người dùng gõ ký tự đó vẫn tìm đúng nghĩa đen.
export function buildSearchPattern(term) {
  const normalized = stripDiacritics(String(term ?? '').trim().toLowerCase()).replace(/\s+/g, ' ');
  if (!normalized) return null;
  return `%${normalized.replace(/[\\%_]/g, '\\$&')}%`;
}

// Khoảng dòng (bao gồm hai đầu) cho Supabase .range()
export function pageRange(page, size = PAGE_SIZE) {
  const from = (page - 1) * size;
  return { from, to: from + size - 1 };
}

export function totalPages(count, size = PAGE_SIZE) {
  return Math.max(1, Math.ceil(count / size));
}
