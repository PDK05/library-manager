// Thông báo tiếng Việt cho việc lập phiếu mượn (Flow 4a, 4b).
// Lỗi nghiệp vụ do RPC lap_phieu_muon raise exception: mã nằm trong error.message, số liệu trong error.details.
import { MESSAGES } from '../auth/errors.js';
import { formatMoney } from '../readers/errors.js';
import { formatDate } from '../readers/date.js';
import { REASON } from './rules.js';

export const LOAN_MESSAGES = {
  outOfStock: 'Sách đã được mượn hết',
  justOutOfStock: 'Sách vừa được mượn hết',
  alreadyBorrowed: 'Độc giả đang mượn sách này',
  readerGone: 'Độc giả không còn tồn tại',
  bookGone: 'Sách không còn tồn tại',
};

export function reasonMessage(reason) {
  switch (reason.ma) {
    case REASON.locked:
      return 'Thẻ độc giả đang bị khoá';
    case REASON.expired:
      return `Thẻ độc giả đã hết hạn ngày ${formatDate(reason.ngay_het_han)}`;
    case REASON.overdue:
      return `Độc giả có ${reason.so_sach} sách quá hạn chưa trả`;
    case REASON.fine:
      return `Độc giả còn ${formatMoney(reason.so_tien)} tiền phạt chưa thanh toán`;
    case REASON.maxLoans:
      return `Độc giả đã mượn tối đa ${reason.toi_da} cuốn`;
    case REASON.sameTitle:
      return LOAN_MESSAGES.alreadyBorrowed;
    default:
      return 'Độc giả không đủ điều kiện mượn sách';
  }
}

function hasCode(error, code) {
  return String(error.message ?? '').includes(code);
}

function parseReasons(error) {
  try {
    const parsed = JSON.parse(error.details);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Kết quả: { type: 'reasons', reasons }  (trạng thái đã đổi: tải lại độc giả)
//        | { type: 'out_of_stock' } | { type: 'reader_gone' } | { type: 'book_gone' }
//        | { type: 'general', message }  (giữ lựa chọn, mở khoá nút)
export function classifyBorrowError(error) {
  if (hasCode(error, 'KHONG_DU_DIEU_KIEN')) return { type: 'reasons', reasons: parseReasons(error) };
  // Ràng buộc duy nhất (độc giả, sách) khi đang mượn: hai thủ thư cùng lập phiếu
  if (error.code === '23505') return { type: 'reasons', reasons: [{ ma: REASON.sameTitle }] };
  if (hasCode(error, 'HET_SACH')) return { type: 'out_of_stock' };
  if (hasCode(error, 'DOC_GIA_KHONG_TON_TAI')) return { type: 'reader_gone' };
  if (hasCode(error, 'SACH_KHONG_TON_TAI')) return { type: 'book_gone' };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}
