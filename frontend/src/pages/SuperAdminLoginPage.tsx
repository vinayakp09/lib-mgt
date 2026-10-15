import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useSuperAdminAuth } from '../superAdminAuth';
import { errorMessage } from '../utils';

export function SuperAdminLoginPage() {
  const { login } = useSuperAdminAuth();
  const [email, setEmail] = useState('super@library.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="card form login-card" onSubmit={handleSubmit} noValidate>
        <div className="brand login-brand">
          <span className="brand-icon">🛡️</span>
          <span>Platform Admin</span>
        </div>
        <h1>Super Admin sign in</h1>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label>
          Email
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
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
          <Link to="/">College library login</Link>
        </p>
      </form>
    </div>
  );
}
