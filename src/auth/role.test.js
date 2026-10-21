import { describe, expect, it, vi } from 'vitest';
import { ROLE, decideRole, loadRole, readerWarning } from './role.js';

const reader = (overrides = {}) => ({
  id: 'r1',
  ma_the: 'DG000001',
  ho_ten: 'Nguyễn Văn A',
  ngay_het_han: '2027-10-21',
  trang_thai_hien_thi: 'hoat_dong',
  ...overrides,
});

describe('readerWarning', () => {
  it('thẻ hoạt động → không cảnh báo', () => {
    expect(readerWarning(reader())).toBeNull();
  });

  it('thẻ bị khoá', () => {
    expect(readerWarning(reader({ trang_thai_hien_thi: 'bi_khoa' }))).toBe(
      'Thẻ của bạn đang bị khoá. Vui lòng liên hệ thủ thư.',
    );
  });

  it('thẻ hết hạn, hiện ngày dd/mm/yyyy', () => {
    expect(readerWarning(reader({ trang_thai_hien_thi: 'het_han', ngay_het_han: '2026-03-05' }))).toBe(
      'Thẻ của bạn đã hết hạn ngày 05/03/2026.',
    );
  });
});

describe('decideRole', () => {
  it('có hồ sơ thủ thư → thủ thư (ưu tiên hơn độc giả)', () => {
    expect(decideRole({ id: 't1' }, reader()).role).toBe(ROLE.librarian);
  });

  it('chỉ có hồ sơ độc giả → độc giả kèm cảnh báo', () => {
    const result = decideRole(null, reader({ trang_thai_hien_thi: 'bi_khoa' }));
    expect(result.role).toBe(ROLE.reader);
    expect(result.warning).toMatch(/bị khoá/);
  });

  it('không có hồ sơ → role null', () => {
    expect(decideRole(null, null)).toEqual({ role: null, profile: null, warning: null });
  });
});

// Client giả: from(table).select().eq().eq().maybeSingle() → kết quả theo bảng
function fakeClient(results) {
  return {
    from(table) {
      const query = {
        select: () => query,
        eq: () => query,
        maybeSingle: vi.fn(async () => results[table]),
      };
      return query;
    },
  };
}

describe('loadRole', () => {
  it('đọc thu_thu và v_doc_gia rồi quyết định vai trò', async () => {
    const client = fakeClient({
      thu_thu: { data: null, error: null },
      v_doc_gia: { data: reader(), error: null },
    });
    expect((await loadRole(client, 'u1')).role).toBe(ROLE.reader);
  });

  it('lỗi truy vấn → ném lỗi để giao diện hiện nút Thử lại', async () => {
    const error = { message: 'Failed to fetch' };
    const client = fakeClient({
      thu_thu: { data: null, error },
      v_doc_gia: { data: null, error: null },
    });
    await expect(loadRole(client, 'u1')).rejects.toBe(error);
  });
});
