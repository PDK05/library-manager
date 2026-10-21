// Trình bày phiếu mượn và lịch sử cho độc giả (Flow 7). Hàm thuần, không đụng DOM.
// Số ngày còn lại / trễ do server tính (v_phieu_dang_muon), không dùng giờ trình duyệt.
import { formatMoney } from '../readers/errors.js';

export const SOON_DAYS = 2; // còn ≤ 2 ngày thì cảnh báo "Sắp đến hạn"

export const FINE_STATUS_LABEL = {
  chua_thanh_toan: 'Chưa thanh toán',
  da_thanh_toan: 'Đã thanh toán',
};

// loan: { so_ngay_con_lai, so_ngay_tre, phat_du_kien } → { kind: 'overdue' | 'today' | 'soon' | 'ok', label }
export function loanStatus(loan) {
  if (loan.so_ngay_tre > 0) {
    return { kind: 'overdue', label: `Trễ ${loan.so_ngay_tre} ngày - phạt dự kiến ${formatMoney(loan.phat_du_kien)}` };
  }
  if (loan.so_ngay_con_lai === 0) return { kind: 'today', label: 'Hạn trả hôm nay' };
  if (loan.so_ngay_con_lai <= SOON_DAYS) {
    return { kind: 'soon', label: `Sắp đến hạn - còn ${loan.so_ngay_con_lai} ngày` };
  }
  return { kind: 'ok', label: `Còn ${loan.so_ngay_con_lai} ngày` };
}

// PostgREST trả quan hệ 1-1 là object, quan hệ 1-n là mảng; chấp nhận cả hai.
function firstOf(value) {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}

// loan: dòng phieu_muon đã trả kèm sach(ten_sach) và tien_phat(so_ngay_tre, so_tien, trang_thai)
// → dòng hiển thị; sách bị xoá mềm vẫn có tên (RLS cho đọc), thiếu thì để chuỗi rỗng.
export function historyRow(loan) {
  const fine = firstOf(loan.tien_phat);
  return {
    id: loan.id,
    tenSach: firstOf(loan.sach)?.ten_sach ?? '',
    ngayMuon: loan.ngay_muon,
    ngayTra: loan.ngay_tra,
    soNgayTre: fine?.so_ngay_tre ?? 0,
    tienPhat: fine?.so_tien ?? 0,
    trangThaiPhat: fine?.trang_thai ?? null,
  };
}
