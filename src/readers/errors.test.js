import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../auth/errors.js';
import { READER_MESSAGES, classifyDeleteError, classifySaveError, formatMoney } from './errors.js';

describe('formatMoney', () => {
  it('có dấu chấm ngăn nghìn và đơn vị đ', () => {
    expect(formatMoney(5000)).toBe('5.000 đ');
    expect(formatMoney(1250000)).toBe('1.250.000 đ');
    expect(formatMoney(0)).toBe('0 đ');
  });
});

describe('classifySaveError', () => {
  it('trùng email → lỗi dưới ô email', () => {
    expect(classifySaveError({ code: '23505', message: 'duplicate key' })).toEqual({
      type: 'field',
      errors: { email: READER_MESSAGES.emailTaken },
    });
  });

  it('ngày hết hạn đã qua → lỗi dưới ô ngày hết hạn', () => {
    const result = classifySaveError({ message: 'NGAY_HET_HAN_KHONG_HOP_LE' });
    expect(result).toEqual({ type: 'field', errors: { ngay_het_han: 'Ngày hết hạn phải từ hôm nay trở đi' } });
  });

  it('đổi email của độc giả đã có tài khoản → lỗi dưới ô email', () => {
    const result = classifySaveError({ message: 'EMAIL_KHONG_SUA_DUOC' });
    expect(result).toEqual({ type: 'field', errors: { email: READER_MESSAGES.emailLocked } });
  });

  it('độc giả đã bị xoá → gone', () => {
    expect(classifySaveError({ message: 'DA_XOA' })).toEqual({ type: 'gone' });
  });

  it('vi phạm CHECK → báo dữ liệu không hợp lệ, giữ form', () => {
    expect(classifySaveError({ code: '23514', message: 'check' })).toEqual({
      type: 'general',
      message: READER_MESSAGES.invalidData,
    });
  });

  it('RLS từ chối → không có quyền', () => {
    expect(classifySaveError({ code: '42501', message: 'denied' })).toEqual({
      type: 'general',
      message: MESSAGES.forbidden,
    });
  });

  it('lỗi mạng / server → báo chung', () => {
    expect(classifySaveError({ message: 'Failed to fetch' })).toEqual({ type: 'general', message: MESSAGES.network });
  });
});

describe('classifyDeleteError', () => {
  it('còn sách chưa trả → chặn, kèm số sách', () => {
    const result = classifyDeleteError({ message: 'CON_SACH', details: '{"so_sach": 2}' });
    expect(result).toEqual({ type: 'blocked', message: 'Không thể xoá: độc giả còn 2 sách chưa trả' });
  });

  it('còn sách nhưng thiếu detail → câu chung', () => {
    const result = classifyDeleteError({ message: 'CON_SACH', details: null });
    expect(result).toEqual({ type: 'blocked', message: 'Không thể xoá: độc giả còn sách chưa trả' });
  });

  it('còn phạt chưa thanh toán → chặn, kèm số tiền', () => {
    const result = classifyDeleteError({ message: 'CON_PHAT', details: '{"so_tien": 15000}' });
    expect(result).toEqual({
      type: 'blocked',
      message: 'Không thể xoá: độc giả còn 15.000 đ tiền phạt chưa thanh toán',
    });
  });

  it('còn phạt nhưng detail hỏng → câu chung', () => {
    const result = classifyDeleteError({ message: 'CON_PHAT', details: 'không phải JSON' });
    expect(result.message).toBe('Không thể xoá: độc giả còn tiền phạt chưa thanh toán');
  });

  it('đã bị xoá trước đó → gone (coi như thành công)', () => {
    expect(classifyDeleteError({ message: 'DOC_GIA_KHONG_TON_TAI' })).toEqual({ type: 'gone' });
  });

  it('không phải thủ thư → không có quyền', () => {
    expect(classifyDeleteError({ code: '42501', message: 'KHONG_CO_QUYEN' })).toEqual({
      type: 'general',
      message: MESSAGES.forbidden,
    });
  });

  it('lỗi mạng → báo chung', () => {
    expect(classifyDeleteError({ message: 'Failed to fetch' })).toEqual({ type: 'general', message: MESSAGES.network });
  });
});
