import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Book } from '../books/book.entity';
import { Loan } from '../loans/loan.entity';
import { LoanView, loanStatus, toLoanView } from '../loans/loan.rules';
import { Member } from '../members/member.entity';
import { TenancyContext } from '../tenancy/tenancy.context';

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
  recentLoans: LoanView[];
  topBooks: TopBook[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Member) private readonly members: Repository<Member>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    private readonly tenancy: TenancyContext,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const tenantId = this.tenancy.requireTenantId();
    const now = new Date();
    const [totalTitles, copies, totalMembers, activeMembers, outstanding, recent, topBooks] =
      await Promise.all([
        this.books.countBy({ tenantId }),
        this.books
          .createQueryBuilder('b')
          .select('COALESCE(SUM(b.totalCopies), 0)', 'total')
          .addSelect('COALESCE(SUM(b.availableCopies), 0)', 'available')
          .where('b.tenantId = :tenantId', { tenantId })
          .getRawOne<{ total: number; available: number }>(),
        this.members.countBy({ tenantId }),
        this.members.countBy({ tenantId, active: true }),
        this.loans.find({ where: { tenantId, returnDate: IsNull() } }),
        this.loans.find({ where: { tenantId }, order: { loanDate: 'DESC', id: 'DESC' }, take: 5 }),
        this.loans
          .createQueryBuilder('l')
          .innerJoin('l.book', 'b')
          .select('b.id', 'id')
          .addSelect('b.title', 'title')
          .addSelect('b.author', 'author')
          .addSelect('COUNT(l.id)', 'loanCount')
          .where('l.tenantId = :tenantId', { tenantId })
          .groupBy('b.id')
          .orderBy('COUNT(l.id)', 'DESC')
          .addOrderBy('b.title', 'ASC')
          .limit(5)
          .getRawMany<TopBook>(),
      ]);

    return {
      totalTitles,
      totalCopies: Number(copies?.total ?? 0),
      availableCopies: Number(copies?.available ?? 0),
      totalMembers,
      activeMembers,
      activeLoans: outstanding.length,
      overdueLoans: outstanding.filter((loan) => loanStatus(loan, now) === 'overdue').length,
      recentLoans: recent.map((loan) => toLoanView(loan, now)),
      topBooks: topBooks.map((book) => ({ ...book, loanCount: Number(book.loanCount) })),
    };
  }
}
