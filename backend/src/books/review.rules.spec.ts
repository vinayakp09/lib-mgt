import { summarizeRatings } from './review.rules';

describe('summarizeRatings', () => {
  it('returns null average and zero count without ratings', () => {
    expect(summarizeRatings([])).toEqual({ averageRating: null, reviewCount: 0 });
  });

  it('averages and rounds to one decimal place', () => {
    expect(summarizeRatings([5])).toEqual({ averageRating: 5, reviewCount: 1 });
    expect(summarizeRatings([5, 4])).toEqual({ averageRating: 4.5, reviewCount: 2 });
    expect(summarizeRatings([5, 4, 4])).toEqual({ averageRating: 4.3, reviewCount: 3 });
    expect(summarizeRatings([1, 2, 2])).toEqual({ averageRating: 1.7, reviewCount: 3 });
  });
});
