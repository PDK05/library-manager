// Flow 3: quản lý độc giả (thêm / sửa / xoá / tìm / phân trang)
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { totalPages } from '../books/query.js';
import { createReader, deleteReader, listReaders, updateReader } from '../readers/api.js';
import { addOneYear, formatDate, todayInVietnam } from '../readers/date.js';
import {
  READER_MESSAGES,
  booksBlockMessage,
  classifyDeleteError,
  classifySaveError,
  fineBlockMessage,
} from '../readers/errors.js';
import { STATUS, validateReader } from '../readers/validation.js';
import { alertBox, field, h, selectField, setBusy, showAlert, showFieldErrors } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const SEARCH_DELAY_MS = 300;

const EMPTY_LIST = 'Chưa có độc giả nào. Hãy thêm độc giả đầu tiên.';
const NO_MATCH = 'Không tìm thấy độc giả phù hợp';

const STATUS_LABEL = { hoat_dong: 'Hoạt động', bi_khoa: 'Bị khoá', het_han: 'Hết hạn' };

const FIELD_NAMES = ['ho_ten', 'email', 'so_dien_thoai', 'ngay_het_han', 'trang_thai'];

export function renderReaders({ profile }) {
  const state = { page: 1, term: '', editing: null };
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất
  let saving = false;
  let searchTimer = null;

  const notice = alertBox();

  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Thêm độc giả');
  const cancel = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Huỷ');
  const cardNumber = h('p', { class: 'muted', hidden: true });
  const form = h(
    'form',
    { class: 'card card-wide reader-form', novalidate: true },
    h('h2', { class: 'card-title' }, 'Thông tin độc giả'),
    cardNumber,
    h(
      'div',
      { class: 'form-grid' },
      field({ label: 'Họ tên', name: 'ho_ten', autocomplete: 'off' }),
      field({ label: 'Email', name: 'email', type: 'email', autocomplete: 'off' }),
      field({ label: 'Số điện thoại', name: 'so_dien_thoai', type: 'tel', autocomplete: 'off', inputmode: 'numeric' }),
      field({ label: 'Ngày hết hạn thẻ', name: 'ngay_het_han', type: 'date' }),
      selectField({
        label: 'Trạng thái',
        name: 'trang_thai',
        options: [
          { value: STATUS.active, label: STATUS_LABEL.hoat_dong },
          { value: STATUS.locked, label: STATUS_LABEL.bi_khoa },
        ],
      }),
    ),
    h('div', { class: 'form-actions' }, submit, cancel),
  );

  const search = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'Tìm theo mã thẻ, họ tên, email, số điện thoại',
    'aria-label': 'Tìm độc giả',
    autocomplete: 'off',
  });
  const listAlert = alertBox();
  const tbody = h('tbody');
  const table = h(
    'table',
    { class: 'data-table' },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', {}, 'Mã thẻ'),
        h('th', {}, 'Họ tên'),
        h('th', {}, 'Email'),
        h('th', {}, 'Số điện thoại'),
        h('th', {}, 'Hết hạn'),
        h('th', {}, 'Trạng thái'),
        h('th', {}, h('span', { class: 'visually-hidden' }, 'Thao tác')),
      ),
    ),
    tbody,
  );
  const emptyMessage = h('p', { class: 'muted empty-message', hidden: true });
  const prev = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Trước');
  const next = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Sau');
  const pageInfo = h('span', { class: 'muted', 'aria-live': 'polite' });
  const pager = h('div', { class: 'pager', hidden: true }, prev, pageInfo, next);

  // Ngày hết hạn mặc định = hôm nay + 1 năm (múi giờ Việt Nam); CSDL vẫn kiểm tra lại
  function defaultExpiry() {
    return addOneYear(todayInVietnam());
  }

  function resetForm() {
    form.reset();
    state.editing = null;
    form.elements.email.readOnly = false;
    form.elements.ngay_het_han.value = defaultExpiry();
    cardNumber.hidden = true;
    submit.textContent = 'Thêm độc giả';
    cancel.hidden = true;
    showFieldErrors(form, {});
    form.elements.ho_ten.focus();
  }

  function startEdit(reader) {
    state.editing = reader;
    for (const name of FIELD_NAMES) form.elements[name].value = reader[name] ?? '';
    // Độc giả đã có tài khoản: email gắn với tài khoản đăng nhập nên không sửa được
    form.elements.email.readOnly = reader.user_id != null;
    cardNumber.textContent =
      `Mã thẻ: ${reader.ma_the}` + (reader.user_id != null ? ' · Đã có tài khoản đăng nhập, không đổi được email' : '');
    cardNumber.hidden = false;
    submit.textContent = 'Lưu';
    cancel.hidden = false;
    showFieldErrors(form, {});
    showAlert(notice, '');
    form.scrollIntoView({ block: 'start' });
    form.elements.ho_ten.focus();
  }

  function renderRows(rows) {
    tbody.replaceChildren(
      ...rows.map((reader) => {
        const edit = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Sửa');
        edit.addEventListener('click', () => startEdit(reader));
        const remove = h('button', { type: 'button', class: 'btn btn-danger btn-sm' }, 'Xoá');
        remove.addEventListener('click', () => confirmDelete(reader, remove));
        return h(
          'tr',
          {},
          h('td', { 'data-label': 'Mã thẻ' }, reader.ma_the),
          h('td', { 'data-label': 'Họ tên' }, reader.ho_ten),
          h('td', { 'data-label': 'Email' }, reader.email),
          h('td', { 'data-label': 'Số điện thoại' }, reader.so_dien_thoai),
          h('td', { 'data-label': 'Hết hạn' }, formatDate(reader.ngay_het_han)),
          h(
            'td',
            { 'data-label': 'Trạng thái' },
            h(
              'span',
              { class: `badge badge-${reader.trang_thai_hien_thi}` },
              STATUS_LABEL[reader.trang_thai_hien_thi] ?? reader.trang_thai_hien_thi,
            ),
          ),
          h('td', { class: 'row-actions' }, edit, remove),
        );
      }),
    );
  }

  async function load() {
    const id = ++requestId;
    let result;
    try {
      result = await listReaders({ page: state.page, term: state.term });
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    if (id !== requestId) return;

    if (result.error) {
      showAlert(listAlert, MESSAGES.network); // giữ kết quả cũ
      return;
    }
    showAlert(listAlert, '');

    const pages = totalPages(result.count);
    // Trang hiện tại hết dòng (vừa xoá dòng cuối) → lùi về trang cuối còn dữ liệu
    if (result.rows.length === 0 && state.page > 1) {
      state.page = pages;
      return load();
    }

    renderRows(result.rows);
    table.hidden = result.rows.length === 0;
    emptyMessage.hidden = result.rows.length > 0;
    emptyMessage.textContent = state.term.trim() ? NO_MATCH : EMPTY_LIST;
    pager.hidden = result.count === 0;
    pageInfo.textContent = `Trang ${state.page}/${pages} · ${result.count} độc giả`;
    prev.disabled = state.page <= 1;
    next.disabled = state.page >= pages;
  }

  async function confirmDelete(reader, button) {
    showAlert(notice, '');
    // Chặn sớm theo dữ liệu đang hiện; RPC xoa_doc_gia kiểm tra lại trong transaction
    if (reader.so_dang_muon > 0) {
      showAlert(notice, booksBlockMessage(reader.so_dang_muon));
      return;
    }
    if (reader.tong_phat_chua_thanh_toan > 0) {
      showAlert(notice, fineBlockMessage(reader.tong_phat_chua_thanh_toan));
      return;
    }
    if (!window.confirm(`Xoá độc giả «${reader.ho_ten}» («${reader.ma_the}»)?`)) return;

    setBusy(button, true, 'Đang xoá…');
    let result;
    try {
      result = await deleteReader(reader.id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    setBusy(button, false);

    const failure = result.error ? classifyDeleteError(result.error) : null;
    if (failure && failure.type !== 'gone') {
      showAlert(notice, failure.message);
      if (failure.type === 'blocked') load(); // số sách / tiền phạt đã đổi: tải lại dòng
      return;
    }
    if (state.editing?.id === reader.id) resetForm();
    showAlert(notice, 'Đã xoá độc giả', 'success');
    load();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;

    const editing = state.editing;
    const { values, errors } = validateReader(Object.fromEntries(new FormData(form)), {
      today: todayInVietnam(),
      previousExpiry: editing?.ngay_het_han ?? null,
    });
    showFieldErrors(form, errors);
    showAlert(notice, '');
    if (Object.keys(errors).length > 0) return;

    saving = true;
    setBusy(submit, true, 'Đang lưu…');
    let result;
    try {
      result = editing ? await updateReader(editing.id, values) : await createReader(values);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    } finally {
      saving = false;
      setBusy(submit, false);
    }

    if (result.error) {
      const failure = classifySaveError(result.error);
      if (failure.type === 'field') showFieldErrors(form, failure.errors);
      else if (failure.type === 'gone') {
        showAlert(notice, READER_MESSAGES.gone);
        resetForm();
        load();
      } else showAlert(notice, failure.message); // giữ dữ liệu trong form
      return;
    }
    if (result.gone) {
      showAlert(notice, READER_MESSAGES.gone);
      resetForm();
      load();
      return;
    }
    showAlert(
      notice,
      editing ? 'Đã lưu thay đổi' : `Đã thêm độc giả${result.maThe ? `, mã thẻ ${result.maThe}` : ''}`,
      'success',
    );
    resetForm();
    load();
  });

  cancel.addEventListener('click', () => {
    showAlert(notice, '');
    resetForm();
  });

  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.term = search.value;
      state.page = 1;
      load();
    }, SEARCH_DELAY_MS);
  });

  prev.addEventListener('click', () => {
    state.page -= 1;
    load();
  });
  next.addEventListener('click', () => {
    state.page += 1;
    load();
  });

  form.elements.ngay_het_han.value = defaultExpiry();
  load();

  return appShell({
    title: 'Quản lý độc giả',
    userName: profile.ho_ten,
    children: [
      h('p', {}, h('a', { href: '#/quan-tri' }, '← Trang quản trị')),
      h('h1', {}, 'Quản lý độc giả'),
      notice,
      form,
      h('section', { class: 'reader-list' }, search, listAlert, h('div', { class: 'table-scroll' }, table), emptyMessage, pager),
    ],
  });
}
