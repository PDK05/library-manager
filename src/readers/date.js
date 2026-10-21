// Xử lý ngày dạng 'YYYY-MM-DD' cho thẻ độc giả. Hàm thuần, múi giờ Asia/Ho_Chi_Minh.
// Ngày "hôm nay" ở đây chỉ để gợi ý và báo lỗi sớm; CSDL (hom_nay()) mới là nơi quyết định.

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const vietnamDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function todayInVietnam(now = new Date()) {
  return vietnamDate.format(now);
}

function daysInMonth(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

// Ngày thật trong lịch (loại 2026-02-30, 2026-13-01…)
export function isValidDate(text) {
  const match = DATE_PATTERN.exec(String(text ?? ''));
  if (!match) return false;
  const [year, month, day] = match.slice(1).map(Number);
  return year >= 1 && month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

// Cộng một năm giống Postgres: 29/02 của năm nhuận → 28/02 năm sau
export function addOneYear(text) {
  const [year, month, day] = text.split('-').map(Number);
  const next = year + 1;
  const clamped = Math.min(day, daysInMonth(next, month));
  return `${String(next).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(clamped).padStart(2, '0')}`;
}

// 'YYYY-MM-DD' → 'DD/MM/YYYY'
export function formatDate(text) {
  if (!isValidDate(text)) return String(text ?? '');
  const [year, month, day] = text.split('-');
  return `${day}/${month}/${year}`;
}
