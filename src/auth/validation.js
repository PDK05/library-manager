// Kiểm tra form đăng nhập / đăng ký (Flow 1a, 1b). Hàm thuần, không đụng DOM.

// Trùng với CHECK email trong CSDL
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const MIN_PASSWORD_LENGTH = 8;

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

export function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

export function validateLogin({ email, password }) {
  const normalized = normalizeEmail(email);
  const errors = {};
  if (!isValidEmail(normalized)) errors.email = 'Vui lòng nhập email hợp lệ';
  if (!password) errors.password = 'Vui lòng nhập mật khẩu';
  return { email: normalized, errors };
}

export function validateSignup({ email, password, confirmPassword }) {
  const normalized = normalizeEmail(email);
  const errors = {};
  if (!isValidEmail(normalized)) errors.email = 'Vui lòng nhập email hợp lệ';
  if (String(password ?? '').length < MIN_PASSWORD_LENGTH) {
    errors.password = `Mật khẩu tối thiểu ${MIN_PASSWORD_LENGTH} ký tự`;
  }
  if (confirmPassword !== password) errors.confirmPassword = 'Mật khẩu nhập lại không khớp';
  return { email: normalized, errors };
}
