import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../auth/errors.js';
import { alreadyReturnedMessage, classifyReturnError, lateNotice } from './errors.js';

describe('classifyReturnError', () => {
  it('phiếu đã trả kèm ngày trả', () => {
    const result = classifyReturnError({ message: 'DA_TRA', details: '{"ngay_tra" : "2026-11-02"}' });
    expect(result).toEqual({ type: 'already_returned', message: 'Phiếu này đã được trả ngày 02/11/2026' });
  });
  it('phiếu đã trả nhưng không có ngày', () => {
    expect(classifyReturnError({ message: 'DA_TRA', details: null }).message).toBe('Phiếu này đã được trả');
  });
  it('phiếu không tồn tại', () => {
    expect(classifyReturnError({ message: 'PHIEU_KHONG_TON_TAI' }).type).toBe('gone');
  });
  it('không đủ quyền', () => {
    expect(classifyReturnError({ code: '42501', message: 'KHONG_CO_QUYEN' })).toEqual({
      type: 'general',
      message: MESSAGES.forbidden,
    });
  });
  it('lỗi mạng / lỗi lạ', () => {
    expect(classifyReturnError({ message: 'Failed to fetch' })).toEqual({ type: 'general', message: MESSAGES.network });
  });
});

describe('thông báo', () => {
  it('trễ N ngày, phạt X đ', () => {
    expect(lateNotice(3, 15000)).toBe(`Trễ 3 ngày, phạt ${(15000).toLocaleString('vi-VN')} đ`);
  });
  it('đã trả không rõ ngày', () => {
    expect(alreadyReturnedMessage(null)).toBe('Phiếu này đã được trả');
  });
});
