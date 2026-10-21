// Trang quản trị của thủ thư. Các chức năng F2–F6 sẽ gắn vào đây.
import { h } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

export function renderLibrarianHome({ profile }) {
  return appShell({
    title: 'Quản trị',
    userName: profile.ho_ten,
    children: [
      h('h1', {}, `Xin chào, ${profile.ho_ten}`),
      h('p', { class: 'muted' }, 'Bạn đang đăng nhập với vai trò thủ thư.'),
    ],
  });
}
