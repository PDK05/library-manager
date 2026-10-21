import { describe, expect, it } from 'vitest';
import { addOneYear, formatDate, isValidDate, todayInVietnam } from './date.js';

describe('todayInVietnam', () => {
  it('dùng múi giờ Asia/Ho_Chi_Minh (UTC+7), không phải UTC', () => {
    expect(todayInVietnam(new Date('2026-10-21T17:30:00Z'))).toBe('2026-10-22');
    expect(todayInVietnam(new Date('2026-10-21T16:59:00Z'))).toBe('2026-10-21');
  });
});

describe('isValidDate', () => {
  it('nhận ngày thật', () => {
    expect(isValidDate('2026-10-21')).toBe(true);
    expect(isValidDate('2028-02-29')).toBe(true);
  });

  it.each(['', null, undefined, '2026-02-30', '2027-02-29', '2026-13-01', '2026-00-10', '21/10/2026', '2026-1-1'])(
    'từ chối %s',
    (value) => {
      expect(isValidDate(value)).toBe(false);
    },
  );
});

describe('addOneYear', () => {
  it('cộng đúng một năm', () => {
    expect(addOneYear('2026-10-21')).toBe('2027-10-21');
  });

  it('29/02 năm nhuận → 28/02 năm sau, giống Postgres', () => {
    expect(addOneYear('2028-02-29')).toBe('2029-02-28');
  });

  it('29/02 sang năm nhuận kế tiếp vẫn giữ nguyên ngày', () => {
    expect(addOneYear('2027-02-28')).toBe('2028-02-28');
  });
});

describe('formatDate', () => {
  it('đổi sang DD/MM/YYYY', () => {
    expect(formatDate('2026-10-21')).toBe('21/10/2026');
  });

  it('giữ nguyên chuỗi không hợp lệ', () => {
    expect(formatDate('abc')).toBe('abc');
    expect(formatDate(null)).toBe('');
  });
});
