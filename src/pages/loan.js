// Flow 4: lập phiếu mượn (chọn độc giả → kiểm tra điều kiện → chọn sách → lập phiếu)
import { MESSAGES } from '../auth/errors.js';
import { SessionExpiredError } from '../auth/session.js';
import { listBooks } from '../books/api.js';
import { createLoan, fetchToday, getBook, getReader, listActiveLoans } from '../loans/api.js';
import { LOAN_MESSAGES, classifyBorrowError, reasonMessage } from '../loans/errors.js';
import { MAX_LOANS, bookProblem, dueDate, readerReasons } from '../loans/rules.js';
import { listReaders } from '../readers/api.js';
import { formatDate } from '../readers/date.js';
import { formatMoney } from '../readers/errors.js';
import { alertBox, h, setBusy, showAlert } from '../ui/dom.js';
import { appShell } from '../ui/layout.js';

const SEARCH_DELAY_MS = 300;

const STATUS_LABEL = { hoat_dong: 'Hoạt động', bi_khoa: 'Bị khoá', het_han: 'Hết hạn' };

// Ô tìm kiếm + danh sách kết quả bấm để chọn.
// search(term) → { rows, error }; describe(row) → { title, detail, note }
function picker({ label, placeholder, search, describe, onPick }) {
  let requestId = 0; // chỉ hiện kết quả của truy vấn mới nhất
  let timer = null;
  let term = '';

  const input = h('input', {
    type: 'search',
    class: 'search-input',
    placeholder,
    'aria-label': label,
    autocomplete: 'off',
  });
  const alert = alertBox();
  const list = h('ul', { class: 'picker-list' });
  const empty = h('p', { class: 'muted', hidden: true }, 'Không tìm thấy kết quả phù hợp');

  async function refresh() {
    const id = ++requestId;
    let result;
    try {
      result = await search(term);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    if (id !== requestId) return;
    if (result.error) {
      showAlert(alert, MESSAGES.network); // giữ kết quả cũ
      return;
    }
    showAlert(alert, '');
    empty.hidden = result.rows.length > 0;
    list.replaceChildren(
      ...result.rows.map((row) => {
        const { title, detail, note } = describe(row);
        const item = h(
          'button',
          { type: 'button', class: 'picker-item' },
          h('span', { class: 'picker-title' }, title),
          h('span', { class: 'muted' }, detail),
          note ? h('span', { class: 'picker-note' }, note) : null,
        );
        item.addEventListener('click', () => onPick(row));
        return h('li', {}, item);
      }),
    );
  }

  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      term = input.value;
      refresh();
    }, SEARCH_DELAY_MS);
  });

  return { el: h('div', {}, input, alert, list, empty), refresh };
}

