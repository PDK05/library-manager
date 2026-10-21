import { describe, expect, it } from 'vitest';
import { historyRow, loanStatus } from './rules.js';

describe('loanStatus', () => {
  it('quá hạn: ghi số ngày trễ và phạt dự kiến', () => {
    const status = loanStatus({ so_ngay_con_lai: -3, so_ngay_tre: 3, phat_du_kien: 15000 });
    expect(status.kind).toBe('overdue');
    expect(status.label).toBe(`Trễ 3 ngày - phạt dự kiến ${(15000).toLocaleString('vi-VN')} đ`);
  });

  it('hạn trả hôm nay: chưa tính trễ', () => {
    expect(loanStatus({ so_ngay_con_lai: 0, so_ngay_tre: 0, phat_du_kien: 0 })).toEqual({
      kind: 'today',
      label: 'Hạn trả hôm nay',
    });
  });

  it('còn 1 và 2 ngày: sắp đến hạn', () => {
    expect(loanStatus({ so_ngay_con_lai: 1, so_ngay_tre: 0, phat_du_kien: 0 }).kind).toBe('soon');
    expect(loanStatus({ so_ngay_con_lai: 2, so_ngay_tre: 0, phat_du_kien: 0 })).toEqual({
      kind: 'soon',
      label: 'Sắp đến hạn - còn 2 ngày',
    });
  });

  it('còn 3 ngày trở lên: bình thường', () => {
    expect(loanStatus({ so_ngay_con_lai: 3, so_ngay_tre: 0, phat_du_kien: 0 })).toEqual({
      kind: 'ok',
      label: 'Còn 3 ngày',
    });
    expect(loanStatus({ so_ngay_con_lai: 14, so_ngay_tre: 0, phat_du_kien: 0 }).kind).toBe('ok');
  });
});

describe('historyRow', () => {
  const base = { id: 'p1', ngay_muon: '2026-10-01', ngay_tra: '2026-10-10', sach: { ten_sach: 'Dế Mèn' } };

  it('trả đúng hạn: không trễ, không phạt', () => {
    expect(historyRow({ ...base, tien_phat: null })).toEqual({
      id: 'p1',
      tenSach: 'Dế Mèn',
      ngayMuon: '2026-10-01',
      ngayTra: '2026-10-10',
      soNgayTre: 0,
      tienPhat: 0,
      trangThaiPhat: null,
    });
  });

  it('có khoản phạt dạng object', () => {
    const row = historyRow({ ...base, tien_phat: { so_ngay_tre: 4, so_tien: 20000, trang_thai: 'chua_thanh_toan' } });
    expect(row.soNgayTre).toBe(4);
    expect(row.tienPhat).toBe(20000);
    expect(row.trangThaiPhat).toBe('chua_thanh_toan');
  });

  it('chấp nhận khoản phạt dạng mảng (rỗng hoặc một phần tử)', () => {
    expect(historyRow({ ...base, tien_phat: [] }).tienPhat).toBe(0);
    expect(historyRow({ ...base, tien_phat: [{ so_ngay_tre: 1, so_tien: 5000, trang_thai: 'da_thanh_toan' }] }).trangThaiPhat).toBe(
      'da_thanh_toan',
    );
  });

  it('thiếu thông tin sách thì tên rỗng', () => {
    expect(historyRow({ ...base, sach: null, tien_phat: null }).tenSach).toBe('');
  });
});
