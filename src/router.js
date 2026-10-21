// Router theo hash (#/dang-nhap, #/quan-tri…). Phân quyền nằm ở main.js.

let onRoute = null;

export function currentPath() {
  return location.hash.replace(/^#/, '') || '/';
}

export function startRouter(handler) {
  onRoute = handler;
  window.addEventListener('hashchange', () => onRoute(currentPath()));
  onRoute(currentPath());
}

// Đổi hash; nếu đang ở đúng hash đó thì chạy lại handler (hashchange không bắn).
export function navigate(hash) {
  if (location.hash === hash) onRoute?.(currentPath());
  else location.hash = hash;
}
