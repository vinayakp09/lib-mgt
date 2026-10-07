import { NotFoundException } from '@nestjs/common';
import { TestingModule } from '@nestjs/testing';
import { LoansService } from '../loans/loans.service';
import { MembersService } from '../members/members.service';
import { createTestingModule } from '../testing/test-db';
import { BooksService } from './books.service';

describe('BooksService – list, details and reviews (REQ-108)', () => {
  let moduleRef: TestingModule;
  let books: BooksService;

  const titles = (items: { title: string }[]) => items.map((b) => b.title);

  beforeEach(async () => {
    moduleRef = await createTestingModule([BooksService, MembersService, LoansService]);
    books = moduleRef.get(BooksService);

    await books.create({ title: 'Dune', author: 'Frank Herbert', isbn: '9780441172719', category: 'Science Fiction', publishedYear: 1965, totalCopies: 1 });
    await books.create({ title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884', category: 'Technology', publishedYear: 2008, totalCopies: 2 });
    await books.create({ title: 'Atomic Habits', author: 'James Clear', isbn: '9780735211292', category: 'Self-Help', publishedYear: 2018, totalCopies: 1 });
    await books.create({ title: 'Code Complete', author: 'Steve McConnell', isbn: '9780735619678', category: 'Technology', publishedYear: 2004, totalCopies: 1 });
    await books.create({ title: 'Brave New World', author: 'Aldous Huxley', isbn: '9780060850524', category: 'Science Fiction', publishedYear: 1932, totalCopies: 1 });
  });

  afterEach(() => moduleRef.close());

  it('paginates sorted by title by default', async () => {
    const first = await books.list({ pageSize: 2 });
    expect(first).toMatchObject({ total: 5, page: 1, pageSize: 2, totalPages: 3 });
    expect(titles(first.items)).toEqual(['Atomic Habits', 'Brave New World']);

    const last = await books.list({ pageSize: 2, page: 3 });
    expect(titles(last.items)).toEqual(['Dune']);

    expect((await books.list({ pageSize: 2, page: 9 })).items).toEqual([]);
  });

  it('sorts by any supported field in either direction', async () => {
    expect(titles((await books.list({ sort: 'title', order: 'desc' })).items)[0]).toBe('Dune');
    expect(titles((await books.list({ sort: 'publishedYear', order: 'asc' })).items)[0]).toBe('Brave New World');
    expect(titles((await books.list({ sort: 'author', order: 'asc' })).items)[0]).toBe('Brave New World');
  });

  it('sorts by rating with unrated books last', async () => {
    const all = (await books.list()).items;
    const dune = all.find((b) => b.title === 'Dune')!;
    const cleanCode = all.find((b) => b.title === 'Clean Code')!;
    await books.addReview(dune.id, { reviewerName: 'A', rating: 3 });
    await books.addReview(cleanCode.id, { reviewerName: 'B', rating: 5 });

    expect(titles((await books.list({ sort: 'averageRating', order: 'desc' })).items).slice(0, 2)).toEqual(['Clean Code', 'Dune']);
    expect(titles((await books.list({ sort: 'averageRating', order: 'asc' })).items).slice(0, 2)).toEqual(['Dune', 'Clean Code']);
  });

  it('filters by category and availability, combined with search', async () => {
    expect(titles((await books.list({ category: 'Technology' })).items)).toEqual(['Clean Code', 'Code Complete']);
    expect(titles((await books.list({ category: 'Technology', search: 'mcconnell' })).items)).toEqual(['Code Complete']);
    expect(titles((await books.list({ category: 'Science Fiction', search: 'code' })).items)).toEqual([]);

    const dune = (await books.list({ search: 'dune' })).items[0];
    const member = await moduleRef.get(MembersService).create({ name: 'Ann', email: 'ann@example.com' });
    await moduleRef.get(LoansService).borrow({ bookId: dune.id, memberId: member.id });

    expect(titles((await books.list({ availability: 'unavailable' })).items)).toEqual(['Dune']);
    expect((await books.list({ availability: 'available' })).total).toBe(4);
  });

  it('lists distinct categories alphabetically', async () => {
    expect(await books.categories()).toEqual(['Science Fiction', 'Self-Help', 'Technology']);
  });

  it('stores cover image URL and description', async () => {
    const book = await books.create({
      title: 'Refactoring',
      author: 'Martin Fowler',
      isbn: '9780134757599',
      totalCopies: 1,
      coverImageUrl: 'https://covers.example.com/refactoring.jpg',
      description: 'Improving the design of existing code.',
    });
    expect(await books.findDetail(book.id)).toMatchObject({
      coverImageUrl: 'https://covers.example.com/refactoring.jpg',
      description: 'Improving the design of existing code.',
      averageRating: null,
      reviewCount: 0,
      reviews: [],
    });

    const cleared = await books.update(book.id, { coverImageUrl: null, description: null });
    expect(cleared).toMatchObject({ coverImageUrl: null, description: null });
  });

  it('adds reviews newest first and keeps the rating summary up to date', async () => {
    const dune = (await books.list({ search: 'dune' })).items[0];

    await books.addReview(dune.id, { reviewerName: '  Ann ', rating: 5, comment: ' Epic! ' });
    const detail = await books.addReview(dune.id, { reviewerName: 'Bob', rating: 4, comment: '   ' });

    expect(detail).toMatchObject({ averageRating: 4.5, reviewCount: 2 });
    expect(detail.reviews.map((r) => [r.reviewerName, r.rating, r.comment])).toEqual([
      ['Bob', 4, null],
      ['Ann', 5, 'Epic!'],
    ]);
    expect((await books.findOne(dune.id)).averageRating).toBe(4.5);
  });

  it('throws NotFound for details or reviews of an unknown book', async () => {
    await expect(books.findDetail(999)).rejects.toBeInstanceOf(NotFoundException);
    await expect(books.addReview(999, { reviewerName: 'A', rating: 5 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deletes reviews together with their book', async () => {
    const atomic = (await books.list({ search: 'atomic' })).items[0];
    await books.addReview(atomic.id, { reviewerName: 'A', rating: 5 });

    await books.remove(atomic.id);

    await expect(books.findDetail(atomic.id)).rejects.toBeInstanceOf(NotFoundException);
  });
});
