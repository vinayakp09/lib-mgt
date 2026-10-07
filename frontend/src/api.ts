import type {
  Book,
  BookDetail,
  BookInput,
  BookListParams,
  DashboardStats,
  Loan,
  LoanInput,
  LoanStatus,
  LoginResponse,
  Member,
  MemberInput,
  Paginated,
  ReviewInput,
  Role,
} from './types';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

let authToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

/** Token sent as `Authorization: Bearer …` on every request; null when logged out. */
export function setAuthToken(token: string | null) {
  authToken = token;
}

/** Called when an authenticated request gets 401 (expired or invalid session). Returns an unsubscribe function. */
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const sentToken = authToken;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(sentToken ? { Authorization: `Bearer ${sentToken}` } : {}),
      ...init.headers,
    },
  });

  if (res.status === 401 && sentToken) {
    unauthorizedHandler?.();
  }

  if (!res.ok) {
    let message = res.statusText || `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.message) {
        message = Array.isArray(body.message) ? body.message.join(', ') : String(body.message);
      }
    } catch {
      // non-JSON error body: keep the status text
    }
    throw new ApiError(message, res.status);
  }

  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

const query = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
};

const json = (method: string, body: unknown): RequestInit => ({ method, body: JSON.stringify(body) });

export const api = {
  login: (role: Role, password: string) =>
    request<LoginResponse>('/v1/auth/login', json('POST', { role, password })),

  getDashboard: () => request<DashboardStats>('/dashboard'),

  getBooks: (search?: string) => request<Book[]>(`/books${query({ search })}`),
  listBooks: (params: BookListParams = {}) => request<Paginated<Book>>(`/v1/books${query({ ...params })}`),
  getBookCategories: () => request<string[]>('/v1/books/categories'),
  getBookDetail: (id: number) => request<BookDetail>(`/v1/books/${id}`),
  addReview: (bookId: number, input: ReviewInput) =>
    request<BookDetail>(`/v1/books/${bookId}/reviews`, json('POST', input)),
  createBook: (input: BookInput) => request<Book>('/books', json('POST', input)),
  updateBook: (id: number, input: Partial<BookInput>) => request<Book>(`/books/${id}`, json('PATCH', input)),
  deleteBook: (id: number) => request<void>(`/books/${id}`, { method: 'DELETE' }),

  getMembers: (search?: string) => request<Member[]>(`/members${query({ search })}`),
  createMember: (input: MemberInput) => request<Member>('/members', json('POST', input)),
  updateMember: (id: number, input: Partial<MemberInput>) =>
    request<Member>(`/members/${id}`, json('PATCH', input)),
  deleteMember: (id: number) => request<void>(`/members/${id}`, { method: 'DELETE' }),

  getLoans: (status?: LoanStatus) => request<Loan[]>(`/loans${query({ status })}`),
  borrowBook: (input: LoanInput) => request<Loan>('/loans', json('POST', input)),
  returnLoan: (id: number) => request<Loan>(`/loans/${id}/return`, { method: 'PATCH' }),
};
