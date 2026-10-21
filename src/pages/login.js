// Flow 1a: đăng nhập
import { loginErrorMessage } from '../auth/errors.js';
import { takeNotice } from '../auth/session.js';
import { validateLogin } from '../auth/validation.js';
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.js';
import { alertBox, field, h, setBusy, showAlert, showFieldErrors } from '../ui/dom.js';

export function renderLogin() {
  const alert = alertBox();
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Đăng nhập');
  const form = h(
    'form',
    { class: 'card', novalidate: true },
    h('h1', {}, 'Đăng nhập'),
    alert,
    field({ label: 'Email', name: 'email', type: 'email', autocomplete: 'username' }),
    field({ label: 'Mật khẩu', name: 'password', type: 'password', autocomplete: 'current-password' }),
    submit,
    h('p', { class: 'muted' }, 'Độc giả chưa có tài khoản? ', h('a', { href: '#/dang-ky' }, 'Đăng ký tài khoản độc giả')),
  );

  const notice = takeNotice();
  if (notice) showAlert(alert, notice, 'info');

  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const { email: emailInput, password: passwordInput } = form.elements;
    const { email, errors } = validateLogin({ email: emailInput.value, password: passwordInput.value });
    showFieldErrors(form, errors);
    showAlert(alert, '');
    if (Object.keys(errors).length > 0) return;

    busy = true;
    setBusy(submit, true, 'Đang đăng nhập…');
    const { error } = await supabase.auth
      .signInWithPassword({ email, password: passwordInput.value })
      .catch((thrown) => ({ error: thrown }));
    busy = false;
    setBusy(submit, false);

    if (error) {
      showAlert(alert, loginErrorMessage(error));
      if (error.code === 'invalid_credentials') {
        passwordInput.value = '';
        passwordInput.focus();
      }
      return;
    }
    navigate('#/');
  });

  return h('main', { class: 'auth-page' }, h('p', { class: 'auth-brand' }, 'Thư viện'), form);
}
