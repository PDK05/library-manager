// Flow 2: quản lý sách (thêm / sửa / xoá / tìm / phân trang)
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { createBook, deleteBook, listBooks, updateBook } from '../books/api.js';
import { BOOK_MESSAGES, classifyDeleteError, classifySaveError } from '../books/errors.js';
import { totalPages } from '../books/query.js';
import { validateBook } from '../books/validation.js';
import { alertBox, field, h, setBusy, showAlert, showFieldErrors } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const SEARCH_DELAY_MS = 300;

const EMPTY_LIST = 'Chưa có sách nào. Hãy thêm sách đầu tiên.';
const NO_MATCH = 'Không tìm thấy sách phù hợp';

export function renderBooks({ profile }) {
  const state = { page: 1, term: '', editing: null };
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất
  let saving = false;
  let searchTimer = null;

  const notice = alertBox();

  const submit = h('button', { type: 'submit', class: 'btn btn-primary' }, 'Thêm sách');
  const cancel = h('button', { type: 'button', class: 'btn btn-secondary', hidden: true }, 'Huỷ');
  const form = h(
    'form',
    { class: 'card card-wide book-form', novalidate: true },
    h('h2', { class: 'card-title' }, 'Thông tin sách'),
    h(
      'div',
      { class: 'form-grid' },
      field({ label: 'Tên sách', name: 'ten_sach' }),
      field({ label: 'Tác giả', name: 'tac_gia' }),
      field({ label: 'Thể loại', name: 'the_loai' }),
      field({ label: 'ISBN (không bắt buộc)', name: 'isbn' }),
      field({ label: 'Năm xuất bản (không bắt buộc)', name: 'nam_xuat_ban', inputmode: 'numeric' }),
      field({ label: 'Số lượng', name: 'so_luong', inputmode: 'numeric' }),
    ),
    h('div', { class: 'form-actions' }, submit, cancel),
  );

  const search = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'Tìm theo tên sách, tác giả, thể loại, ISBN',
    'aria-label': 'Tìm sách',
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
        h('th', {}, 'Tên sách'),
        h('th', {}, 'Tác giả'),
        h('th', {}, 'Thể loại'),
        h('th', { class: 'num' }, 'Số lượng'),
        h('th', { class: 'num' }, 'Còn lại'),
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

  function resetForm() {
    form.reset();
    state.editing = null;
    submit.textContent = 'Thêm sách';
    cancel.hidden = true;
    showFieldErrors(form, {});
    form.elements.ten_sach.focus();
  }

  function startEdit(book) {
    state.editing = book;
    for (const name of ['ten_sach', 'tac_gia', 'the_loai', 'isbn', 'nam_xuat_ban', 'so_luong']) {
      form.elements[name].value = book[name] ?? '';
    }
    submit.textContent = 'Lưu';
    cancel.hidden = false;
    showFieldErrors(form, {});
    showAlert(notice, '');
    form.scrollIntoView({ block: 'start' });
    form.elements.ten_sach.focus();
  }

  function renderRows(rows) {
    tbody.replaceChildren(
      ...rows.map((book) => {
        const edit = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Sửa');
        edit.addEventListener('click', () => startEdit(book));
        const remove = h('button', { type: 'button', class: 'btn btn-danger btn-sm' }, 'Xoá');
        remove.addEventListener('click', () => confirmDelete(book, remove));
        return h(
          'tr',
          {},
          h('td', { 'data-label': 'Tên sách' }, book.ten_sach),
          h('td', { 'data-label': 'Tác giả' }, book.tac_gia),
          h('td', { 'data-label': 'Thể loại' }, book.the_loai),
          h('td', { class: 'num', 'data-label': 'Số lượng' }, String(book.so_luong)),
          h('td', { class: 'num', 'data-label': 'Còn lại' }, String(book.so_con_lai)),
          h('td', { class: 'row-actions' }, edit, remove),
        );
      }),
    );
  }

  async function load() {
    const id = ++requestId;
    let result;
    try {
      result = await listBooks({ page: state.page, term: state.term });
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
    pageInfo.textContent = `Trang ${state.page}/${pages} · ${result.count} sách`;
    prev.disabled = state.page <= 1;
    next.disabled = state.page >= pages;
  }

  async function confirmDelete(book, button) {
    showAlert(notice, '');
    if (book.so_dang_muon > 0) {
      showAlert(notice, `Không thể xoá: còn ${book.so_dang_muon} cuốn đang được mượn`);
      return;
    }
    if (!window.confirm(`Xoá sách «${book.ten_sach}»?`)) return;

    setBusy(button, true, 'Đang xoá…');
    let result;
    try {
      result = await deleteBook(book.id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    setBusy(button, false);

    if (result.error) {
      const failure = classifyDeleteError(result.error);
      showAlert(notice, failure.message);
      if (failure.type === 'blocked') load(); // số đang mượn đã đổi: tải lại dòng
      return;
    }
    if (state.editing?.id === book.id) resetForm();
    showAlert(notice, 'Đã xoá sách', 'success');
    load();
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (saving) return;

    const { values, errors } = validateBook(Object.fromEntries(new FormData(form)), {
      currentYear: new Date().getFullYear(),
      minQuantity: state.editing?.so_dang_muon ?? 0,
    });
    showFieldErrors(form, errors);
    showAlert(notice, '');
    if (Object.keys(errors).length > 0) return;

    const editing = state.editing;
    saving = true;
    setBusy(submit, true, 'Đang lưu…');
    let result;
    try {
      result = editing ? await updateBook(editing.id, values) : await createBook(values);
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
        showAlert(notice, BOOK_MESSAGES.gone);
        resetForm();
        load();
      } else showAlert(notice, failure.message); // giữ dữ liệu trong form
      return;
    }
    if (result.gone) {
      showAlert(notice, BOOK_MESSAGES.gone);
      resetForm();
      load();
      return;
    }
    showAlert(notice, editing ? 'Đã lưu thay đổi' : 'Đã thêm sách', 'success');
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

  load();

  return appShell({
    title: 'Quản lý sách',
    userName: profile.ho_ten,
    children: [
      h('p', {}, h('a', { href: '#/quan-tri' }, '← Trang quản trị')),
      h('h1', {}, 'Quản lý sách'),
      notice,
      form,
      h('section', { class: 'book-list' }, search, listAlert, h('div', { class: 'table-scroll' }, table), emptyMessage, pager),
    ],
  });
}
