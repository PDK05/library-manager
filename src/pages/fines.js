// Flow 6: tab "Quá hạn" (6a) và tab "Tiền phạt" (6b, nút "Đã thu tiền")
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { PAGE_SIZE, listOverdue, listUnpaidFines, payFine } from '../fines/api.js';
import { FINE_MESSAGES, classifyPayError, paidNotice } from '../fines/errors.js';
import { groupFinesByReader } from '../fines/rules.js';
import { formatDate } from '../readers/date.js';
import { formatMoney } from '../readers/errors.js';
import { returnLoan } from '../returns/api.js';
import { classifyReturnError, lateNotice } from '../returns/errors.js';
import { alertBox, h, setBusy, showAlert } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const TAB = { overdue: 'overdue', fines: 'fines' };

function headRow(...labels) {
  return h('thead', {}, h('tr', {}, ...labels.map((label) => h('th', {}, label))));
}

export function renderFines({ profile }) {
  const state = { tab: TAB.overdue, page: 1, busy: false };
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất

  const notice = alertBox();
  const listAlert = alertBox();
  const tabOverdue = h('button', { type: 'button', class: 'btn btn-sm' }, 'Quá hạn');
  const tabFines = h('button', { type: 'button', class: 'btn btn-sm' }, 'Tiền phạt');
  const tabs = h('div', { class: 'menu' }, tabOverdue, tabFines);

  const overdueBody = h('tbody');
  const overdueTable = h(
    'table',
    { class: 'data-table', hidden: true },
    headRow('Độc giả', 'Điện thoại', 'Sách', 'Hạn trả', 'Số ngày trễ', 'Phạt dự kiến', ''),
    overdueBody,
  );
  const prev = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Trước');
  const next = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Sau');
  const pageInfo = h('span', { class: 'muted', 'aria-live': 'polite' });
  const pager = h('div', { class: 'pager', hidden: true }, prev, pageInfo, next);

  const finesBody = h('tbody');
  const finesTable = h(
    'table',
    { class: 'data-table', hidden: true },
    headRow('Độc giả', 'Sách', 'Số ngày trễ', 'Số tiền', 'Ngày phát sinh', ''),
    finesBody,
  );
  const emptyMessage = h('p', { class: 'muted empty-message', hidden: true });

  function showTab() {
    const overdue = state.tab === TAB.overdue;
    tabOverdue.className = `btn btn-sm ${overdue ? 'btn-primary' : 'btn-secondary'}`;
    tabFines.className = `btn btn-sm ${overdue ? 'btn-secondary' : 'btn-primary'}`;
    overdueTable.hidden = true;
    finesTable.hidden = true;
    pager.hidden = true;
    emptyMessage.hidden = true;
  }

  function renderOverdue(result) {
    overdueBody.replaceChildren(
      ...result.rows.map((loan) => {
        const accept = h('button', { type: 'button', class: 'btn btn-primary btn-sm' }, 'Nhận trả');
        accept.addEventListener('click', () => confirmReturn(loan, accept));
        return h(
          'tr',
          {},
          h('td', { 'data-label': 'Độc giả' }, `${loan.ho_ten} · ${loan.ma_the}`),
          h('td', { 'data-label': 'Điện thoại' }, loan.so_dien_thoai ?? ''),
          h('td', { 'data-label': 'Sách' }, loan.ten_sach),
          h('td', { 'data-label': 'Hạn trả' }, formatDate(loan.han_tra)),
          h('td', { 'data-label': 'Số ngày trễ', class: 'overdue' }, `${loan.so_ngay_tre} ngày`),
          h('td', { 'data-label': 'Phạt dự kiến' }, formatMoney(loan.phat_du_kien)),
          h('td', { class: 'row-actions' }, accept),
        );
      }),
    );
    const pages = Math.max(1, Math.ceil(result.count / PAGE_SIZE));
    overdueTable.hidden = result.rows.length === 0;
    emptyMessage.textContent = FINE_MESSAGES.emptyOverdue;
    emptyMessage.hidden = result.rows.length > 0;
    pager.hidden = result.count === 0;
    pageInfo.textContent = `Trang ${state.page}/${pages} · ${result.count} phiếu`;
    prev.disabled = state.page <= 1;
    next.disabled = state.page >= pages;
  }

  function renderFines(rows) {
    const groups = groupFinesByReader(rows);
    finesBody.replaceChildren(
      ...groups.flatMap((group) => [
        h(
          'tr',
          { class: 'group-row' },
          h('th', { colspan: 6, scope: 'colgroup' }, `${group.hoTen} · ${group.maThe} — tổng ${formatMoney(group.tong)}`),
        ),
        ...group.khoan.map((fine) => {
          const pay = h('button', { type: 'button', class: 'btn btn-primary btn-sm' }, 'Đã thu tiền');
          pay.addEventListener('click', () => confirmPay(fine, pay));
          return h(
            'tr',
            {},
            h('td', { 'data-label': 'Độc giả' }, fine.ho_ten),
            h('td', { 'data-label': 'Sách' }, fine.ten_sach),
            h('td', { 'data-label': 'Số ngày trễ' }, `${fine.so_ngay_tre} ngày`),
            h('td', { 'data-label': 'Số tiền' }, formatMoney(fine.so_tien)),
            h('td', { 'data-label': 'Ngày phát sinh' }, formatDate(fine.ngay_phat_sinh)),
            h('td', { class: 'row-actions' }, pay),
          );
        }),
      ]),
    );
    finesTable.hidden = rows.length === 0;
    emptyMessage.textContent = FINE_MESSAGES.emptyFines;
    emptyMessage.hidden = rows.length > 0;
  }

  async function load() {
    const id = ++requestId;
    const tab = state.tab;
    let result;
    try {
      result = tab === TAB.overdue ? await listOverdue({ page: state.page }) : await listUnpaidFines();
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
    showTab();
    if (tab === TAB.overdue) {
      // trang cuối vừa trống (nhận trả hết dòng) → lùi một trang
      if (result.rows.length === 0 && result.count > 0 && state.page > 1) {
        state.page -= 1;
        return load();
      }
      renderOverdue(result);
    } else {
      renderFines(result.rows);
    }
  }

  function switchTab(tab) {
    if (state.tab === tab) return;
    state.tab = tab;
    state.page = 1;
    showAlert(notice, '');
    showTab();
    load();
  }

  async function confirmReturn(loan, button) {
    if (state.busy) return;
    showAlert(notice, '');
    const question = `Nhận trả «${loan.ten_sach}» của «${loan.ho_ten}»?\n${lateNotice(loan.so_ngay_tre, loan.phat_du_kien)} (dự kiến)`;
    if (!window.confirm(question)) return;

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
      showAlert(notice, fine ? `Đã nhận trả. ${lateNotice(fine.so_ngay_tre, fine.so_tien)}` : 'Đã nhận trả', fine ? 'warning' : 'success');
      return load();
    }
    const failure = classifyReturnError(outcome.error);
    showAlert(notice, failure.message);
    if (failure.type !== 'general') load();
  }

  async function confirmPay(fine, button) {
    if (state.busy) return;
    showAlert(notice, '');
    if (!window.confirm(`Xác nhận đã thu ${formatMoney(fine.so_tien)} của «${fine.ho_ten}»?`)) return;

    state.busy = true;
    setBusy(button, true, 'Đang xử lý…');
    let outcome;
    try {
      outcome = await payFine(fine.id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    } finally {
      state.busy = false;
      setBusy(button, false);
    }

    if (!outcome.error) {
      showAlert(notice, paidNotice(fine.so_tien), 'success');
      return load();
    }
    const failure = classifyPayError(outcome.error);
    showAlert(notice, failure.message);
    if (failure.type !== 'general') load();
  }

  tabOverdue.addEventListener('click', () => switchTab(TAB.overdue));
  tabFines.addEventListener('click', () => switchTab(TAB.fines));
  prev.addEventListener('click', () => {
    state.page -= 1;
    load();
  });
  next.addEventListener('click', () => {
    state.page += 1;
    load();
  });

  showTab();
  load();

  return appShell({
    title: 'Quá hạn và tiền phạt',
    userName: profile.ho_ten,
    children: [
      h('p', {}, h('a', { href: '#/quan-tri' }, '← Trang quản trị')),
      h('h1', {}, 'Quá hạn và tiền phạt'),
      tabs,
      notice,
      h('section', { class: 'card card-wide' }, listAlert, h('div', { class: 'table-scroll' }, overdueTable, finesTable), emptyMessage, pager),
    ],
  });
}
