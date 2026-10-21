// Đổi lỗi Supabase khi lưu / xoá độc giả thành thông báo tiếng Việt (Flow 3a, 3c).
// Mã lỗi nghiệp vụ do trigger tg_doc_gia_kiem_tra và RPC xoa_doc_gia raise exception, nằm trong error.message.
import { MESSAGES } from '../auth/errors.js';
import { EXPIRY_PAST_MESSAGE } from './validation.js';

export const READER_MESSAGES = {
  gone: 'Độc giả không còn tồn tại',
  emailTaken: 'Email đã được sử dụng',
  emailLocked: 'Không đổi được email vì độc giả đã có tài khoản',
  invalidData: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
};

export function formatMoney(amount) {
  return `${Number(amount).toLocaleString('vi-VN')} đ`;
}

export function booksBlockMessage(count) {
  return `Không thể xoá: độc giả còn ${count} sách chưa trả`;
}

export function fineBlockMessage(amount) {
  return `Không thể xoá: độc giả còn ${formatMoney(amount)} tiền phạt chưa thanh toán`;
}

function hasCode(error, code) {
  return String(error.message ?? '').includes(code);
}

// error.details là JSON do RPC đính kèm, ví dụ {"so_sach": 2}
function detailValue(error, key) {
  try {
    const value = JSON.parse(error.details)[key];
    return Number.isInteger(value) ? value : null;
  } catch {
    return null;
  }
}

// Kết quả: { type: 'field', errors } | { type: 'gone' } | { type: 'general', message }
export function classifySaveError(error) {
  if (error.code === '23505') return { type: 'field', errors: { email: READER_MESSAGES.emailTaken } };
  if (hasCode(error, 'NGAY_HET_HAN_KHONG_HOP_LE')) {
    return { type: 'field', errors: { ngay_het_han: EXPIRY_PAST_MESSAGE } };
  }
  if (hasCode(error, 'EMAIL_KHONG_SUA_DUOC')) {
    return { type: 'field', errors: { email: READER_MESSAGES.emailLocked } };
  }
  if (hasCode(error, 'DA_XOA')) return { type: 'gone' };
  if (error.code === '23514') return { type: 'general', message: READER_MESSAGES.invalidData };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}

// Kết quả: { type: 'blocked', message } (còn sách / còn phạt, cần tải lại dòng)
//        | { type: 'gone' } (đã bị xoá trước đó, coi như thành công)
//        | { type: 'general', message }
export function classifyDeleteError(error) {
  if (hasCode(error, 'CON_SACH')) {
    const count = detailValue(error, 'so_sach');
    return { type: 'blocked', message: count == null ? 'Không thể xoá: độc giả còn sách chưa trả' : booksBlockMessage(count) };
  }
  if (hasCode(error, 'CON_PHAT')) {
    const amount = detailValue(error, 'so_tien');
    return {
      type: 'blocked',
      message: amount == null ? 'Không thể xoá: độc giả còn tiền phạt chưa thanh toán' : fineBlockMessage(amount),
    };
  }
  if (hasCode(error, 'DOC_GIA_KHONG_TON_TAI')) return { type: 'gone' };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}
