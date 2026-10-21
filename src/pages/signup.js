// Flow 1b: độc giả đăng ký tài khoản bằng email thủ thư đã khai báo
import { MESSAGES, signupErrorMessage, signupOutcome } from '../auth/errors.js';
import { validateSignup } from '../auth/validation.js';
import { supabase } from '../lib/supabase.js';
import { navigate } from '../router.js';
import { alertBox, field, h, setBusy, showAlert, showFieldErrors } from '../ui/dom.js';

export function renderSignup() {
  const alert = alertBox();
  const submit = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Đăng ký');
  const form = h(
    'form',
    { class: 'card', novalidate: true },
    h('h1', {}, 'Đăng ký tài khoản độc giả'),
    h('p', { class: 'muted' }, 'Dùng đúng email bạn đã đăng ký với thủ thư khi làm thẻ.'),
    alert,
    field({ label: 'Email', name: 'email', type: 'email', autocomplete: 'username' }),
    field({ label: 'Mật khẩu (tối thiểu 8 ký tự)', name: 'password', type: 'password', autocomplete: 'new-password' }),
    field({ label: 'Nhập lại mật khẩu', name: 'confirmPassword', type: 'password', autocomplete: 'new-password' }),
    submit,
    h('p', { class: 'muted' }, 'Đã có tài khoản? ', h('a', { href: '#/dang-nhap' }, 'Đăng nhập')),
  );

  let busy = false;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;

    const { email: emailInput, password, confirmPassword } = form.elements;
    const { email, errors } = validateSignup({
      email: emailInput.value,
      password: password.value,
      confirmPassword: confirmPassword.value,
    });
    showFieldErrors(form, errors);
    showAlert(alert, '');
    if (Object.keys(errors).length > 0) return;

    busy = true;
    setBusy(submit, true, 'Đang đăng ký…');
    const { data, error } = await supabase.auth
      .signUp({ email, password: password.value })
      .catch((thrown) => ({ data: null, error: thrown }));
    busy = false;
    setBusy(submit, false);

    // Lỗi: giữ nguyên dữ liệu đã nhập
    if (error) {
      showAlert(alert, signupErrorMessage(error));
      return;
    }

    const outcome = signupOutcome(data);
    if (outcome === 'exists') {
      showAlert(alert, MESSAGES.alreadyRegistered);
    } else if (outcome === 'confirm-email') {
      form.reset();
      showAlert(alert, MESSAGES.confirmEmailSent, 'success');
    } else {
      navigate('#/');
    }
  });

  return h('main', { class: 'auth-page' }, h('p', { class: 'auth-brand' }, 'Thư viện'), form);
}
