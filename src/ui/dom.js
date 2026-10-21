// Tạo phần tử DOM bằng textContent/thuộc tính, không dùng innerHTML với dữ liệu người dùng.
export function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value == null || value === false) continue;
    if (key.startsWith('on')) el.addEventListener(key.slice(2).toLowerCase(), value);
    else if (key === 'class') el.className = value;
    else el.setAttribute(key, value === true ? '' : value);
  }
  el.append(...children.flat().filter((child) => child != null && child !== false));
  return el;
}

// Ô nhập kèm chỗ hiện lỗi ngay bên dưới
export function field({ label, name, type = 'text', autocomplete }) {
  const id = `f-${name}`;
  return h(
    'div',
    { class: 'field' },
    h('label', { for: id }, label),
    h('input', { id, name, type, autocomplete, 'aria-describedby': `${id}-error` }),
    h('p', { id: `${id}-error`, class: 'field-error' }),
  );
}

export function showFieldErrors(form, errors) {
  let firstInvalid = null;
  for (const input of form.querySelectorAll('input[name]')) {
    const message = errors[input.name] ?? '';
    form.querySelector(`#f-${input.name}-error`).textContent = message;
    input.setAttribute('aria-invalid', message ? 'true' : 'false');
    if (message && !firstInvalid) firstInvalid = input;
  }
  firstInvalid?.focus();
}

export function alertBox() {
  return h('div', { class: 'alert', role: 'alert', hidden: true });
}

// kind: 'error' | 'info' | 'success' | 'warning'; message rỗng thì ẩn
export function showAlert(el, message, kind = 'error') {
  el.textContent = message ?? '';
  el.className = `alert alert-${kind}`;
  el.hidden = !message;
}

export function setBusy(button, busy, busyLabel) {
  if (busy) {
    button.dataset.label = button.textContent;
    button.textContent = busyLabel;
  } else if (button.dataset.label) {
    button.textContent = button.dataset.label;
  }
  button.disabled = busy;
}
