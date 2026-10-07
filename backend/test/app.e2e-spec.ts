import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { sampleBooks } from '../src/database/sample-data';

describe('Library API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const http = () => request(app.getHttpServer());

  const login = (role: string, password: string) => http().post('/api/v1/auth/login').send({ role, password });

  /** Supertest client that sends the given Bearer token (or none) on every request. */
  const client = (token?: string) => {
    const withAuth = (req: request.Test) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
    return {
      get: (url: string) => withAuth(http().get(url)),
      post: (url: string) => withAuth(http().post(url)),
      patch: (url: string) => withAuth(http().patch(url)),
      delete: (url: string) => withAuth(http().delete(url)),
    };
  };
  const admin = () => client(adminToken);
  const user = () => client(userToken);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.register({ dbPath: ':memory:', serveFrontend: false, autoSeed: true })],
    }).compile();
    app = configureApp(moduleRef.createNestApplication());
    await app.init();

    adminToken = (await login('admin', '1234').expect(200)).body.token;
    userToken = (await login('user', '1234').expect(200)).body.token;
  });

  afterAll(() => app.close());

  describe('authentication (REQ-105)', () => {
    it.each(['admin', 'user'])('POST /api/v1/auth/login logs in the %s role with password 1234', async (role) => {
      const res = await login(role, '1234').expect(200);
      expect(res.body).toEqual({ success: true, role, token: expect.any(String), expiresIn: expect.any(Number) });
    });

    it('rejects a wrong password with 401 in the standard error format', async () => {
      const res = await login('admin', 'wrong').expect(401);
      expect(res.body).toEqual({ statusCode: 401, message: 'Invalid role or password', error: 'Unauthorized' });
      expect(res.body.token).toBeUndefined();
    });

    it('rejects an invalid role or missing fields with 400', async () => {
      await login('superuser', '1234').expect(400);
      await http().post('/api/v1/auth/login').send({ role: 'user' }).expect(400);
      await http().post('/api/v1/auth/login').send({ password: '1234' }).expect(400);
    });

    it('GET /api/v1/auth/me returns the role behind the token', async () => {
      await user().get('/api/v1/auth/me').expect(200, { role: 'user' });
      await admin().get('/api/v1/auth/me').expect(200, { role: 'admin' });
    });

    it.each(['/api/books', '/api/members', '/api/loans', '/api/dashboard', '/api/v1/auth/me'])(
      'GET %s requires a valid token',
      async (url) => {
        await client().get(url).expect(401);
        await client('invalid-token').get(url).expect(401);
      },
    );

    it('lets a user search books, borrow and return', async () => {
      const search = await user().get('/api/books').query({ search: 'hobbit' }).expect(200);
      const hobbit = search.body[0];
      expect(hobbit.title).toBe('The Hobbit');

      const members = (await user().get('/api/members').expect(200)).body;
      const sara = members.find((m: { name: string }) => m.name === 'Sara Khan');

      const loan = (await user().post('/api/loans').send({ bookId: hobbit.id, memberId: sara.id }).expect(201)).body;
      await user().get('/api/loans').query({ memberId: sara.id }).expect(200);
      const returned = (await user().patch(`/api/loans/${loan.id}/return`).expect(200)).body;
      expect(returned.status).toBe('returned');
    });

    it('forbids a user from changing books or members (403)', async () => {
      await user().post('/api/books').send({ title: 'X', author: 'Y', isbn: '1111111111', totalCopies: 1 }).expect(403);
      await user().patch('/api/books/1').send({ totalCopies: 9 }).expect(403);
      await user().delete('/api/books/1').expect(403);
      await user().post('/api/members').send({ name: 'Eve', email: 'eve@example.com' }).expect(403);
      await user().patch('/api/members/1').send({ active: false }).expect(403);
      await user().delete('/api/members/1').expect(403);

      const book = (await admin().get('/api/books/1').expect(200)).body;
      expect(book.totalCopies).not.toBe(9);
    });
  });

  describe('book list & details (REQ-108)', () => {
    it('GET /api/v1/books returns a paginated, sorted page', async () => {
      const res = await user().get('/api/v1/books').query({ pageSize: 5, sort: 'publishedYear', order: 'desc' }).expect(200);
      expect(res.body).toMatchObject({ page: 1, pageSize: 5, total: sampleBooks.length, totalPages: Math.ceil(sampleBooks.length / 5) });
      expect(res.body.items).toHaveLength(5);
      expect(res.body.items[0].title).toBe('Introduction to Algorithms');
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({ coverImageUrl: expect.any(String), description: expect.any(String), reviewCount: expect.any(Number) }),
      );
    });

    it('GET /api/v1/books filters by search, category and availability', async () => {
      const tech = await user().get('/api/v1/books').query({ category: 'Technology', search: 'code' }).expect(200);
      expect(tech.body.items.map((b: { title: string }) => b.title)).toEqual(['Clean Code']);

      const available = await user().get('/api/v1/books').query({ availability: 'available', pageSize: 50 }).expect(200);
      expect(available.body.items.every((b: { availableCopies: number }) => b.availableCopies > 0)).toBe(true);
    });

    it('GET /api/v1/books validates query params', async () => {
      await user().get('/api/v1/books').query({ pageSize: 500 }).expect(400);
      await user().get('/api/v1/books').query({ page: 0 }).expect(400);
      await user().get('/api/v1/books').query({ sort: 'isbn; DROP TABLE books' }).expect(400);
      await user().get('/api/v1/books').query({ order: 'sideways' }).expect(400);
      await user().get('/api/v1/books').query({ availability: 'maybe' }).expect(400);
    });

    it('GET /api/v1/books/categories lists distinct categories', async () => {
      const res = await user().get('/api/v1/books/categories').expect(200);
      expect(res.body).toEqual([...new Set(sampleBooks.map((b) => b.category))].sort());
    });

    it('GET /api/v1/books/:id returns details with reviews; 404 for unknown', async () => {
      const page = await user().get('/api/v1/books').query({ search: '1984' }).expect(200);
      const res = await user().get(`/api/v1/books/${page.body.items[0].id}`).expect(200);
      expect(res.body).toMatchObject({ title: '1984', reviewCount: 3, averageRating: 4.7 });
      expect(res.body.reviews).toHaveLength(3);
      expect(res.body.reviews[0]).toEqual(
        expect.objectContaining({ reviewerName: expect.any(String), rating: expect.any(Number), createdAt: expect.any(String) }),
      );
      await user().get('/api/v1/books/9999').expect(404);
    });

    it('POST /api/v1/books/:id/reviews adds a review for any signed-in role and validates input', async () => {
      const page = await user().get('/api/v1/books').query({ search: 'great gatsby' }).expect(200);
      const id = page.body.items[0].id;

      const res = await user().post(`/api/v1/books/${id}/reviews`).send({ reviewerName: 'Tester', rating: 5, comment: 'Loved it' }).expect(201);
      expect(res.body).toMatchObject({ reviewCount: 2, averageRating: 4 });
      expect(res.body.reviews[0]).toMatchObject({ reviewerName: 'Tester', rating: 5, comment: 'Loved it' });

      await user().post(`/api/v1/books/${id}/reviews`).send({ reviewerName: 'X', rating: 6 }).expect(400);
      await user().post(`/api/v1/books/${id}/reviews`).send({ rating: 3 }).expect(400);
      await client().post(`/api/v1/books/${id}/reviews`).send({ reviewerName: 'X', rating: 3 }).expect(401);
    });

    it('admin can set cover and description; invalid cover URL is rejected', async () => {
      const book = (
        await admin().post('/api/books')
          .send({ title: 'Domain-Driven Design', author: 'Eric Evans', isbn: '9780321125217', totalCopies: 1, coverImageUrl: 'https://example.com/ddd.jpg', description: 'Tackling complexity.' })
          .expect(201)
      ).body;
      expect(book).toMatchObject({ coverImageUrl: 'https://example.com/ddd.jpg', description: 'Tackling complexity.' });

      await admin().patch(`/api/books/${book.id}`).send({ coverImageUrl: 'javascript:alert(1)' }).expect(400);
      await admin().patch(`/api/books/${book.id}`).send({ coverImageUrl: 'not a url' }).expect(400);
      await admin().delete(`/api/books/${book.id}`).expect(204);
    });

    it('requires a token for the v1 book endpoints', async () => {
      await client().get('/api/v1/books').expect(401);
      await client().get('/api/v1/books/1').expect(401);
    });
  });

  it('GET /api/books returns the seeded catalogue', async () => {
    const res = await admin().get('/api/books').expect(200);
    expect(res.body).toHaveLength(sampleBooks.length);
  });

  it('GET /api/books?search= filters results', async () => {
    const res = await admin().get('/api/books').query({ search: 'orwell' }).expect(200);
    expect(res.body.map((b: { title: string }) => b.title)).toEqual(['1984']);
  });

  it('POST /api/books validates the payload', async () => {
    const res = await admin().post('/api/books').send({ title: '', totalCopies: 0 }).expect(400);
    expect(Array.isArray(res.body.message)).toBe(true);
  });

  it('runs a full create → borrow → return → delete flow as admin', async () => {
    const book = (
      await admin()
        .post('/api/books')
        .send({ title: 'Refactoring', author: 'Martin Fowler', isbn: '9780134757599', category: 'Technology', totalCopies: 1 })
        .expect(201)
    ).body;
    expect(book.availableCopies).toBe(1);

    const member = (
      await admin().post('/api/members').send({ name: 'Test Reader', email: 'reader@example.com' }).expect(201)
    ).body;

    const loan = (await admin().post('/api/loans').send({ bookId: book.id, memberId: member.id }).expect(201)).body;
    expect(loan.status).toBe('active');
    expect(loan.book.id).toBe(book.id);

    await admin().get(`/api/books/${book.id}`).expect(200).expect((res) => expect(res.body.availableCopies).toBe(0));
    await admin().post('/api/loans').send({ bookId: book.id, memberId: member.id }).expect(400);
    await admin().delete(`/api/books/${book.id}`).expect(400);

    const returned = (await admin().patch(`/api/loans/${loan.id}/return`).expect(200)).body;
    expect(returned.status).toBe('returned');
    expect(returned.fine).toBe(0);

    await admin().delete(`/api/books/${book.id}`).expect(204);
    await admin().get(`/api/books/${book.id}`).expect(404);
  });

  it('GET /api/loans?status=overdue only returns overdue loans', async () => {
    const res = await admin().get('/api/loans').query({ status: 'overdue' }).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body.every((l: { status: string }) => l.status === 'overdue')).toBe(true);
  });

  it('GET /api/loans rejects an invalid status', async () => {
    await admin().get('/api/loans').query({ status: 'lost' }).expect(400);
  });

  it('GET /api/dashboard returns statistics', async () => {
    const res = await admin().get('/api/dashboard').expect(200);
    expect(res.body).toMatchObject({ totalTitles: sampleBooks.length });
    expect(res.body.overdueLoans).toBeGreaterThan(0);
    expect(res.body.recentLoans).toHaveLength(5);
  });

  it('returns 404 for unknown resources', async () => {
    await admin().get('/api/members/9999').expect(404);
    await admin().patch('/api/loans/9999/return').expect(404);
  });
});
