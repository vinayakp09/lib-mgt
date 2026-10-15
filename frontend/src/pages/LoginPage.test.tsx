import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api';
import { AuthProvider } from '../auth';
import { LoginPage } from './LoginPage';

vi.mock('../api', () => ({
  api: { login: vi.fn() },
  setAuthToken: vi.fn(),
  onUnauthorized: vi.fn(),
}));

const mocked = vi.mocked(api);

const renderLogin = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

describe('LoginPage', () => {
  beforeEach(() => {
    mocked.login.mockReset();
  });

  it('offers User and Admin roles with none preselected', () => {
    renderLogin();
    expect(screen.getByRole('radio', { name: /User/ })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: /Admin/ })).not.toBeChecked();
    expect(screen.getByLabelText('Password')).toHaveAttribute('type', 'password');
  });

  it('requires a role to be selected', async () => {
    renderLogin();
    await userEvent.type(screen.getByLabelText('Password'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Select a role');
    expect(mocked.login).not.toHaveBeenCalled();
  });

  it('requires a password', async () => {
    renderLogin();
    await userEvent.click(screen.getByRole('radio', { name: /User/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Enter the password');
    expect(mocked.login).not.toHaveBeenCalled();
  });

  it('shows the server error for a wrong password and lets the visitor retry', async () => {
    mocked.login.mockRejectedValue(new Error('Invalid role or password'));
    renderLogin();

    await userEvent.click(screen.getByRole('radio', { name: /Admin/ }));
    await userEvent.type(screen.getByLabelText('Password'), '9999');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(mocked.login).toHaveBeenCalledWith('demo', 'admin', '9999');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid role or password');
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled();
  });

  it('disables the button while signing in', async () => {
    mocked.login.mockReturnValue(new Promise(() => {}));
    renderLogin();

    await userEvent.click(screen.getByRole('radio', { name: /User/ }));
    await userEvent.type(screen.getByLabelText('Password'), '1234');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled();
  });

  it('can be operated with the keyboard', async () => {
    mocked.login.mockReturnValue(new Promise(() => {}));
    renderLogin();

    await userEvent.tab();
    expect(screen.getByLabelText('College tenant slug')).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole('radio', { name: /User/ })).toHaveFocus();
    await userEvent.keyboard(' ');
    await userEvent.tab();
    await userEvent.keyboard('1234{Enter}');

    expect(mocked.login).toHaveBeenCalledWith('demo', 'user', '1234');
  });
});
