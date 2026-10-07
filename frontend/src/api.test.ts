import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, api, onUnauthorized, setAuthToken } from './api';

function mockFetch(status: number, body?: unknown) {
  const fetchMock = vi.fn().mockImplementation(async () =>
    new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('api client', () => {
  afterEach(() => setAuthToken(null));

  it('posts role and password to the v1 login endpoint', async () => {
    const fetchMock = mockFetch(200, { success: true, role: 'user', token: 't', expiresIn: 60 });
    const result = await api.login('user', '1234');

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/v1/auth/login');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ role: 'user', password: '1234' });
    expect(result.token).toBe('t');
  });

  it('sends the Bearer token once one is set', async () => {
    const fetchMock = mockFetch(200, []);
    await api.getBooks();
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();

    setAuthToken('abc');
    await api.getBooks();
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer abc');
  });

  it('notifies the unauthorized handler when an authenticated request gets 401', async () => {
    const handler = vi.fn();
    const unsubscribe = onUnauthorized(handler);

    mockFetch(401, { statusCode: 401, message: 'Invalid role or password' });
    await expect(api.login('admin', 'nope')).rejects.toThrow('Invalid role or password');
    expect(handler).not.toHaveBeenCalled();

    setAuthToken('expired');
    mockFetch(401, { statusCode: 401, message: 'Login required' });
    await expect(api.getBooks()).rejects.toMatchObject({ status: 401 });
    expect(handler).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('builds search query strings', async () => {
    const fetchMock = mockFetch(200, []);
    await api.getBooks('harry potter');
    expect(fetchMock).toHaveBeenCalledWith('/api/books?search=harry+potter', expect.any(Object));
  });

  it('omits empty query params', async () => {
    const fetchMock = mockFetch(200, []);
    await api.getLoans();
    expect(fetchMock).toHaveBeenCalledWith('/api/loans', expect.any(Object));
  });

  it('sends JSON bodies for mutations', async () => {
    const fetchMock = mockFetch(201, { id: 1 });
    await api.borrowBook({ bookId: 2, memberId: 3, loanDays: 7 });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api/loans');
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ bookId: 2, memberId: 3, loanDays: 7 });
  });

  it('handles 204 No Content', async () => {
    mockFetch(204);
    await expect(api.deleteBook(1)).resolves.toBeUndefined();
  });

  it('throws ApiError with the server message', async () => {
    mockFetch(400, { message: ['title should not be empty', 'isbn must be longer'] });
    const error = await api.createBook({} as never).catch((e) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(400);
    expect(error.message).toBe('title should not be empty, isbn must be longer');
  });
});
