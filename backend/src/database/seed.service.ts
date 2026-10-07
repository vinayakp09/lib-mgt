import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Book } from '../books/book.entity';
import { Review } from '../books/review.entity';
import { summarizeRatings } from '../books/review.rules';
import { Loan } from '../loans/loan.entity';
import { addDays, calculateFine } from '../loans/loan.rules';
import { Member } from '../members/member.entity';
import { sampleBooks, sampleLoans, sampleMembers, sampleReviews } from './sample-data';

export const AUTO_SEED = 'AUTO_SEED';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    @Inject(AUTO_SEED) private readonly autoSeed: boolean,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    if (this.autoSeed) {
      await this.seed();
    }
  }

  /** Inserts sample data. Without `reset`, does nothing if the database already has books. */
  async seed({ reset = false }: { reset?: boolean } = {}): Promise<boolean> {
    const seeded = await this.dataSource.transaction(async (manager) => {
      if (!reset && (await manager.count(Book)) > 0) {
        return false;
      }

      await manager.clear(Loan);
      await manager.clear(Review);
      await manager.clear(Book);
      await manager.clear(Member);
      await manager.query(
        `DELETE FROM sqlite_sequence WHERE name IN ('loans', 'reviews', 'books', 'members')`,
      );

      const now = new Date();
      const books = await manager.save(
        sampleBooks.map((book, index) => {
          const ratings = sampleReviews.filter((r) => r.book === index).map((r) => r.rating);
          return manager.create(Book, {
            ...book,
            availableCopies: book.totalCopies,
            ...summarizeRatings(ratings),
          });
        }),
      );
      await manager.save(
        sampleReviews.map((review) =>
          manager.create(Review, {
            book: books[review.book],
            reviewerName: review.reviewerName,
            rating: review.rating,
            comment: review.comment,
            createdAt: addDays(now, -review.daysAgo),
          }),
        ),
      );
      const members = await manager.save(sampleMembers.map((member) => manager.create(Member, member)));

      const loans = sampleLoans.map((spec) => {
        const book = books[spec.book];
        const loanDate = addDays(now, -spec.borrowedDaysAgo);
        const dueDate = addDays(loanDate, spec.loanDays);
        const returnDate =
          spec.returnedDaysAgo !== undefined ? addDays(now, -spec.returnedDaysAgo) : null;
        if (!returnDate) {
          book.availableCopies -= 1;
        }
        return manager.create(Loan, {
          book,
          member: members[spec.member],
          loanDate,
          dueDate,
          returnDate,
          fine: returnDate ? calculateFine(dueDate, returnDate) : 0,
        });
      });
      await manager.save(books);
      await manager.save(loans);
      return true;
    });

    if (seeded) {
      this.logger.log(
        `Seeded ${sampleBooks.length} books, ${sampleReviews.length} reviews, ${sampleMembers.length} members and ${sampleLoans.length} loans`,
      );
    }
    return seeded;
  }
}
