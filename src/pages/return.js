// Flow 5: nhận trả sách (tìm phiếu đang mượn → "Nhận trả" → xác nhận → RPC nhan_tra_sach)
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { formatDate } from '../readers/date.js';
import { listOpenLoans, returnLoan } from '../returns/api.js';
import { RETURN_MESSAGES, classifyReturnError, lateNotice } from '../returns/errors.js';
import { alertBox, h, setBusy, showAlert } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const SEARCH_DELAY_MS = 300;

export function renderReturn({ profile }) {
  const state = { term: '', busy: false };
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất
  let timer = null;

  const notice = alertBox();
  const listAlert = alertBox();
  const search = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'Tìm theo mã thẻ, họ tên độc giả hoặc tên sách',
    'aria-label': 'Tìm phiếu đang mượn',
    autocomplete: 'off',
  });
  const tbody = h('tbody');
  const table = h(
    'table',
    { class: 'data-table', hidden: true },
    h(
      'thead',
      {},
      h(
        'tr',
        {},
        h('th', {}, 'Độc giả'),
        h('th', {}, 'Sách'),
        h('th', {}, 'Ngày mượn'),
        h('th', {}, 'Hạn trả'),
        h('th', {}, 'Tình trạng'),
        h('th', {}, h('span', { class: 'visually-hidden' }, 'Thao tác')),
      ),
    ),
    tbody,
  );
  const emptyMessage = h('p', { class: 'muted empty-message', hidden: true }, RETURN_MESSAGES.empty);

  function renderRows(rows) {
    tbody.replaceChildren(
      ...rows.map((loan) => {
        const late = loan.so_ngay_tre > 0;
        const accept = h('button', { type: 'button', class: 'btn btn-primary btn-sm' }, 'Nhận trả');
        accept.addEventListener('click', () => confirmReturn(loan, accept));
        return h(
          'tr',
          {},
          h('td', { 'data-label': 'Độc giả' }, `${loan.ho_ten} · ${loan.ma_the}`),
          h('td', { 'data-label': 'Sách' }, loan.ten_sach),
          h('td', { 'data-label': 'Ngày mượn' }, formatDate(loan.ngay_muon)),
          h('td', { 'data-label': 'Hạn trả' }, formatDate(loan.han_tra)),
          h(
            'td',
            { 'data-label': 'Tình trạng', class: late ? 'overdue' : null },
            late ? lateNotice(loan.so_ngay_tre, loan.phat_du_kien) : 'Đúng hạn',
          ),
          h('td', { class: 'row-actions' }, accept),
        );
      }),
    );
    table.hidden = rows.length === 0;
    emptyMessage.hidden = rows.length > 0;
  }

  async function load() {
    const id = ++requestId;
    let result;
    try {
      result = await listOpenLoans({ term: state.term });
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    if (id !== requestId) return;
    if (result.error) {
      showAlert(listAlert, MESSAGES.network); // giữ danh sách cũ
      return;
    }
    showAlert(listAlert, '');
    renderRows(result.rows);
  }

  async function confirmReturn(loan, button) {
    if (state.busy) return;
    showAlert(notice, '');
    const late = loan.so_ngay_tre > 0;
    const question = `Nhận trả «${loan.ten_sach}» của «${loan.ho_ten}»?`;
    const extra = late ? `\n${lateNotice(loan.so_ngay_tre, loan.phat_du_kien)} (dự kiến)` : '';
    if (!window.confirm(question + extra)) return;

    state.busy = true;
    setBusy(button, true, 'Đang xử lý…');
    let outcome;
    try {
      outcome = await returnLoan(loan.phieu_muon_id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    } finally {
      state.busy = false;
      setBusy(button, false);
    }

    if (!outcome.error) {
      const fine = outcome.result?.tien_phat;
      showAlert(
        notice,
        fine ? `Đã nhận trả. ${lateNotice(fine.so_ngay_tre, fine.so_tien)}` : 'Đã nhận trả',
        fine ? 'warning' : 'success',
      );
      return load();
    }

    const failure = classifyReturnError(outcome.error);
    showAlert(notice, failure.message);
    if (failure.type !== 'general') load(); // phiếu đã đổi trạng thái: bỏ khỏi danh sách
  }

  search.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      state.term = search.value;
      load();
    }, SEARCH_DELAY_MS);
  });

  load();

  return appShell({
    title: 'Nhận trả sách',
    userName: profile.ho_ten,
    children: [
      h('p', {}, h('a', { href: '#/quan-tri' }, '← Trang quản trị')),
      h('h1', {}, 'Nhận trả sách'),
      notice,
      h('section', { class: 'card card-wide' }, search, listAlert, table, emptyMessage),
    ],
  });
}
