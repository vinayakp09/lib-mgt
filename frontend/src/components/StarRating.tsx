interface Props {
  rating: number | null;
  count?: number;
  compact?: boolean;
}

export function StarRating({ rating, count, compact = false }: Props) {
  if (rating === null) {
    return <span className="muted small">{compact ? '—' : 'No ratings yet'}</span>;
  }
  const filled = Math.round(rating);
  const label = `Rated ${rating.toFixed(1)} out of 5${count !== undefined ? ` from ${count} review${count === 1 ? '' : 's'}` : ''}`;
  return (
    <span className="stars" role="img" aria-label={label} title={label}>
      <span aria-hidden className="stars-icons">
        {'★'.repeat(filled)}
        <span className="stars-empty">{'★'.repeat(5 - filled)}</span>
      </span>
      <span aria-hidden className="stars-value">
        {rating.toFixed(1)}
        {!compact && count !== undefined && <span className="muted"> ({count})</span>}
      </span>
    </span>
  );
}
