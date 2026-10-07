import { TestingModule } from '@nestjs/testing';
import { BooksService } from '../books/books.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { LoansService } from '../loans/loans.service';
import { MembersService } from '../members/members.service';
import { createTestingModule } from '../testing/test-db';
import { sampleBooks, sampleLoans, sampleMembers, sampleReviews } from './sample-data';
import { AUTO_SEED, SeedService } from './seed.service';

describe('SeedService + DashboardService', () => {
  let moduleRef: TestingModule;
  let seed: SeedService;

  beforeEach(async () => {
    moduleRef = await createTestingModule([
      { provide: AUTO_SEED, useValue: false },
      SeedService,
      BooksService,
      MembersService,
      LoansService,
      DashboardService,
    ]);
    seed = moduleRef.get(SeedService);
  });

  afterEach(() => moduleRef.close());

  it('seeds sample data only once unless reset', async () => {
    expect(await seed.seed()).toBe(true);
    expect(await seed.seed()).toBe(false);
    expect(await seed.seed({ reset: true })).toBe(true);

    expect(await moduleRef.get(BooksService).findAll()).toHaveLength(sampleBooks.length);
    expect(await moduleRef.get(MembersService).findAll()).toHaveLength(sampleMembers.length);
    expect(await moduleRef.get(LoansService).findAll()).toHaveLength(sampleLoans.length);
  });

  it('seeds covers, descriptions and reviews with matching rating summaries', async () => {
    await seed.seed();
    const booksService = moduleRef.get(BooksService);
    const all = await booksService.findAll();
    const mockingbird = all.find((b) => b.title === 'To Kill a Mockingbird')!;

    expect(all.every((b) => b.coverImageUrl?.startsWith('https://') && b.description)).toBe(true);

    const detail = await booksService.findDetail(mockingbird.id);
    const expected = sampleReviews.filter((r) => r.book === 0);
    expect(detail.reviews).toHaveLength(expected.length);
    expect(detail.reviewCount).toBe(expected.length);
    expect(detail.averageRating).toBe(4.5);
    // newest first: createdAt comes from the sample's daysAgo
    expect(detail.reviews[0].reviewerName).toBe('John Smith');

    const totalReviews = all.reduce((sum, b) => sum + b.reviewCount, 0);
    expect(totalReviews).toBe(sampleReviews.length);
  });

  it('produces consistent dashboard statistics', async () => {
    await seed.seed();
    const stats = await moduleRef.get(DashboardService).getStats();

    const outstanding = sampleLoans.filter((l) => l.returnedDaysAgo === undefined);
    const overdue = outstanding.filter((l) => l.borrowedDaysAgo > l.loanDays);
    const totalCopies = sampleBooks.reduce((sum, b) => sum + b.totalCopies, 0);

    expect(stats).toMatchObject({
      totalTitles: sampleBooks.length,
      totalCopies,
      availableCopies: totalCopies - outstanding.length,
      totalMembers: sampleMembers.length,
      activeMembers: sampleMembers.filter((m) => m.active).length,
      activeLoans: outstanding.length,
      overdueLoans: overdue.length,
    });
    expect(stats.recentLoans).toHaveLength(5);
    expect(stats.topBooks[0].loanCount).toBeGreaterThanOrEqual(stats.topBooks[1].loanCount);
  });
});
