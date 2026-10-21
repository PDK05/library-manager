// Đăng xuất, hết phiên và đồng bộ giữa các tab (Flow 1c).
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.js';
import { MESSAGES, isSessionError } from './errors.js';

export class SessionExpiredError extends Error {}

const LOGIN = '#/dang-nhap';

// Thông báo hiện trên trang đăng nhập sau khi người dùng bị đưa về đó
let notice = null;
let signingOut = false;

export function takeNotice() {
  const message = notice;
  notice = null;
  return message;
}

// signOut trả lỗi (ví dụ mất mạng) thì Supabase giữ phiên; xoá thẳng khoá phiên để vẫn đăng xuất ở máy này.
function clearStoredSession() {
  try {
    for (const key of Object.keys(localStorage)) {
      if (/^sb-.+-auth-token/.test(key)) localStorage.removeItem(key);
    }
  } catch {
    // Không truy cập được storage: không còn gì để xoá
  }
}

export async function signOut(message = null) {
  notice = message;
  signingOut = true;
  try {
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) clearStoredSession();
  } catch {
    clearStoredSession();
  } finally {
    signingOut = false;
  }
  navigate(LOGIN);
}

// Chạy một thao tác Supabase; lỗi JWT hết hạn → làm mới token và thử lại một lần,
// vẫn lỗi thì đăng xuất và báo phiên hết hạn.
export async function withSession(run) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (!isSessionError(error)) throw error;
      if (attempt === 0 && !(await supabase.auth.refreshSession()).error) continue;
      await signOut(MESSAGES.sessionExpired);
      throw new SessionExpiredError();
    }
  }
}

// SIGNED_OUT không do tab này gây ra: đăng xuất ở tab khác hoặc làm mới token thất bại.
// SIGNED_IN khi đang ở trang khách (đăng nhập ở tab khác): chạy lại router để vào trang chủ.
export function watchAuth(isGuestPage) {
  supabase.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT' && !signingOut) {
      notice = MESSAGES.sessionEnded;
      setTimeout(() => navigate(LOGIN));
    } else if (event === 'SIGNED_IN' && isGuestPage()) {
      setTimeout(() => navigate('#/'));
    }
  });
}
