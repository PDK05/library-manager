// '2026-10-21' → '21/10/2026'. Ngày từ CSDL là chuỗi ISO, không qua Date để tránh lệch múi giờ.
export function formatDate(isoDate) {
  const [year, month, day] = String(isoDate).split('-');
  return `${day}/${month}/${year}`;
}
