import { describe, expect, it } from 'vitest';
import { FINE_PER_DAY, daysLate, fineFor } from './rules.js';

describe('daysLate', () => {
  it('trả đúng ngày hạn thì không trễ', () => {
    expect(daysLate('2026-11-04', '2026-11-04')).toBe(0);
  });
  it('trả trước hạn thì không trễ', () => {
    expect(daysLate('2026-11-01', '2026-11-04')).toBe(0);
  });
  it('trả sau hạn 1 ngày', () => {
    expect(daysLate('2026-11-05', '2026-11-04')).toBe(1);
  });
  it('đếm đúng khi qua tháng và qua năm', () => {
    expect(daysLate('2027-01-03', '2026-12-30')).toBe(4);
  });
  it('đếm đúng khi qua 29/02 năm nhuận', () => {
    expect(daysLate('2028-03-01', '2028-02-28')).toBe(2);
  });
});

describe('fineFor', () => {
  it('5.000 đ mỗi ngày trễ', () => {
    expect(FINE_PER_DAY).toBe(5000);
    expect(fineFor(1)).toBe(5000);
    expect(fineFor(3)).toBe(15000);
  });
  it('không trễ thì không phạt', () => {
    expect(fineFor(0)).toBe(0);
  });
});
