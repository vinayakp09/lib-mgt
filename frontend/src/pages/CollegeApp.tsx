import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth';
import { BooksPage } from './BooksPage';
import { DashboardPage } from './DashboardPage';
import { LoansPage } from './LoansPage';
import { LoginPage } from './LoginPage';
import { MembersPage } from './MembersPage';
import { formatDate } from '../utils';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊', adminOnly: false },
  { to: '/books', label: 'Books', icon: '📚', adminOnly: false },
  { to: '/members', label: 'Members', icon: '👥', adminOnly: true },
  { to: '/loans', label: 'Loans', icon: '🔄', adminOnly: false },
];

export function CollegeApp() {
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
        <p className="tenant-badge" data-testid="tenant-slug">
          {session.tenantSlug}
        </p>
        {session.subscriptionExpiresAt && (
          <p className="muted small subscription-note" data-testid="subscription-expiry">
            Subscription until {formatDate(session.subscriptionExpiresAt)}
          </p>
        )}
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
