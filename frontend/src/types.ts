export type Role = 'admin' | 'user';

export interface LoginResponse {
  success: boolean;
  role: Role;
  token: string;
  expiresIn: number;
}

export interface Session {
  role: Role;
  token: string;
}

export interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedYear: number | null;
  totalCopies: number;
  availableCopies: number;
  coverImageUrl: string | null;
  description: string | null;
  averageRating: number | null;
  reviewCount: number;
  createdAt: string;
}

export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedYear: number | null;
  totalCopies: number;
  coverImageUrl: string | null;
  description: string | null;
}

export interface Review {
  id: number;
  reviewerName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface ReviewInput {
  reviewerName: string;
  rating: number;
  comment: string | null;
}

export type BookDetail = Book & { reviews: Review[] };

export type BookSortField = 'title' | 'author' | 'publishedYear' | 'averageRating' | 'createdAt';

export interface BookListParams {
  search?: string;
  category?: string;
  availability?: 'available' | 'unavailable';
  sort?: BookSortField;
  order?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
  joinedAt: string;
}

export interface MemberInput {
  name: string;
  email: string;
  phone: string | null;
  active: boolean;
}

export type LoanStatus = 'active' | 'overdue' | 'returned';

export interface Loan {
  id: number;
  book: Book;
  member: Member;
  loanDate: string;
  dueDate: string;
  returnDate: string | null;
  fine: number;
  status: LoanStatus;
  daysOverdue: number;
}

export interface LoanInput {
  bookId: number;
  memberId: number;
  loanDays: number;
}

export interface TopBook {
  id: number;
  title: string;
  author: string;
  loanCount: number;
}

export interface DashboardStats {
  totalTitles: number;
  totalCopies: number;
  availableCopies: number;
  totalMembers: number;
  activeMembers: number;
  activeLoans: number;
  overdueLoans: number;
  recentLoans: Loan[];
  topBooks: TopBook[];
}
