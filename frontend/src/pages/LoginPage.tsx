import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { DEFAULT_TENANT_SLUG, useAuth } from '../auth';
import type { Role } from '../types';
import { errorMessage } from '../utils';

const roles: Array<{ value: Role; label: string; description: string }> = [
  { value: 'user', label: 'User', description: 'Search books, borrow and return' },
  { value: 'admin', label: 'Admin', description: 'Full access, including managing books and members' },
];

export function LoginPage() {
  const { login, notice } = useAuth();
  const [tenantSlug, setTenantSlug] = useState(DEFAULT_TENANT_SLUG);
  const [role, setRole] = useState<Role | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!tenantSlug.trim()) {
      setError('Enter your college tenant slug');
      return;
    }
    if (!role) {
      setError('Select a role');
      return;
    }
    if (!password) {
      setError('Enter the password');
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(tenantSlug, role, password);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="card form login-card" onSubmit={handleSubmit} noValidate>
        <div className="brand login-brand">
          <span className="brand-icon">📖</span>
          <span>Library MS</span>
        </div>
        <h1>Sign in</h1>

        {notice && !error && <div className="alert alert-error" role="alert">{notice}</div>}
        {error && <div className="alert alert-error" role="alert">{error}</div>}

        <label>
          College tenant slug
          <input
            value={tenantSlug}
            onChange={(e) => setTenantSlug(e.target.value)}
            autoComplete="organization"
            placeholder="demo"
          />
        </label>

        <fieldset className="role-picker">
          <legend>Role</legend>
          {roles.map((option) => (
            <label key={option.value} className={`role-option${role === option.value ? ' role-option-selected' : ''}`}>
              <input
                type="radio"
                name="role"
                value={option.value}
                checked={role === option.value}
                onChange={() => setRole(option.value)}
              />
              <span>
                <strong>{option.label}</strong>
                <span className="muted small">{option.description}</span>
              </span>
            </label>
          ))}
        </fieldset>

        <label>
          Password
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>

        <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>

        <p className="muted small login-footer">
          <Link to="/subscribe">Subscribe your college</Link>
          {' · '}
          <Link to="/super-admin">Super Admin</Link>
        </p>
      </form>
    </div>
  );
}
