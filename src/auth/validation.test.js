import { describe, expect, it } from 'vitest';
import { normalizeEmail, validateLogin, validateSignup } from './validation.js';

describe('normalizeEmail', () => {
  it('bỏ khoảng trắng hai đầu và đổi chữ thường', () => {
    expect(normalizeEmail('  An.Nguyen@Gmail.COM ')).toBe('an.nguyen@gmail.com');
  });

  it('chấp nhận null / undefined', () => {
    expect(normalizeEmail(undefined)).toBe('');
    expect(normalizeEmail(null)).toBe('');
  });
});

describe('validateLogin', () => {
  it('hợp lệ: trả email đã chuẩn hoá, không có lỗi', () => {
    expect(validateLogin({ email: ' A@B.VN ', password: 'x' })).toEqual({ email: 'a@b.vn', errors: {} });
  });

  it.each(['', '   ', 'abc', 'a@b', 'a b@c.vn', '@b.vn'])('email "%s" không hợp lệ', (email) => {
    expect(validateLogin({ email, password: 'x' }).errors.email).toBe('Vui lòng nhập email hợp lệ');
  });

  it('mật khẩu rỗng', () => {
    expect(validateLogin({ email: 'a@b.vn', password: '' }).errors).toEqual({
      password: 'Vui lòng nhập mật khẩu',
    });
  });

  it('báo cả hai lỗi cùng lúc', () => {
    expect(Object.keys(validateLogin({ email: '', password: '' }).errors)).toEqual(['email', 'password']);
  });

  it('đăng nhập không áp dụng độ dài tối thiểu của mật khẩu', () => {
    expect(validateLogin({ email: 'a@b.vn', password: '123' }).errors).toEqual({});
  });
});

describe('validateSignup', () => {
  const valid = { email: 'dg@test.vn', password: '12345678', confirmPassword: '12345678' };

  it('hợp lệ', () => {
    expect(validateSignup(valid)).toEqual({ email: 'dg@test.vn', errors: {} });
  });

  it('mật khẩu 7 ký tự bị từ chối, 8 ký tự được chấp nhận', () => {
    expect(validateSignup({ ...valid, password: '1234567', confirmPassword: '1234567' }).errors).toEqual({
      password: 'Mật khẩu tối thiểu 8 ký tự',
    });
  });

  it('nhập lại không khớp', () => {
    expect(validateSignup({ ...valid, confirmPassword: '12345679' }).errors).toEqual({
      confirmPassword: 'Mật khẩu nhập lại không khớp',
    });
  });

  it('gom mọi lỗi', () => {
    expect(validateSignup({ email: 'x', password: '1', confirmPassword: '2' }).errors).toEqual({
      email: 'Vui lòng nhập email hợp lệ',
      password: 'Mật khẩu tối thiểu 8 ký tự',
      confirmPassword: 'Mật khẩu nhập lại không khớp',
    });
  });
});
