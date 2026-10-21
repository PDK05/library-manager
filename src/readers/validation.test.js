import { describe, expect, it } from 'vitest';
import { normalizeEmail, normalizeName, normalizePhone, validateReader } from './validation.js';

const TODAY = '2026-10-21';

const valid = {
  ho_ten: 'Nguyễn Văn An',
  email: 'an@gmail.com',
  so_dien_thoai: '0901234567',
  ngay_het_han: '2027-10-21',
  trang_thai: 'hoat_dong',
};

const check = (overrides = {}, options = {}) => validateReader({ ...valid, ...overrides }, { today: TODAY, ...options });

describe('chuẩn hoá', () => {
  it('họ tên: trim và gộp khoảng trắng', () => {
    expect(normalizeName('  Nguyễn   Văn \t An ')).toBe('Nguyễn Văn An');
  });

  it('email: trim và chữ thường', () => {
    expect(normalizeEmail(' An@Gmail.COM ')).toBe('an@gmail.com');
  });

  it('số điện thoại: bỏ khoảng trắng, chấm, gạch ngang', () => {
    expect(normalizePhone('090 123.45-67')).toBe('0901234567');
  });
});

describe('validateReader', () => {
  it('dữ liệu hợp lệ không có lỗi và trả giá trị đã chuẩn hoá', () => {
    const { values, errors } = check({ ho_ten: '  Nguyễn  Văn An ', email: ' An@Gmail.COM ', so_dien_thoai: '090 123 4567' });
    expect(errors).toEqual({});
    expect(values).toEqual({
      ho_ten: 'Nguyễn Văn An',
      email: 'an@gmail.com',
      so_dien_thoai: '0901234567',
      ngay_het_han: '2027-10-21',
      trang_thai: 'hoat_dong',
    });
  });

  it('form rỗng báo lỗi cả bốn ô bắt buộc', () => {
    const { errors } = validateReader({}, { today: TODAY });
    expect(errors).toEqual({
      ho_ten: 'Vui lòng nhập họ tên',
      email: 'Vui lòng nhập email',
      so_dien_thoai: 'Vui lòng nhập số điện thoại',
      ngay_het_han: 'Vui lòng chọn ngày hết hạn',
    });
  });

  describe('họ tên', () => {
    it('chỉ có khoảng trắng coi như rỗng', () => {
      expect(check({ ho_ten: '   ' }).errors.ho_ten).toBe('Vui lòng nhập họ tên');
    });

    it('đúng 100 ký tự hợp lệ, 101 thì lỗi', () => {
      expect(check({ ho_ten: 'a'.repeat(100) }).errors.ho_ten).toBeUndefined();
      expect(check({ ho_ten: 'a'.repeat(101) }).errors.ho_ten).toBe('Họ tên tối đa 100 ký tự');
    });

    it('đếm theo ký tự, không theo đơn vị UTF-16', () => {
      expect(check({ ho_ten: '😀'.repeat(100) }).errors.ho_ten).toBeUndefined();
    });
  });

  describe('email', () => {
    it.each(['an', 'an@', '@gmail.com', 'an@gmail', 'an @gmail.com', 'a@b@c.com'])('từ chối %s', (email) => {
      expect(check({ email }).errors.email).toBe('Email không hợp lệ');
    });

    it('từ chối email dài hơn 254 ký tự', () => {
      expect(check({ email: `${'a'.repeat(250)}@b.co` }).errors.email).toBe('Email không hợp lệ');
    });
  });

  describe('số điện thoại', () => {
    it.each(['090123456', '09012345678', '1901234567', '+84901234567', '09012a4567'])('từ chối %s', (phone) => {
      expect(check({ so_dien_thoai: phone }).errors.so_dien_thoai).toBe(
        'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0',
      );
    });
  });

  describe('ngày hết hạn', () => {
    it('hôm nay hợp lệ, hôm qua thì lỗi', () => {
      expect(check({ ngay_het_han: TODAY }).errors.ngay_het_han).toBeUndefined();
      expect(check({ ngay_het_han: '2026-10-20' }).errors.ngay_het_han).toBe('Ngày hết hạn phải từ hôm nay trở đi');
    });

    it('ngày không có thật hoặc sai định dạng → yêu cầu chọn ngày', () => {
      expect(check({ ngay_het_han: '2027-02-30' }).errors.ngay_het_han).toBe('Vui lòng chọn ngày hết hạn');
      expect(check({ ngay_het_han: '' }).errors.ngay_het_han).toBe('Vui lòng chọn ngày hết hạn');
    });

    it('khi sửa, giữ nguyên ngày cũ đã qua vẫn hợp lệ (thẻ hết hạn vẫn khoá / đổi tên được)', () => {
      const result = check({ ngay_het_han: '2026-01-01' }, { previousExpiry: '2026-01-01' });
      expect(result.errors.ngay_het_han).toBeUndefined();
    });

    it('khi sửa, đổi sang ngày khác đã qua vẫn lỗi', () => {
      const result = check({ ngay_het_han: '2026-02-01' }, { previousExpiry: '2026-01-01' });
      expect(result.errors.ngay_het_han).toBe('Ngày hết hạn phải từ hôm nay trở đi');
    });
  });

  describe('trạng thái', () => {
    it('giữ bi_khoa', () => {
      expect(check({ trang_thai: 'bi_khoa' }).values.trang_thai).toBe('bi_khoa');
    });

    it('giá trị lạ hoặc thiếu rơi về hoat_dong', () => {
      expect(check({ trang_thai: 'het_han' }).values.trang_thai).toBe('hoat_dong');
      expect(check({ trang_thai: undefined }).values.trang_thai).toBe('hoat_dong');
    });
  });
});
