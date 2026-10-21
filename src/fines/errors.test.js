import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../auth/errors.js';
import { FINE_MESSAGES, classifyPayError, paidNotice } from './errors.js';

describe('classifyPayError', () => {
  it('đã được thu trước đó', () => {
    expect(classifyPayError({ message: 'DA_THU' })).toEqual({ type: 'already_paid', message: FINE_MESSAGES.alreadyPaid });
  });
  it('khoản phạt không tồn tại', () => {
    expect(classifyPayError({ message: 'PHAT_KHONG_TON_TAI' }).type).toBe('gone');
  });
  it('không đủ quyền', () => {
    expect(classifyPayError({ code: '42501', message: 'KHONG_CO_QUYEN' })).toEqual({ type: 'general', message: MESSAGES.forbidden });
  });
  it('lỗi mạng / lỗi lạ', () => {
    expect(classifyPayError({ message: 'Failed to fetch' })).toEqual({ type: 'general', message: MESSAGES.network });
  });
});

describe('paidNotice', () => {
  it('ghi nhận số tiền', () => {
    expect(paidNotice(15000)).toBe(`Đã ghi nhận thu ${(15000).toLocaleString('vi-VN')} đ`);
  });
});
