// Kiểm tra form độc giả (Flow 3b). Hàm thuần, không đụng DOM.
import { isValidDate } from './date.js';

export const LIMITS = {
  name: 100,
  email: 254,
};

export const STATUS = {
  active: 'hoat_dong',
  locked: 'bi_khoa',
};

// Trùng với CHECK trong CSDL
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const PHONE_PATTERN = /^0[0-9]{9}$/;

export const EXPIRY_PAST_MESSAGE = 'Ngày hết hạn phải từ hôm nay trở đi';

export function normalizeName(value) {
  return String(value ?? '').trim().replace(/\s+/g, ' ');
}

export function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase();
}

export function normalizePhone(value) {
  return String(value ?? '').replace(/[\s.-]/g, '');
}

// raw: giá trị thô từ form. today: 'YYYY-MM-DD'. previousExpiry: ngày hết hạn hiện tại khi sửa
// (không đổi ngày thì không bắt phải từ hôm nay, giống trigger trong CSDL — thẻ đã hết hạn vẫn khoá / đổi tên được).
// values dùng tên cột CSDL và chỉ có nghĩa khi errors rỗng.
export function validateReader(raw, { today, previousExpiry = null }) {
  const errors = {};

  const name = normalizeName(raw.ho_ten);
  if (!name) errors.ho_ten = 'Vui lòng nhập họ tên';
  else if ([...name].length > LIMITS.name) errors.ho_ten = `Họ tên tối đa ${LIMITS.name} ký tự`;

  const email = normalizeEmail(raw.email);
  if (!email) errors.email = 'Vui lòng nhập email';
  else if (email.length > LIMITS.email || !EMAIL_PATTERN.test(email)) errors.email = 'Email không hợp lệ';

  const phone = normalizePhone(raw.so_dien_thoai);
  if (!phone) errors.so_dien_thoai = 'Vui lòng nhập số điện thoại';
  else if (!PHONE_PATTERN.test(phone)) errors.so_dien_thoai = 'Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 0';

  const expiry = String(raw.ngay_het_han ?? '').trim();
  if (!isValidDate(expiry)) errors.ngay_het_han = 'Vui lòng chọn ngày hết hạn';
  else if (expiry < today && expiry !== previousExpiry) errors.ngay_het_han = EXPIRY_PAST_MESSAGE;

  const status = raw.trang_thai === STATUS.locked ? STATUS.locked : STATUS.active;

  return {
    values: { ho_ten: name, email, so_dien_thoai: phone, ngay_het_han: expiry, trang_thai: status },
    errors,
  };
}
