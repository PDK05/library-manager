// Gom khoản phạt chưa thu theo độc giả (Flow 6b). Hàm thuần để Vitest kiểm thử.
// fine: { id, so_tien, doc_gia_id, ho_ten, ma_the, ... }  → [{ docGiaId, hoTen, maThe, tong, khoan: [...] }]
// Nhóm sắp theo họ tên; khoản trong nhóm giữ thứ tự đầu vào.
export function groupFinesByReader(fines) {
  const groups = new Map();
  for (const fine of fines) {
    let group = groups.get(fine.doc_gia_id);
    if (!group) {
      group = { docGiaId: fine.doc_gia_id, hoTen: fine.ho_ten, maThe: fine.ma_the, tong: 0, khoan: [] };
      groups.set(fine.doc_gia_id, group);
    }
    group.tong += fine.so_tien;
    group.khoan.push(fine);
  }
  return [...groups.values()].sort((a, b) => a.hoTen.localeCompare(b.hoTen, 'vi'));
}
