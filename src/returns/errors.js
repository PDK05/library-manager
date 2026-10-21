// Thông báo tiếng Việt cho việc nhận trả sách (Flow 5).
// Lỗi nghiệp vụ do RPC nhan_tra_sach raise exception: mã nằm trong error.message, số liệu trong error.details.
import { MESSAGES } from '../auth/errors.js';
import { formatDate } from '../readers/date.js';
import { formatMoney } from '../readers/errors.js';

export const RETURN_MESSAGES = {
  empty: 'Không có phiếu mượn nào đang mở',
  gone: 'Phiếu mượn không còn tồn tại',
};

export function alreadyReturnedMessage(returnDate) {
  return returnDate ? `Phiếu này đã được trả ngày ${formatDate(returnDate)}` : 'Phiếu này đã được trả';
}

export function lateNotice(days, amount) {
  return `Trễ ${days} ngày, phạt ${formatMoney(amount)}`;
}

function hasCode(error, code) {
  return String(error.message ?? '').includes(code);
}

function parseReturnDate(error) {
  try {
    return JSON.parse(error.details)?.ngay_tra ?? null;
  } catch {
    return null;
  }
}

// Kết quả: { type: 'already_returned', message }  (bỏ phiếu khỏi danh sách, tải lại)
//        | { type: 'gone', message }               (phiếu không còn: tải lại)
//        | { type: 'general', message }            (phiếu vẫn đang mượn, mở khoá nút)
export function classifyReturnError(error) {
  if (hasCode(error, 'DA_TRA')) {
    return { type: 'already_returned', message: alreadyReturnedMessage(parseReturnDate(error)) };
  }
  if (hasCode(error, 'PHIEU_KHONG_TON_TAI')) return { type: 'gone', message: RETURN_MESSAGES.gone };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}
