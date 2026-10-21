import { describe, expect, it } from 'vitest';
import { REASON, addDays, bookProblem, dueDate, readerReasons } from './rules.js';

const TODAY = '2026-10-21';

const ok = {
  trang_thai: 'hoat_dong',
  ngay_het_han: '2027-10-21',
  so_dang_muon: 0,
  so_qua_han: 0,
  tong_phat_chua_thanh_toan: 0,
};

const codes = (overrides) => readerReasons({ ...ok, ...overrides }, TODAY).map((r) => r.ma);

describe('addDays / dueDate', () => {
  it('hạn trả = ngày mượn + 14 ngày', () => {
    expect(dueDate('2026-10-21')).toBe('2026-11-04');
  });

  it('qua tháng, qua năm và năm nhuận', () => {
    expect(addDays('2026-12-25', 14)).toBe('2027-01-08');
    expect(addDays('2028-02-20', 14)).toBe('2028-03-05');
    expect(addDays('2027-02-20', 14)).toBe('2027-03-06');
  });
});

describe('readerReasons', () => {
  it('độc giả hợp lệ không có lý do nào', () => {
    expect(readerReasons(ok, TODAY)).toEqual([]);
  });

  it('thẻ bị khoá', () => {
    expect(codes({ trang_thai: 'bi_khoa' })).toEqual([REASON.locked]);
  });

  it('thẻ hết hạn hôm qua thì chặn, hết hạn đúng hôm nay thì vẫn mượn được', () => {
    expect(codes({ ngay_het_han: '2026-10-20' })).toEqual([REASON.expired]);
    expect(codes({ ngay_het_han: TODAY })).toEqual([]);
  });

  it('có sách quá hạn', () => {
    expect(readerReasons({ ...ok, so_qua_han: 2 }, TODAY)).toEqual([{ ma: REASON.overdue, so_sach: 2 }]);
  });

  it('còn tiền phạt chưa thanh toán', () => {
    expect(readerReasons({ ...ok, tong_phat_chua_thanh_toan: 15000 }, TODAY)).toEqual([
      { ma: REASON.fine, so_tien: 15000 },
    ]);
  });

  it('4 cuốn vẫn được mượn, 5 cuốn thì chặn', () => {
    expect(codes({ so_dang_muon: 4 })).toEqual([]);
    expect(codes({ so_dang_muon: 5 })).toEqual([REASON.maxLoans]);
  });

  it('thu thập tất cả lý do, không dừng ở lý do đầu', () => {
    expect(
      codes({
        trang_thai: 'bi_khoa',
        ngay_het_han: '2026-01-01',
        so_qua_han: 1,
        tong_phat_chua_thanh_toan: 5000,
        so_dang_muon: 5,
      }),
    ).toEqual([REASON.locked, REASON.expired, REASON.overdue, REASON.fine, REASON.maxLoans]);
  });
});

describe('bookProblem', () => {
  const book = { id: 'b1', so_con_lai: 1 };

  it('sách còn và chưa mượn → không vấn đề', () => {
    expect(bookProblem(book, ['b2'])).toBeNull();
  });

  it('hết sách', () => {
    expect(bookProblem({ ...book, so_con_lai: 0 }, [])).toBe('het_sach');
  });

  it('độc giả đang mượn cùng đầu sách', () => {
    expect(bookProblem(book, ['b1'])).toBe('dang_muon');
  });

  it('đang mượn đầu sách này được báo trước khi báo hết sách', () => {
    expect(bookProblem({ ...book, so_con_lai: 0 }, ['b1'])).toBe('dang_muon');
  });
});
