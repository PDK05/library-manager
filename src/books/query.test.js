import { describe, expect, it } from 'vitest';
import { PAGE_SIZE, buildSearchPattern, pageRange, stripDiacritics, totalPages } from './query.js';

describe('stripDiacritics', () => {
  it('bỏ dấu tiếng Việt kể cả đ / Đ', () => {
    expect(stripDiacritics('Nguyễn Du, Đắc Nhân Tâm')).toBe('Nguyen Du, Dac Nhan Tam');
  });
  it('chuẩn hoá cả dạng tổ hợp (NFD)', () => {
    expect(stripDiacritics('Nguyễn')).toBe('Nguyen');
  });
});

describe('buildSearchPattern', () => {
  it('từ khoá rỗng → null (hiện toàn bộ)', () => {
    expect(buildSearchPattern('')).toBeNull();
    expect(buildSearchPattern('   ')).toBeNull();
    expect(buildSearchPattern(undefined)).toBeNull();
  });
  it('không phân biệt hoa thường và dấu', () => {
    expect(buildSearchPattern('  Nguyễn DU ')).toBe('%nguyen du%');
    expect(buildSearchPattern('nguyen du')).toBe('%nguyen du%');
  });
  it('gộp khoảng trắng liên tiếp', () => {
    expect(buildSearchPattern('nguyen    du')).toBe('%nguyen du%');
  });
  it('escape % _ và \\ để tìm theo nghĩa đen', () => {
    expect(buildSearchPattern('100%')).toBe('%100\\%%');
    expect(buildSearchPattern('a_b')).toBe('%a\\_b%');
    expect(buildSearchPattern('a\\b')).toBe('%a\\\\b%');
  });
});

describe('pageRange', () => {
  it('trang 1 và trang 2 với 20 dòng/trang', () => {
    expect(PAGE_SIZE).toBe(20);
    expect(pageRange(1)).toEqual({ from: 0, to: 19 });
    expect(pageRange(2)).toEqual({ from: 20, to: 39 });
  });
});

describe('totalPages', () => {
  it.each([
    [0, 1],
    [1, 1],
    [20, 1],
    [21, 2],
    [40, 2],
    [41, 3],
  ])('%i dòng → %i trang', (count, pages) => {
    expect(totalPages(count)).toBe(pages);
  });
});
