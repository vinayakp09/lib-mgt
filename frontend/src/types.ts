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
  createdAt: string;
}

export interface BookInput {
  title: string;
  author: string;
  isbn: string;
  category: string;
  publishedYear: number | null;
  totalCopies: number;
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
