import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { errorMessage } from '../utils';

export function SubscribePage() {
  const [collegeName, setCollegeName] = useState('');
  const [slug, setSlug] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { url } = await api.createCheckoutSession({
        collegeName: collegeName.trim(),
        slug: slug.trim().toLowerCase(),
        contactEmail: contactEmail.trim(),
      });
      window.location.href = url;
    } catch (err) {
      setError(errorMessage(err));
      setSubmitting(false);
    }
  };

  return (
    <div className="login-screen">
      <form className="card form login-card" onSubmit={handleSubmit} noValidate>
        <div className="brand login-brand">
          <span className="brand-icon">🎓</span>
          <span>College subscription</span>
        </div>
        <h1>Start annual subscription</h1>
        <p className="muted small">Pay via Stripe Checkout to provision your library tenant.</p>
        {error && <div className="alert alert-error" role="alert">{error}</div>}
        <label>
          College name
          <input value={collegeName} onChange={(e) => setCollegeName(e.target.value)} required />
        </label>
        <label>
          Tenant slug
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-college"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            required
          />
        </label>
        <label>
          Billing email
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} required />
        </label>
        <button type="submit" className="btn btn-primary login-submit" disabled={submitting}>
          {submitting ? 'Redirecting…' : 'Continue to Stripe Checkout'}
        </button>
        <p className="muted small login-footer">
          Already subscribed? <Link to="/">Sign in to your library</Link>
        </p>
      </form>
    </div>
  );
}
