import type { Book, BookDetail, Loan, Member, Paginated, Review } from '../types';

export const book = (overrides: Partial<Book> = {}): Book => ({
  id: 1,
  title: 'Clean Code',
  author: 'Robert C. Martin',
  isbn: '9780132350884',
  category: 'Technology',
  publishedYear: 2008,
  totalCopies: 3,
  availableCopies: 2,
  coverImageUrl: null,
  description: 'A handbook of agile software craftsmanship.',
  averageRating: 4.5,
  reviewCount: 2,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const review = (overrides: Partial<Review> = {}): Review => ({
  id: 1,
  reviewerName: 'Ananya Iyer',
  rating: 5,
  comment: 'Changed how I write code.',
  createdAt: '2026-02-01T00:00:00.000Z',
  ...overrides,
});

export const bookDetail = (base: Book, reviews: Review[] = []): BookDetail => ({ ...base, reviews });

export const paginated = <T,>(items: T[], overrides: Partial<Paginated<T>> = {}): Paginated<T> => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 8,
  totalPages: 1,
  ...overrides,
});

export const member = (overrides: Partial<Member> = {}): Member => ({
  id: 1,
  name: 'Aarav Sharma',
  email: 'aarav@example.com',
  phone: '9876543210',
  active: true,
  joinedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

export const loan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 1,
  book: book(),
  member: member(),
  loanDate: '2026-01-01T00:00:00.000Z',
  dueDate: '2026-01-15T00:00:00.000Z',
  returnDate: null,
  fine: 0,
  status: 'active',
  daysOverdue: 0,
  ...overrides,
});
