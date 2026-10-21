// Flow 7: trang độc giả — tra cứu sách, sách đang mượn, lịch sử và tiền phạt (chỉ xem)
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { listBooks } from '../books/api.js';
import { totalPages } from '../books/query.js';
import { formatDate } from '../lib/format.js';
import { HISTORY_PAGE_SIZE, getMyUnpaidTotal, listMyHistory, listMyLoans } from '../portal/api.js';
import { FINE_STATUS_LABEL, historyRow, loanStatus } from '../portal/rules.js';
import { formatMoney } from '../readers/errors.js';
import { alertBox, h, showAlert } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const TAB = { books: 'books', loans: 'loans', history: 'history' };
const SEARCH_DELAY_MS = 300;

const EMPTY = {
  books: 'Chưa có sách nào trong thư viện',
  noMatch: 'Không tìm thấy sách phù hợp',
  loans: 'Bạn không mượn sách nào',
  history: 'Chưa có lịch sử mượn',
};

function headRow(...labels) {
  return h('thead', {}, h('tr', {}, ...labels.map((label) => h('th', {}, label))));
}

export function renderReaderHome({ profile, warning }) {
  const state = { tab: TAB.books, term: '', booksPage: 1, historyPage: 1 };
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất
  let searchTimer = null;

  const banner = alertBox();
  if (warning) showAlert(banner, warning, 'warning');
  const listAlert = alertBox();

  const tabButtons = {
    [TAB.books]: h('button', { type: 'button', class: 'btn btn-sm' }, 'Tra cứu sách'),
    [TAB.loans]: h('button', { type: 'button', class: 'btn btn-sm' }, 'Sách đang mượn'),
    [TAB.history]: h('button', { type: 'button', class: 'btn btn-sm' }, 'Lịch sử & tiền phạt'),
  };
  const tabs = h('div', { class: 'menu' }, ...Object.values(tabButtons));

  const search = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder: 'Tìm theo tên sách, tác giả, thể loại',
    'aria-label': 'Tìm sách',
    autocomplete: 'off',
  });

  const booksBody = h('tbody');
  const booksTable = h(
    'table',
    { class: 'data-table', hidden: true },
    headRow('Tên sách', 'Tác giả', 'Thể loại', 'Năm', 'Còn lại'),
    booksBody,
  );
  const loansBody = h('tbody');
  const loansTable = h('table', { class: 'data-table', hidden: true }, headRow('Sách', 'Ngày mượn', 'Hạn trả', 'Tình trạng'), loansBody);
  const historyBody = h('tbody');
  const historyTable = h(
    'table',
    { class: 'data-table', hidden: true },
    headRow('Sách', 'Ngày mượn', 'Ngày trả', 'Trễ', 'Tiền phạt'),
    historyBody,
  );
  const unpaid = h('p', { class: 'unpaid-total', hidden: true });
  const emptyMessage = h('p', { class: 'muted empty-message', hidden: true });

  const prev = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Trước');
  const next = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Sau');
  const pageInfo = h('span', { class: 'muted', 'aria-live': 'polite' });
  const pager = h('div', { class: 'pager', hidden: true }, prev, pageInfo, next);

  const searchBox = h('div', {}, search);

  function showTab() {
    for (const [tab, button] of Object.entries(tabButtons)) {
      button.className = `btn btn-sm ${tab === state.tab ? 'btn-primary' : 'btn-secondary'}`;
    }
    searchBox.hidden = state.tab !== TAB.books;
    booksTable.hidden = true;
    loansTable.hidden = true;
    historyTable.hidden = true;
    unpaid.hidden = true;
    emptyMessage.hidden = true;
    pager.hidden = true;
  }

  function showEmpty(message) {
    emptyMessage.textContent = message;
    emptyMessage.hidden = false;
  }

  function showPager(page, count, size, unit) {
    const pages = totalPages(count, size);
    pager.hidden = count === 0;
    pageInfo.textContent = `Trang ${page}/${pages} · ${count} ${unit}`;
    prev.disabled = page <= 1;
    next.disabled = page >= pages;
    return pages;
  }

  function renderBooks({ rows, count }) {
    booksBody.replaceChildren(
      ...rows.map((book) =>
        h(
          'tr',
          {},
          h('td', { 'data-label': 'Tên sách' }, book.ten_sach),
          h('td', { 'data-label': 'Tác giả' }, book.tac_gia),
          h('td', { 'data-label': 'Thể loại' }, book.the_loai),
          h('td', { class: 'num', 'data-label': 'Năm' }, book.nam_xuat_ban == null ? '' : String(book.nam_xuat_ban)),
          h(
            'td',
            { class: book.so_con_lai > 0 ? 'num' : 'num sold-out', 'data-label': 'Còn lại' },
            book.so_con_lai > 0 ? String(book.so_con_lai) : 'Hết sách',
          ),
        ),
      ),
    );
    booksTable.hidden = rows.length === 0;
    if (rows.length === 0) showEmpty(state.term.trim() ? EMPTY.noMatch : EMPTY.books);
    showPager(state.booksPage, count, 20, 'sách');
  }

  function renderLoans(rows) {
    loansBody.replaceChildren(
      ...rows.map((loan) => {
        const status = loanStatus(loan);
        return h(
          'tr',
          { class: `loan-${status.kind}` },
          h('td', { 'data-label': 'Sách' }, loan.ten_sach),
          h('td', { 'data-label': 'Ngày mượn' }, formatDate(loan.ngay_muon)),
          h('td', { 'data-label': 'Hạn trả' }, formatDate(loan.han_tra)),
          h('td', { 'data-label': 'Tình trạng', class: `status status-${status.kind}` }, status.label),
        );
      }),
    );
    loansTable.hidden = rows.length === 0;
    if (rows.length === 0) showEmpty(EMPTY.loans);
  }

  function renderHistory({ rows, count }, total) {
    historyBody.replaceChildren(
      ...rows.map((loan) => {
        const row = historyRow(loan);
        const fineText = row.trangThaiPhat
          ? `${formatMoney(row.tienPhat)} (${FINE_STATUS_LABEL[row.trangThaiPhat]})`
          : '—';
        return h(
          'tr',
          {},
          h('td', { 'data-label': 'Sách' }, row.tenSach),
          h('td', { 'data-label': 'Ngày mượn' }, formatDate(row.ngayMuon)),
          h('td', { 'data-label': 'Ngày trả' }, formatDate(row.ngayTra)),
          h('td', { 'data-label': 'Trễ' }, row.soNgayTre > 0 ? `${row.soNgayTre} ngày` : '—'),
          h(
            'td',
            { 'data-label': 'Tiền phạt', class: row.trangThaiPhat === 'chua_thanh_toan' ? 'overdue' : null },
            fineText,
          ),
        );
      }),
    );
    historyTable.hidden = rows.length === 0;
    unpaid.textContent = `Tiền phạt chưa thanh toán: ${formatMoney(total)}`;
    unpaid.classList.toggle('has-debt', total > 0);
    unpaid.hidden = false;
    if (rows.length === 0) showEmpty(EMPTY.history);
    showPager(state.historyPage, count, HISTORY_PAGE_SIZE, 'phiếu');
  }

  async function fetchTab(tab) {
    if (tab === TAB.books) return listBooks({ page: state.booksPage, term: state.term });
    if (tab === TAB.loans) return listMyLoans();
    const [history, debt] = await Promise.all([listMyHistory({ page: state.historyPage }), getMyUnpaidTotal(profile.id)]);
    return { ...history, error: history.error ?? debt.error, total: debt.total };
  }

  async function load() {
    const id = ++requestId;
    const tab = state.tab;
    let result;
    try {
      result = await fetchTab(tab);
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

    // trang hiện tại hết dòng → lùi về trang cuối còn dữ liệu
    const pageKey = tab === TAB.books ? 'booksPage' : 'historyPage';
    if (tab !== TAB.loans && result.rows.length === 0 && state[pageKey] > 1) {
      state[pageKey] = totalPages(result.count, tab === TAB.books ? 20 : HISTORY_PAGE_SIZE);
      return load();
    }

    showTab();
    if (tab === TAB.books) renderBooks(result);
    else if (tab === TAB.loans) renderLoans(result.rows);
    else renderHistory(result, result.total);
  }

  function selectTab(tab) {
    state.tab = tab;
    requestId += 1; // bỏ kết quả của tab cũ
    showTab();
    load();
  }

  for (const [tab, button] of Object.entries(tabButtons)) button.addEventListener('click', () => selectTab(tab));

  search.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      state.term = search.value;
      state.booksPage = 1;
      load();
    }, SEARCH_DELAY_MS);
  });
  prev.addEventListener('click', () => {
    state[state.tab === TAB.books ? 'booksPage' : 'historyPage'] -= 1;
    load();
  });
  next.addEventListener('click', () => {
    state[state.tab === TAB.books ? 'booksPage' : 'historyPage'] += 1;
    load();
  });

  showTab();
  load();

  return appShell({
    title: 'Độc giả',
    userName: profile.ho_ten,
    children: [
      banner,
      h('h1', {}, `Xin chào, ${profile.ho_ten}`),
      h('p', { class: 'muted' }, `Mã thẻ: ${profile.ma_the}`),
      tabs,
      searchBox,
      listAlert,
      unpaid,
      h('div', { class: 'table-wrap' }, booksTable, loansTable, historyTable),
      emptyMessage,
      pager,
    ],
  });
}
