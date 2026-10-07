import type { BookDetail, ReviewInput } from '../types';
import { formatDate } from '../utils';
import { BookCover } from './BookCover';
import { ReviewForm } from './ReviewForm';
import { StarRating } from './StarRating';

interface Props {
  book: BookDetail;
  canManage: boolean;
  deleting: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onAddReview: (input: ReviewInput) => Promise<void>;
}

export function BookDetailPanel({ book, canManage, deleting, onEdit, onDelete, onAddReview }: Props) {
  return (
    <article className="card book-detail" aria-label={`Details for ${book.title}`}>
      <div className="book-detail-head">
        <BookCover url={book.coverImageUrl} title={book.title} size="large" />
        <div className="book-detail-meta">
          <h2>{book.title}</h2>
          <p className="muted">by {book.author}</p>
          <StarRating rating={book.averageRating} count={book.reviewCount} />
          <dl className="facts">
            <div><dt>Year</dt><dd>{book.publishedYear ?? '—'}</dd></div>
            <div><dt>Category</dt><dd>{book.category}</dd></div>
            <div><dt>ISBN</dt><dd className="mono">{book.isbn}</dd></div>
            <div>
              <dt>Available</dt>
              <dd className={book.availableCopies === 0 ? 'text-danger' : ''}>
                {book.availableCopies} / {book.totalCopies}
              </dd>
            </div>
          </dl>
          {canManage && (
            <div className="detail-actions">
              <button type="button" className="btn btn-small" onClick={onEdit}>Edit</button>
              <button type="button" className="btn btn-small btn-danger" onClick={onDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          )}
        </div>
      </div>

      <section>
        <h3>Description</h3>
        <p className={book.description ? 'description' : 'muted'}>{book.description ?? 'No description yet.'}</p>
      </section>

      <section>
        <h3>Reviews ({book.reviewCount})</h3>
        {book.reviews.length === 0 ? (
          <p className="muted">No reviews yet — be the first.</p>
        ) : (
          <ul className="reviews">
            {book.reviews.map((review) => (
              <li key={review.id}>
                <div className="review-head">
                  <strong>{review.reviewerName}</strong>
                  <StarRating rating={review.rating} compact />
                  <span className="muted small">{formatDate(review.createdAt)}</span>
                </div>
                {review.comment && <p>{review.comment}</p>}
              </li>
            ))}
          </ul>
        )}
        <ReviewForm key={book.id} onSubmit={onAddReview} />
      </section>
    </article>
  );
}
