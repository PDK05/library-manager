import './style.css';
import { MESSAGES } from './auth/errors.js';
import { HOME, ROLE, loadRole } from './auth/role.js';
import { SessionExpiredError, signOut, watchAuth, withSession } from './auth/session.js';
import { supabase } from './lib/supabase.js';
import { renderBooks } from './pages/books.js';
import { renderLibrarianHome } from './pages/librarian-home.js';
import { renderFines } from './pages/fines.js';
import { renderLoan } from './pages/loan.js';
import { renderReturn } from './pages/return.js';
import { renderLogin } from './pages/login.js';
import { renderReaders } from './pages/readers.js';
import { renderReaderHome } from './pages/reader-home.js';
import { renderSignup } from './pages/signup.js';
import { currentPath, navigate, startRouter } from './router.js';
import { loadingView, retryView } from './ui/layout.js';

const GUEST = 'guest';

const routes = {
  '/dang-nhap': { access: GUEST, render: renderLogin },
  '/dang-ky': { access: GUEST, render: renderSignup },
  '/quan-tri': { access: ROLE.librarian, render: renderLibrarianHome },
  '/quan-tri/sach': { access: ROLE.librarian, render: renderBooks },
  '/quan-tri/doc-gia': { access: ROLE.librarian, render: renderReaders },
  '/quan-tri/muon-sach': { access: ROLE.librarian, render: renderLoan },
  '/quan-tri/tra-sach': { access: ROLE.librarian, render: renderReturn },
  '/quan-tri/phat': { access: ROLE.librarian, render: renderFines },
  '/doc-gia': { access: ROLE.reader, render: renderReaderHome },
};

const app = document.querySelector('#app');
const mount = (view) => app.replaceChildren(view);

// Mỗi lần đổi trang tăng số này; kết quả bất đồng bộ của lần cũ bị bỏ qua
let renderId = 0;

async function handleRoute(path) {
  const id = ++renderId;
  const route = routes[path];
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (id !== renderId) return;

  if (!session) {
    if (route?.access !== GUEST) return navigate('#/dang-nhap');
    return mount(route.render());
  }

  // Đọc lại hồ sơ mỗi lần đổi trang: độc giả bị xoá trong lúc đăng nhập sẽ bị đăng xuất (Flow 1d)
  mount(loadingView());
  let info;
  try {
    info = await withSession(() => loadRole(supabase, session.user.id));
  } catch (error) {
    if (id !== renderId || error instanceof SessionExpiredError) return;
    return mount(retryView(MESSAGES.network, () => handleRoute(path)));
  }
  if (id !== renderId) return;

  if (!info.role) return signOut(MESSAGES.accountInvalid);
  // Trang khách, trang của vai trò khác hoặc đường dẫn lạ → về trang chủ của vai trò
  if (route?.access !== info.role) return navigate(HOME[info.role]);
  mount(route.render(info));
}

watchAuth(() => routes[currentPath()]?.access === GUEST);
startRouter(handleRoute);
