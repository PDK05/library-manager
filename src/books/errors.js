// Đổi lỗi Supabase khi lưu / xoá sách thành thông báo tiếng Việt (Flow 2a, 2c; README quyết định #9).
// Mã lỗi nghiệp vụ do trigger tg_sach_kiem_tra raise exception, nằm trong error.message.
import { MESSAGES } from '../auth/errors.js';
import { LIMITS, quantityBelowBorrowedMessage } from './validation.js';

export const BOOK_MESSAGES = {
  gone: 'Sách không còn tồn tại',
  isbnTaken: 'ISBN đã tồn tại',
  invalidData: 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.',
  borrowedBlock: 'Không thể xoá: sách đang được mượn',
};

export function borrowedBlockMessage(borrowed) {
  return `Không thể xoá: còn ${borrowed} cuốn đang được mượn`;
}

function hasCode(error, code) {
  return String(error.message ?? '').includes(code);
}

// error.details là JSON do trigger đính kèm, ví dụ {"so_dang_muon": 3}
function borrowedFrom(error) {
  try {
    const borrowed = JSON.parse(error.details).so_dang_muon;
    return Number.isInteger(borrowed) ? borrowed : null;
  } catch {
    return null;
  }
}

// Kết quả: { type: 'field', errors } | { type: 'gone' } | { type: 'general', message }
export function classifySaveError(error) {
  if (error.code === '23505') return { type: 'field', errors: { isbn: BOOK_MESSAGES.isbnTaken } };
  if (hasCode(error, 'SO_LUONG_NHO_HON_DANG_MUON')) {
    const borrowed = borrowedFrom(error);
    return {
      type: 'field',
      errors: {
        so_luong: borrowed == null ? 'Số lượng nhỏ hơn số cuốn đang được mượn' : quantityBelowBorrowedMessage(borrowed),
      },
    };
  }
  if (hasCode(error, 'NAM_XUAT_BAN_KHONG_HOP_LE')) {
    return { type: 'field', errors: { nam_xuat_ban: `Năm xuất bản từ ${LIMITS.yearMin} đến năm hiện tại` } };
  }
  if (hasCode(error, 'DA_XOA')) return { type: 'gone' };
  if (error.code === '23514') return { type: 'general', message: BOOK_MESSAGES.invalidData };
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}

// Kết quả: { type: 'blocked', message } (còn sách đang mượn, cần tải lại dòng) | { type: 'general', message }
export function classifyDeleteError(error) {
  if (hasCode(error, 'CON_SACH_DANG_MUON')) {
    const borrowed = borrowedFrom(error);
    return { type: 'blocked', message: borrowed == null ? BOOK_MESSAGES.borrowedBlock : borrowedBlockMessage(borrowed) };
  }
  if (error.code === '42501') return { type: 'general', message: MESSAGES.forbidden };
  return { type: 'general', message: MESSAGES.network };
}
