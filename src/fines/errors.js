// Thông báo tiếng Việt cho quá hạn và thu tiền phạt (Flow 6).
// Lỗi nghiệp vụ do RPC thu_tien_phat raise exception: mã nằm trong error.message.
import { MESSAGES } from '../auth/errors.js';
import { formatMoney } from '../readers/errors.js';

export const FINE_MESSAGES = {
  emptyOverdue: 'Không có sách nào quá hạn',
  emptyFines: 'Không có khoản phạt nào chưa thanh toán',
  alreadyPaid: 'Khoản phạt này đã được thu',
  gone: 'Khoản phạt không còn tồn tại',
};

export function paidNotice(amount) {
  return `Đã ghi nhận thu ${formatMoney(amount)}`;
}

function hasCode(error, code) {
  return String(error.message ?? '').includes(code);
}

// Kết quả: { type: 'already_paid' | 'gone', message }  (bỏ dòng, tải lại)
//        | { type: 'general', message }               (giữ dòng, mở khoá nút)
export function classifyPayError(error) {
  if (hasCode(error, 'DA_THU')) return { type: 'already_paid', message: FINE_MESSAGES.alreadyPaid };
  if (hasCode(error, 'PHAT_KHONG_TON_TAI')) return { type: 'gone', message: FINE_MESSAGES.gone };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}
