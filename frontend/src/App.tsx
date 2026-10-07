import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth';
import { BooksPage } from './pages/BooksPage';
import { DashboardPage } from './pages/DashboardPage';
import { LoansPage } from './pages/LoansPage';
import { LoginPage } from './pages/LoginPage';
import { MembersPage } from './pages/MembersPage';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', adminOnly: false },
  { to: '/books', label: 'Books', icon: '📚', adminOnly: false },
  { to: '/members', label: 'Members', icon: '👥', adminOnly: true },
  { to: '/loans', label: 'Loans', icon: '🔄', adminOnly: false },
];

export default function App() {
  const { session, isAdmin, logout } = useAuth();

  if (!session) {
    return <LoginPage />;
  }

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-icon">📖</span>
          <span>Library MS</span>
        </div>
        <nav aria-label="Main">
          {links
            .filter((link) => isAdmin || !link.adminOnly)
            .map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
                <span aria-hidden>{link.icon}</span> {link.label}
              </NavLink>
            ))}
        </nav>
        <div className="session">
          <span className="session-role" data-testid="session-role">
            {isAdmin ? 'Admin' : 'User'}
          </span>
          <button type="button" className="btn btn-small btn-logout" onClick={logout}>
            Log out
          </button>
        </div>
      </aside>
      <main className="content">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/books" element={<BooksPage canManage={isAdmin} />} />
          {isAdmin && <Route path="/members" element={<MembersPage />} />}
          <Route path="/loans" element={<LoansPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
