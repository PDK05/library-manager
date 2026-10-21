// Đổi lỗi Supabase thành thông báo tiếng Việt (Flow 1a, 1b, 1c; README quyết định #9).

export const MESSAGES = {
  network: 'Không kết nối được máy chủ. Vui lòng thử lại.',
  invalidCredentials: 'Email hoặc mật khẩu không đúng',
  rateLimited: 'Bạn thử quá nhiều lần. Vui lòng đợi rồi thử lại.',
  emailNotConfirmed: 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.',
  notRegistered: 'Email chưa được đăng ký tại thư viện. Vui lòng liên hệ thủ thư.',
  alreadyRegistered: 'Email này đã có tài khoản. Vui lòng đăng nhập.',
  weakPassword: 'Mật khẩu chưa đủ mạnh. Vui lòng chọn mật khẩu khác.',
  confirmEmailSent: 'Đăng ký thành công. Vui lòng mở email để xác nhận rồi đăng nhập.',
  sessionExpired: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại. Dữ liệu chưa lưu trên form đã bị mất.',
  sessionEnded: 'Phiên đăng nhập đã kết thúc. Vui lòng đăng nhập lại.',
  accountInvalid: 'Tài khoản không còn hiệu lực. Vui lòng liên hệ thủ thư.',
  forbidden: 'Bạn không có quyền thực hiện thao tác này.',
};

function isRateLimited(error) {
  return error.status === 429 || String(error.code ?? '').startsWith('over_');
}

export function loginErrorMessage(error) {
  if (error.code === 'invalid_credentials') return MESSAGES.invalidCredentials;
  if (error.code === 'email_not_confirmed') return MESSAGES.emailNotConfirmed;
  if (isRateLimited(error)) return MESSAGES.rateLimited;
  return MESSAGES.network;
}

export function signupErrorMessage(error) {
  if (error.code === 'user_already_exists' || error.code === 'email_exists') {
    return MESSAGES.alreadyRegistered;
  }
  if (error.code === 'weak_password') return MESSAGES.weakPassword;
  if (isRateLimited(error)) return MESSAGES.rateLimited;
  // Trigger lien_ket_tai_khoan huỷ việc tạo user khi email không có hồ sơ;
  // Supabase Auth trả về lỗi chung "Database error saving new user".
  if (error.code === 'unexpected_failure' || /database error saving new user/i.test(error.message ?? '')) {
    return MESSAGES.notRegistered;
  }
  return MESSAGES.network;
}

// Kết quả signUp không có lỗi:
// - 'exists': email đã có tài khoản (khi bật xác nhận email, Supabase trả user giả với identities rỗng)
// - 'confirm-email': đã tạo tài khoản, chờ người dùng xác nhận email
// - 'signed-in': đã tạo tài khoản và có phiên
export function signupOutcome(data) {
  const identities = data?.user?.identities;
  if (Array.isArray(identities) && identities.length === 0) return 'exists';
  return data?.session ? 'signed-in' : 'confirm-email';
}

// Lỗi PostgREST do JWT hết hạn / không hợp lệ (Flow 1c)
export function isSessionError(error) {
  if (!error) return false;
  return error.code === 'PGRST301' || error.code === 'PGRST303' || error.status === 401;
}
