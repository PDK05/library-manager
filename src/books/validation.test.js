import { describe, expect, it } from 'vitest';
import { normalizeIsbn, validateBook } from './validation.js';

const YEAR = 2026;
const valid = {
  ten_sach: 'Truyện Kiều',
  tac_gia: 'Nguyễn Du',
  the_loai: 'Thơ',
  isbn: '',
  nam_xuat_ban: '',
  so_luong: '3',
};
const check = (overrides = {}, options = {}) => validateBook({ ...valid, ...overrides }, { currentYear: YEAR, ...options });

describe('normalizeIsbn', () => {
  it('bỏ dấu gạch ngang, khoảng trắng và viết hoa X', () => {
    expect(normalizeIsbn(' 978-604-1-23456-7 ')).toBe('9786041234567');
    expect(normalizeIsbn('0-306-40615-x')).toBe('030640615X');
  });
  it('chấp nhận null / undefined', () => {
    expect(normalizeIsbn(undefined)).toBe('');
  });
});

describe('validateBook', () => {
  it('hợp lệ: chỉ bắt buộc tên, tác giả, thể loại, số lượng', () => {
    expect(check()).toEqual({
      values: {
        ten_sach: 'Truyện Kiều',
        tac_gia: 'Nguyễn Du',
        the_loai: 'Thơ',
        isbn: null,
        nam_xuat_ban: null,
        so_luong: 3,
      },
      errors: {},
    });
  });

  it('bỏ khoảng trắng hai đầu của tên, tác giả, thể loại', () => {
    const { values } = check({ ten_sach: '  A  ', tac_gia: ' B ', the_loai: ' C ' });
    expect([values.ten_sach, values.tac_gia, values.the_loai]).toEqual(['A', 'B', 'C']);
  });

  it('báo lỗi trường bắt buộc để trống (kể cả chỉ có khoảng trắng)', () => {
    expect(check({ ten_sach: '   ', tac_gia: '', the_loai: ' ', so_luong: '' }).errors).toEqual({
      ten_sach: 'Vui lòng nhập tên sách',
      tac_gia: 'Vui lòng nhập tác giả',
      the_loai: 'Vui lòng nhập thể loại',
      so_luong: 'Vui lòng nhập số lượng',
    });
  });

  it('giới hạn độ dài: 200 / 100 / 50 ký tự là vừa đủ, thêm 1 thì lỗi', () => {
    expect(check({ ten_sach: 'a'.repeat(200), tac_gia: 'a'.repeat(100), the_loai: 'a'.repeat(50) }).errors).toEqual({});
    expect(check({ ten_sach: 'a'.repeat(201), tac_gia: 'a'.repeat(101), the_loai: 'a'.repeat(51) }).errors).toEqual({
      ten_sach: 'Tên sách tối đa 200 ký tự',
      tac_gia: 'Tác giả tối đa 100 ký tự',
      the_loai: 'Thể loại tối đa 50 ký tự',
    });
  });

  describe('ISBN', () => {
    it.each(['9786041234567', '978-604-1-23456-7', '0306406152', '030640615X', '0-306-40615-x'])(
      '"%s" hợp lệ',
      (isbn) => {
        expect(check({ isbn }).errors).toEqual({});
      },
    );

    it('lưu ISBN đã bỏ dấu gạch', () => {
      expect(check({ isbn: '978-604-1-23456-7' }).values.isbn).toBe('9786041234567');
    });

    it.each(['123', '12345678901', 'abcdefghij', '97860412345678', '03064061X2'])('"%s" không hợp lệ', (isbn) => {
      expect(check({ isbn }).errors.isbn).toBe('ISBN phải gồm 10 hoặc 13 chữ số');
    });

    it('chỉ gạch ngang / khoảng trắng coi như để trống', () => {
      expect(check({ isbn: ' - ' }).values.isbn).toBeNull();
    });
  });

  describe('năm xuất bản', () => {
    it('để trống là null', () => {
      expect(check({ nam_xuat_ban: '  ' }).values.nam_xuat_ban).toBeNull();
    });
    it.each(['1000', '2000', '2026'])('%s hợp lệ', (year) => {
      expect(check({ nam_xuat_ban: year }).values.nam_xuat_ban).toBe(Number(year));
    });
    it.each(['999', '2027', '0', '-5'])('%s ngoài khoảng', (year) => {
      expect(check({ nam_xuat_ban: year }).errors.nam_xuat_ban).toBe('Năm xuất bản từ 1000 đến năm hiện tại');
    });
    it.each(['abc', '2000.5', '20e3'])('%s không phải số nguyên', (year) => {
      expect(check({ nam_xuat_ban: year }).errors.nam_xuat_ban).toBe('Năm xuất bản phải là số nguyên');
    });
  });

  describe('số lượng', () => {
    it.each(['1', '1000'])('%s hợp lệ', (quantity) => {
      expect(check({ so_luong: quantity }).values.so_luong).toBe(Number(quantity));
    });
    it.each(['0', '1001', '-1'])('%s ngoài khoảng', (quantity) => {
      expect(check({ so_luong: quantity }).errors.so_luong).toBe('Số lượng từ 1 đến 1000');
    });
    it.each(['2.5', 'abc', '1e2'])('%s không phải số nguyên', (quantity) => {
      expect(check({ so_luong: quantity }).errors.so_luong).toBe('Số lượng phải là số nguyên');
    });

    it('khi sửa: không nhỏ hơn số cuốn đang cho mượn', () => {
      expect(check({ so_luong: '2' }, { minQuantity: 3 }).errors.so_luong).toBe(
        'Đang có 3 cuốn được mượn, số lượng không được nhỏ hơn 3',
      );
      expect(check({ so_luong: '3' }, { minQuantity: 3 }).errors).toEqual({});
    });
  });

  it('gom mọi lỗi cùng lúc', () => {
    const { errors } = check({ ten_sach: '', isbn: '1', nam_xuat_ban: 'x', so_luong: '0' });
    expect(Object.keys(errors)).toEqual(['ten_sach', 'isbn', 'nam_xuat_ban', 'so_luong']);
  });
});
