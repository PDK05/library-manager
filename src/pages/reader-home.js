// Trang độc giả (F7 sẽ bổ sung tra cứu sách, sách đang mượn, lịch sử và tiền phạt).
import { alertBox, h, showAlert } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

export function renderReaderHome({ profile, warning }) {
  const banner = alertBox();
  if (warning) showAlert(banner, warning, 'warning');

  return appShell({
    title: 'Độc giả',
    userName: profile.ho_ten,
    children: [
      banner,
      h('h1', {}, `Xin chào, ${profile.ho_ten}`),
      h('p', { class: 'muted' }, `Mã thẻ: ${profile.ma_the}`),
    ],
  });
}
