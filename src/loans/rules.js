// Điều kiện mượn sách (Flow 4b) và tính hạn trả. Hàm thuần, không đụng DOM.
// Client dùng để báo lỗi sớm; RPC lap_phieu_muon kiểm tra lại trong transaction và là nơi quyết định cuối cùng.

export const MAX_LOANS = 5;
export const LOAN_DAYS = 14;

// Mã lý do trùng với mã RPC lap_phieu_muon trả về trong error.details
export const REASON = {
  locked: 'THE_BI_KHOA',
  expired: 'THE_HET_HAN',
  overdue: 'CO_SACH_QUA_HAN',
  fine: 'CON_PHAT',
  maxLoans: 'DA_MUON_TOI_DA',
  sameTitle: 'DANG_MUON_DAU_SACH',
};

// 'YYYY-MM-DD' + n ngày (lịch dương, không phụ thuộc múi giờ máy)
export function addDays(text, days) {
  const [year, month, day] = text.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function dueDate(today) {
  return addDays(today, LOAN_DAYS);
}

// Thu thập TẤT CẢ lý do độc giả không được mượn. reader lấy từ view v_doc_gia.
export function readerReasons(reader, today) {
  const reasons = [];
  if (reader.trang_thai === 'bi_khoa') reasons.push({ ma: REASON.locked });
  if (reader.ngay_het_han < today) reasons.push({ ma: REASON.expired, ngay_het_han: reader.ngay_het_han });
  if (reader.so_qua_han > 0) reasons.push({ ma: REASON.overdue, so_sach: reader.so_qua_han });
  if (reader.tong_phat_chua_thanh_toan > 0) {
    reasons.push({ ma: REASON.fine, so_tien: reader.tong_phat_chua_thanh_toan });
  }
  if (reader.so_dang_muon >= MAX_LOANS) reasons.push({ ma: REASON.maxLoans, toi_da: MAX_LOANS });
  return reasons;
}

// Kiểm tra riêng cho đầu sách đã chọn: 'het_sach' | 'dang_muon' | null
export function bookProblem(book, borrowedBookIds) {
  if (borrowedBookIds.includes(book.id)) return 'dang_muon';
  if (book.so_con_lai <= 0) return 'het_sach';
  return null;
}