export function renderLoan({ profile }) {
  const state = { reader: null, loans: [], book: null, today: null, submitting: false };
  let readerRequest = 0; // chỉ nhận kết quả của lần tải độc giả mới nhất

  const notice = alertBox();

  // --- Bước 1: độc giả ---
  const readerPicker = picker({
    label: 'Tìm độc giả',
    placeholder: 'Tìm theo mã thẻ, họ tên, email, số điện thoại',
    search: (term) => listReaders({ page: 1, term }),
    describe: (reader) => ({
      title: `${reader.ho_ten} · ${reader.ma_the}`,
      detail: reader.so_dien_thoai,
      note: STATUS_LABEL[reader.trang_thai_hien_thi],
    }),
    onPick: (reader) => selectReader(reader.id),
  });
  const readerStep = h(
    'section',
    { class: 'card card-wide' },
    h('h2', { class: 'card-title' }, '1. Chọn độc giả'),
    readerPicker.el,
  );

  const summaryBody = h('div');
  const reasonsBox = alertBox();
  const changeReader = h('button', { type: 'button', class: 'btn btn-secondary btn-sm' }, 'Đổi độc giả');
  const summary = h(
    'section',
    { class: 'card card-wide', hidden: true },
    h('div', { class: 'card-head' }, h('h2', { class: 'card-title' }, 'Độc giả'), changeReader),
    summaryBody,
    reasonsBox,
  );

  // --- Bước 2: sách ---
  const bookAlert = alertBox();
  const borrowedIds = () => state.loans.map((loan) => loan.sach_id);
  const bookPicker = picker({
    label: 'Tìm sách',
    placeholder: 'Tìm theo tên sách, tác giả, thể loại, ISBN',
    search: (term) => listBooks({ page: 1, term }),
    describe: (book) => {
      const problem = bookProblem(book, borrowedIds());
      return {
        title: book.ten_sach,
        detail: `${book.tac_gia} · còn ${book.so_con_lai}/${book.so_luong}`,
        note: problem === 'dang_muon' ? 'Đang mượn' : problem === 'het_sach' ? 'Hết sách' : null,
      };
    },
    onPick: (book) => selectBook(book),
  });
  const bookStep = h(
    'section',
    { class: 'card card-wide', hidden: true },
    h('h2', { class: 'card-title' }, '2. Chọn sách'),
    bookAlert,
    bookPicker.el,
  );

  // --- Bước 3: xem trước và lập phiếu ---
  const previewBody = h('div');
  const submit = h('button', { type: 'button', class: 'btn btn-primary' }, 'Lập phiếu');
  const cancelBook = h('button', { type: 'button', class: 'btn btn-secondary' }, 'Chọn sách khác');
  const preview = h(
    'section',
    { class: 'card card-wide', hidden: true },
    h('h2', { class: 'card-title' }, '3. Xác nhận phiếu mượn'),
    previewBody,
    h('div', { class: 'form-actions' }, submit, cancelBook),
  );

  const eligible = () => state.reader != null && readerReasons(state.reader, state.today).length === 0;

  function summaryRow(label, value) {
    return h('div', {}, h('dt', {}, label), h('dd', {}, value));
  }

  function renderState() {
    const { reader } = state;
    readerStep.hidden = reader != null;
    summary.hidden = reader == null;
    bookStep.hidden = !eligible();
    preview.hidden = !(eligible() && state.book);
    if (!reader) return;

    summaryBody.replaceChildren(
      h(
        'dl',
        { class: 'summary-grid' },
        summaryRow('Họ tên', `${reader.ho_ten} · ${reader.ma_the}`),
        summaryRow('Thẻ', `${STATUS_LABEL[reader.trang_thai_hien_thi]} · hết hạn ${formatDate(reader.ngay_het_han)}`),
        summaryRow('Đang mượn', `${reader.so_dang_muon}/${MAX_LOANS} cuốn`),
        summaryRow('Quá hạn', `${reader.so_qua_han} cuốn`),
        summaryRow('Phạt chưa thu', formatMoney(reader.tong_phat_chua_thanh_toan)),
      ),
      state.loans.length
        ? h(
            'ul',
            { class: 'loan-list' },
            ...state.loans.map((loan) => h('li', {}, `${loan.sach?.ten_sach ?? ''} — hạn trả ${formatDate(loan.han_tra)}`)),
          )
        : [],
    );

    const reasons = readerReasons(reader, state.today);
    showAlert(reasonsBox, '');
    if (reasons.length > 0) {
      reasonsBox.className = 'alert alert-error';
      reasonsBox.hidden = false;
      reasonsBox.replaceChildren(
        h('strong', {}, 'Độc giả không được mượn sách:'),
        h('ul', { class: 'reason-list' }, ...reasons.map((reason) => h('li', {}, reasonMessage(reason)))),
      );
    }

    if (state.book) {
      previewBody.replaceChildren(
        h(
          'dl',
          { class: 'summary-grid' },
          summaryRow('Sách', state.book.ten_sach),
          summaryRow('Ngày mượn', formatDate(state.today)),
          summaryRow('Hạn trả', formatDate(dueDate(state.today))),
        ),
      );
    }
  }

  // Tải lại độc giả, phiếu đang mượn và ngày server. Trả 'ok' | 'gone' | 'error' | 'cancelled'.
  async function loadReader(id) {
    const request = ++readerRequest;
    let today;
    let readerResult;
    let loansResult;
    try {
      [today, readerResult, loansResult] = await Promise.all([fetchToday(), getReader(id), listActiveLoans(id)]);
    } catch (error) {
      if (error instanceof SessionExpiredError) return 'cancelled';
      throw error;
    }
    if (request !== readerRequest) return 'cancelled';
    if (readerResult.error || loansResult.error) return 'error';
    if (!readerResult.reader) return 'gone';
    state.reader = readerResult.reader;
    state.loans = loansResult.loans;
    state.today = today;
    return 'ok';
  }

  async function selectReader(id) {
    showAlert(notice, '');
    const outcome = await loadReader(id);
    if (outcome === 'cancelled') return;
    if (outcome === 'error') return showAlert(notice, MESSAGES.network);
    if (outcome === 'gone') {
      showAlert(notice, LOAN_MESSAGES.readerGone);
      return readerPicker.refresh();
    }
    state.book = null;
    renderState();
    if (eligible()) bookPicker.refresh();
  }

  async function selectBook(book) {
    showAlert(bookAlert, '');
    // Số còn lại trong danh sách có thể đã cũ: lấy lại dòng sách trước khi chọn
    let fresh;
    try {
      fresh = await getBook(book.id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    }
    if (fresh.error) return showAlert(bookAlert, MESSAGES.network);
    if (!fresh.book) {
      showAlert(bookAlert, LOAN_MESSAGES.bookGone);
      return bookPicker.refresh();
    }
    const problem = bookProblem(fresh.book, borrowedIds());
    if (problem) {
      showAlert(bookAlert, problem === 'dang_muon' ? LOAN_MESSAGES.alreadyBorrowed : LOAN_MESSAGES.outOfStock);
      return bookPicker.refresh();
    }
    state.book = fresh.book;
    renderState();
    showAlert(notice, '');
    preview.scrollIntoView({ block: 'nearest' });
  }

  function resetAll() {
    state.reader = null;
    state.loans = [];
    state.book = null;
    renderState();
    readerPicker.refresh();
  }

  // Sau khi trạng thái đổi: tải lại độc giả rồi vẽ lại; trả false nếu không tải được
  async function reloadAfterChange(readerId) {
    const outcome = await loadReader(readerId);
    if (outcome === 'gone') {
      showAlert(notice, LOAN_MESSAGES.readerGone);
      resetAll();
      return false;
    }
    renderState();
    if (eligible()) bookPicker.refresh();
    return outcome === 'ok';
  }

  submit.addEventListener('click', async () => {
    if (state.submitting || !state.reader || !state.book) return;
    state.submitting = true;
    setBusy(submit, true, 'Đang lập phiếu…');
    showAlert(notice, '');
    const readerId = state.reader.id;
    let result;
    try {
      result = await createLoan(readerId, state.book.id);
    } catch (error) {
      if (error instanceof SessionExpiredError) return;
      throw error;
    } finally {
      state.submitting = false;
      setBusy(submit, false);
    }

    if (!result.error) {
      state.book = null;
      if (await reloadAfterChange(readerId)) {
        showAlert(notice, `Đã lập phiếu. Hạn trả: ${formatDate(result.loan.han_tra)}`, 'success');
      }
      return;
    }

    const failure = classifyBorrowError(result.error);
    switch (failure.type) {
      case 'reasons':
        // Trạng thái đã đổi giữa lúc xem và lúc lập phiếu: hiện lý do cụ thể từ CSDL rồi tải lại độc giả
        state.book = null;
        if (await reloadAfterChange(readerId)) {
          showAlert(notice, failure.reasons.map(reasonMessage).join('. ') || 'Độc giả không đủ điều kiện mượn sách');
        }
        break;
      case 'out_of_stock':
        state.book = null;
        renderState();
        showAlert(notice, LOAN_MESSAGES.justOutOfStock);
        bookPicker.refresh();
        break;
      case 'book_gone':
        state.book = null;
        renderState();
        showAlert(notice, LOAN_MESSAGES.bookGone);
        bookPicker.refresh();
        break;
      case 'reader_gone':
        showAlert(notice, LOAN_MESSAGES.readerGone);
        resetAll();
        break;
      default:
        showAlert(notice, failure.message); // giữ lựa chọn, nút đã mở khoá
    }
  });

  cancelBook.addEventListener('click', () => {
    state.book = null;
    renderState();
  });
  changeReader.addEventListener('click', () => {
    showAlert(notice, '');
    resetAll();
  });

  readerPicker.refresh();
  renderState();

  return appShell({
    title: 'Lập phiếu mượn',
    userName: profile.ho_ten,
    children: [
      h('p', {}, h('a', { href: '#/quan-tri' }, '← Trang quản trị')),
      h('h1', {}, 'Lập phiếu mượn'),
      notice,
      readerStep,
      summary,
      bookStep,
      preview,
    ],
  });
}
