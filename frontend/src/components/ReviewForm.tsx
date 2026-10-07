import { useState, type FormEvent } from 'react';
import type { ReviewInput } from '../types';
import { errorMessage } from '../utils';

interface Props {
  onSubmit: (input: ReviewInput) => Promise<void>;
}

export function ReviewForm({ onSubmit }: Props) {
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState('');
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!reviewerName.trim()) return setError('Your name is required');
    if (!rating) return setError('Choose a rating');
    setError(null);
    setSaving(true);
    try {
      await onSubmit({ reviewerName: reviewerName.trim(), rating: Number(rating), comment: comment.trim() || null });
      setReviewerName('');
      setRating('');
      setComment('');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="review-form" onSubmit={handleSubmit} noValidate aria-label="Write a review">
      <h4>Write a review</h4>
      {error && <div className="alert alert-error" role="alert">{error}</div>}
      <div className="review-form-row">
        <label>
          Your name
          <input value={reviewerName} maxLength={80} onChange={(e) => setReviewerName(e.target.value)} />
        </label>
        <label>
          Rating
          <select value={rating} onChange={(e) => setRating(e.target.value)}>
            <option value="">Select…</option>
            {[5, 4, 3, 2, 1].map((stars) => (
              <option key={stars} value={stars}>
                {'★'.repeat(stars)} ({stars})
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Comment
        <textarea rows={2} maxLength={1000} value={comment} onChange={(e) => setComment(e.target.value)} />
      </label>
      <div className="form-actions">
        <button type="submit" className="btn btn-primary btn-small" disabled={saving}>
          {saving ? 'Posting…' : 'Post review'}
        </button>
      </div>
    </form>
  );
}
