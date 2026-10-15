import { Inject, Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AdminAuthService } from '../admin/admin-auth.service';
import { Book } from '../books/book.entity';
import { Review } from '../books/review.entity';
import { summarizeRatings } from '../books/review.rules';
import { config } from '../config';
import { Loan } from '../loans/loan.entity';
import { addDays, calculateFine } from '../loans/loan.rules';
import { Member } from '../members/member.entity';
import { Subscription } from '../subscriptions/subscription.entity';
import { DEFAULT_TENANT_SLUG } from '../auth/auth.constants';
import { ANNUAL_SUBSCRIPTION_DAYS } from '../tenancy/subscription.rules';
import { Tenant } from '../tenancy/tenant.entity';
import { sampleBooks, sampleLoans, sampleMembers, sampleReviews } from './sample-data';

export const AUTO_SEED = 'AUTO_SEED';

@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly adminAuth: AdminAuthService,
    @Inject(AUTO_SEED) private readonly autoSeed: boolean,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.adminAuth.ensureSeedAdmin(config.superAdminEmail, config.superAdminPassword);
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
      await manager.clear(Subscription);
      await manager.clear(Tenant);
      await manager.query(
        `DELETE FROM sqlite_sequence WHERE name IN ('loans', 'reviews', 'books', 'members', 'subscriptions', 'tenants')`,
      );

      const startsAt = new Date();
      const expiresAt = new Date(startsAt.getTime() + ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
      const tenant = await manager.save(
        manager.create(Tenant, {
          slug: DEFAULT_TENANT_SLUG,
          name: 'Demo College Library',
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expiresAt,
          contactEmail: 'demo@college.example',
        }),
      );
      await manager.save(
        manager.create(Subscription, {
          tenantId: tenant.id,
          status: 'active',
          source: 'offline',
          startsAt,
          expiresAt,
          stripeCheckoutSessionId: null,
          stripeCustomerId: null,
        }),
      );

      await manager.save(
        manager.create(Tenant, {
          slug: 'expired-demo',
          name: 'Expired Demo College',
          subscriptionStatus: 'expired',
          subscriptionExpiresAt: addDays(startsAt, -30),
          contactEmail: 'expired@college.example',
        }),
      );

      const now = new Date();
      const books = await manager.save(
        sampleBooks.map((book, index) => {
          const ratings = sampleReviews.filter((r) => r.book === index).map((r) => r.rating);
          return manager.create(Book, {
            ...book,
            tenantId: tenant.id,
            availableCopies: book.totalCopies,
            ...summarizeRatings(ratings),
          });
        }),
      );
      await manager.save(
        sampleReviews.map((review) =>
          manager.create(Review, {
            tenantId: tenant.id,
            book: books[review.book],
            reviewerName: review.reviewerName,
            rating: review.rating,
            comment: review.comment,
            createdAt: addDays(now, -review.daysAgo),
          }),
        ),
      );
      const members = await manager.save(
        sampleMembers.map((member) => manager.create(Member, { ...member, tenantId: tenant.id })),
      );

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
          tenantId: tenant.id,
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
        `Seeded demo tenant "${DEFAULT_TENANT_SLUG}", ${sampleBooks.length} books, ${sampleReviews.length} reviews, ${sampleMembers.length} members and ${sampleLoans.length} loans`,
      );
    }
    return seeded;
  }
}
