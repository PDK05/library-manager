import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../auth/errors.js';
import { LOAN_MESSAGES, classifyBorrowError, reasonMessage } from './errors.js';

describe('reasonMessage', () => {
  it('dựng thông báo tiếng Việt theo từng mã', () => {
    expect(reasonMessage({ ma: 'THE_BI_KHOA' })).toBe('Thẻ độc giả đang bị khoá');
    expect(reasonMessage({ ma: 'THE_HET_HAN', ngay_het_han: '2026-03-09' })).toBe(
      'Thẻ độc giả đã hết hạn ngày 09/03/2026',
    );
    expect(reasonMessage({ ma: 'CO_SACH_QUA_HAN', so_sach: 2 })).toBe('Độc giả có 2 sách quá hạn chưa trả');
    expect(reasonMessage({ ma: 'CON_PHAT', so_tien: 15000 })).toBe('Độc giả còn 15.000 đ tiền phạt chưa thanh toán');
    expect(reasonMessage({ ma: 'DA_MUON_TOI_DA', toi_da: 5 })).toBe('Độc giả đã mượn tối đa 5 cuốn');
    expect(reasonMessage({ ma: 'DANG_MUON_DAU_SACH' })).toBe(LOAN_MESSAGES.alreadyBorrowed);
  });

  it('mã lạ → thông báo chung', () => {
    expect(reasonMessage({ ma: 'XYZ' })).toBe('Độc giả không đủ điều kiện mượn sách');
  });
});

describe('classifyBorrowError', () => {
  it('không đủ điều kiện → danh sách lý do từ details', () => {
    const reasons = [{ ma: 'THE_BI_KHOA' }, { ma: 'CON_PHAT', so_tien: 5000 }];
    const error = { message: 'KHONG_DU_DIEU_KIEN', details: JSON.stringify(reasons) };
    expect(classifyBorrowError(error)).toEqual({ type: 'reasons', reasons });
  });

  it('details hỏng → danh sách lý do rỗng, không ném lỗi', () => {
    expect(classifyBorrowError({ message: 'KHONG_DU_DIEU_KIEN', details: 'x' })).toEqual({
      type: 'reasons',
      reasons: [],
    });
  });

  it('vi phạm ràng buộc duy nhất → đang mượn cùng đầu sách', () => {
    expect(classifyBorrowError({ code: '23505', message: 'duplicate key' })).toEqual({
      type: 'reasons',
      reasons: [{ ma: 'DANG_MUON_DAU_SACH' }],
    });
  });

  it('hết sách, độc giả / sách không tồn tại', () => {
    expect(classifyBorrowError({ message: 'HET_SACH' })).toEqual({ type: 'out_of_stock' });
    expect(classifyBorrowError({ message: 'DOC_GIA_KHONG_TON_TAI' })).toEqual({ type: 'reader_gone' });
    expect(classifyBorrowError({ message: 'SACH_KHONG_TON_TAI' })).toEqual({ type: 'book_gone' });
  });

  it('không có quyền → thông báo quyền; còn lại → lỗi mạng chung', () => {
    expect(classifyBorrowError({ code: '42501', message: 'KHONG_CO_QUYEN' })).toEqual({
      type: 'general',
      message: MESSAGES.forbidden,
    });
    expect(classifyBorrowError({ message: 'Failed to fetch' })).toEqual({
      type: 'general',
      message: MESSAGES.network,
    });
  });
});
