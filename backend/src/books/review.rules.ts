export interface RatingSummary {
  averageRating: number | null;
  reviewCount: number;
}

/** Average rounded to one decimal place; null when there are no ratings. */
export function summarizeRatings(ratings: number[]): RatingSummary {
  if (ratings.length === 0) {
    return { averageRating: null, reviewCount: 0 };
  }
  const mean = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
  return { averageRating: Math.round(mean * 10) / 10, reviewCount: ratings.length };
}
