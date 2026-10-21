import { signOut } from '../auth/session.js';
import { alertBox, h, setBusy, showAlert } from './dom.js';

// Khung trang sau đăng nhập: thanh trên cùng với tên người dùng và nút Đăng xuất
export function appShell({ title, userName, children }) {
  const logout = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Đăng xuất');
  logout.addEventListener('click', async () => {
    setBusy(logout, true, 'Đang đăng xuất…');
    await signOut();
  });

  return h(
    'div',
    { class: 'shell' },
    h(
      'header',
      { class: 'topbar' },
      h('div', { class: 'topbar-brand' }, h('span', { class: 'brand' }, 'Thư viện'), h('span', { class: 'topbar-title' }, title)),
      h('div', { class: 'topbar-user' }, h('span', { class: 'user-name' }, userName), logout),
    ),
    h('main', { class: 'content' }, ...children),
  );
}

export function loadingView() {
  return h('main', { class: 'center-page' }, h('p', { class: 'muted', 'aria-live': 'polite' }, 'Đang tải…'));
}

export function retryView(message, onRetry) {
  const alert = alertBox();
  showAlert(alert, message);
  return h(
    'main',
    { class: 'center-page' },
    h('div', { class: 'card' }, alert, h('button', { type: 'button', class: 'btn btn-primary', onClick: onRetry }, 'Thử lại')),
  );
}
