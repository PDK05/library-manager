import { describe, expect, it } from 'vitest';
import { groupFinesByReader } from './rules.js';

const fine = (id, readerId, name, amount) => ({ id, doc_gia_id: readerId, ho_ten: name, ma_the: `DG${readerId}`, so_tien: amount });

describe('groupFinesByReader', () => {
  it('danh sách rỗng', () => {
    expect(groupFinesByReader([])).toEqual([]);
  });
  it('cộng tổng mỗi độc giả và giữ thứ tự khoản', () => {
    const groups = groupFinesByReader([fine('a', 1, 'Nguyễn An', 5000), fine('b', 2, 'Bùi Bình', 10000), fine('c', 1, 'Nguyễn An', 15000)]);
    expect(groups.map((g) => [g.hoTen, g.tong])).toEqual([
      ['Bùi Bình', 10000],
      ['Nguyễn An', 20000],
    ]);
    expect(groups[1].khoan.map((k) => k.id)).toEqual(['a', 'c']);
  });
});
