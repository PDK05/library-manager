// Tính số ngày trễ và tiền phạt khi trả sách (Flow 5). Hàm thuần, không đụng DOM.
// Client dùng để hiện tiền phạt dự kiến; RPC nhan_tra_sach tính lại và là nơi quyết định cuối cùng.

export const FINE_PER_DAY = 5000;

function toDayNumber(text) {
  const [year, month, day] = text.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / 86400000;
}

// Số ngày lịch trễ = ngày trả − hạn trả; trả đúng hạn hoặc sớm thì 0
export function daysLate(today, dueDate) {
  return Math.max(0, toDayNumber(today) - toDayNumber(dueDate));
}

export function fineFor(days) {
  return days * FINE_PER_DAY;
}
