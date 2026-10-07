import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { api, onUnauthorized, setAuthToken } from './api';
import { AuthProvider, SESSION_STORAGE_KEY } from './auth';
import { book, loan, member } from './test/fixtures';
import type { Role } from './types';

vi.mock('./api', () => ({
  api: {
    login: vi.fn(),
    getDashboard: vi.fn(),
    getBooks: vi.fn(),
    getMembers: vi.fn(),
    getLoans: vi.fn(),
  },
  setAuthToken: vi.fn(),
  onUnauthorized: vi.fn(),
}));

const mocked = vi.mocked(api);
let unauthorized: () => void = () => {};

const renderApp = (path = '/') =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </AuthProvider>,
  );

async function logIn(role: 'User' | 'Admin') {
  await userEvent.click(screen.getByRole('radio', { name: new RegExp(role) }));
  await userEvent.type(screen.getByLabelText('Password'), '1234');
  await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
}

const navLinks = () =>
  within(screen.getByRole('navigation'))
    .getAllByRole('link')
    .map((link) => link.textContent?.replace(/[^A-Za-z ]/g, '').trim());

describe('App authentication and role-based access', () => {
  beforeEach(() => {
    mocked.login.mockReset().mockImplementation(async (role: Role, password: string) => {
      if (password !== '1234') throw new Error('Invalid role or password');
      return { success: true, role, token: `${role}-token`, expiresIn: 3600 };
    });
    mocked.getDashboard.mockReset().mockResolvedValue({
      totalTitles: 1, totalCopies: 3, availableCopies: 2, totalMembers: 1, activeMembers: 1,
      activeLoans: 1, overdueLoans: 0, recentLoans: [loan()], topBooks: [],
    });
    mocked.getBooks.mockReset().mockResolvedValue([book()]);
    mocked.getMembers.mockReset().mockResolvedValue([member()]);
    mocked.getLoans.mockReset().mockResolvedValue([loan()]);
    vi.mocked(onUnauthorized).mockImplementation((handler) => {
      unauthorized = handler;
      return () => {};
    });
  });

  it('shows only the login screen to an unauthenticated visitor', () => {
    renderApp('/books');
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(mocked.getBooks).not.toHaveBeenCalled();
  });

  it('logs in a User who can search books, borrow and return, without admin features', async () => {
    renderApp('/books');
    await logIn('User');

    expect(mocked.login).toHaveBeenCalledWith('user', '1234');
    expect(setAuthToken).toHaveBeenLastCalledWith('user-token');
    expect(await screen.findByText('Clean Code')).toBeInTheDocument();
    expect(screen.getByLabelText('Search books')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '+ Add book' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Edit' })).not.toBeInTheDocument();
    expect(navLinks()).toEqual(['Dashboard', 'Books', 'Loans']);
    expect(screen.getByTestId('session-role')).toHaveTextContent('User');

    await userEvent.click(screen.getByRole('link', { name: /Loans/ }));
    expect(await screen.findByRole('button', { name: 'Issue book' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Return' })).toBeInTheDocument();
  });

  it('redirects a User away from the admin-only Members page', async () => {
    renderApp('/members');
    await logIn('User');

    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(mocked.getMembers).not.toHaveBeenCalled();
  });

  it('logs in an Admin with full access', async () => {
    renderApp('/books');
    await logIn('Admin');

    expect(mocked.login).toHaveBeenCalledWith('admin', '1234');
    expect(await screen.findByRole('button', { name: 'Edit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '+ Add book' })).toBeInTheDocument();
    expect(navLinks()).toEqual(['Dashboard', 'Books', 'Members', 'Loans']);

    await userEvent.click(screen.getByRole('link', { name: /Members/ }));
    expect(await screen.findByRole('button', { name: '+ Add member' })).toBeInTheDocument();
  });

  it('stays on the login screen when the password is wrong', async () => {
    renderApp();
    await userEvent.click(screen.getByRole('radio', { name: /Admin/ }));
    await userEvent.type(screen.getByLabelText('Password'), '0000');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid role or password');
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });

  it('remembers the session across reloads and clears it on logout', async () => {
    const { unmount } = renderApp();
    await logIn('Admin');
    await screen.findByRole('heading', { name: 'Dashboard' });
    expect(JSON.parse(localStorage.getItem(SESSION_STORAGE_KEY)!)).toEqual({ role: 'admin', token: 'admin-token' });

    unmount();
    renderApp();
    expect(await screen.findByRole('heading', { name: 'Dashboard' })).toBeInTheDocument();
    expect(setAuthToken).toHaveBeenLastCalledWith('admin-token');

    await userEvent.click(screen.getByRole('button', { name: 'Log out' }));
    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(localStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(setAuthToken).toHaveBeenLastCalledWith(null);
  });

  it('returns to the login screen with a notice when the session expires', async () => {
    renderApp();
    await logIn('User');
    await screen.findByRole('heading', { name: 'Dashboard' });

    act(() => unauthorized());

    expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent('session has expired');
  });
});
