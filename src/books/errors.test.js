import { describe, expect, it } from 'vitest';
import { MESSAGES } from '../auth/errors.js';
import { BOOK_MESSAGES, classifyDeleteError, classifySaveError } from './errors.js';

const triggerError = (message, soDangMuon) => ({
  code: 'P0001',
  message,
  details: soDangMuon == null ? null : JSON.stringify({ so_dang_muon: soDangMuon }),
});

describe('classifySaveError', () => {
  it('trùng ISBN (unique violation) → lỗi dưới ô ISBN', () => {
    expect(classifySaveError({ code: '23505', message: 'duplicate key value' })).toEqual({
      type: 'field',
      errors: { isbn: 'ISBN đã tồn tại' },
    });
  });

  it('số lượng nhỏ hơn số đang mượn → lỗi dưới ô Số lượng, nêu số cuốn', () => {
    expect(classifySaveError(triggerError('SO_LUONG_NHO_HON_DANG_MUON', 4))).toEqual({
      type: 'field',
      errors: { so_luong: 'Đang có 4 cuốn được mượn, số lượng không được nhỏ hơn 4' },
    });
  });

  it('thiếu details vẫn có thông báo', () => {
    const result = classifySaveError(triggerError('SO_LUONG_NHO_HON_DANG_MUON'));
    expect(result.errors.so_luong).toBe('Số lượng nhỏ hơn số cuốn đang được mượn');
  });

  it('năm xuất bản vượt năm hiện tại theo giờ server', () => {
    expect(classifySaveError(triggerError('NAM_XUAT_BAN_KHONG_HOP_LE')).errors).toEqual({
      nam_xuat_ban: 'Năm xuất bản từ 1000 đến năm hiện tại',
    });
  });

  it('sách đã bị xoá → gone', () => {
    expect(classifySaveError(triggerError('DA_XOA'))).toEqual({ type: 'gone' });
  });

  it('vi phạm CHECK → báo dữ liệu không hợp lệ, không phải lỗi mạng', () => {
    expect(classifySaveError({ code: '23514' })).toEqual({ type: 'general', message: BOOK_MESSAGES.invalidData });
  });

  it('RLS từ chối → không có quyền', () => {
    expect(classifySaveError({ code: '42501' })).toEqual({ type: 'general', message: MESSAGES.forbidden });
  });

  it('lỗi mạng / không rõ → lỗi kết nối chung', () => {
    expect(classifySaveError({ message: 'TypeError: Failed to fetch' })).toEqual({
      type: 'general',
      message: MESSAGES.network,
    });
  });
});

describe('classifyDeleteError', () => {
  it('còn sách đang mượn → blocked, nêu số cuốn', () => {
    expect(classifyDeleteError(triggerError('CON_SACH_DANG_MUON', 2))).toEqual({
      type: 'blocked',
      message: 'Không thể xoá: còn 2 cuốn đang được mượn',
    });
  });

  it('thiếu details → thông báo chung', () => {
    expect(classifyDeleteError(triggerError('CON_SACH_DANG_MUON'))).toEqual({
      type: 'blocked',
      message: BOOK_MESSAGES.borrowedBlock,
    });
  });

  it('RLS từ chối và lỗi mạng', () => {
    expect(classifyDeleteError({ code: '42501' }).message).toBe(MESSAGES.forbidden);
    expect(classifyDeleteError({ message: 'Failed to fetch' })).toEqual({
      type: 'general',
      message: MESSAGES.network,
    });
  });
});
