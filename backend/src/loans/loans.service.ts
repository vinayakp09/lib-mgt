import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, IsNull, Not, Repository } from 'typeorm';
import { Book } from '../books/book.entity';
import { Member } from '../members/member.entity';
import { CreateLoanDto } from './dto/create-loan.dto';
import { LoanQueryDto } from './dto/loan-query.dto';
import { Loan } from './loan.entity';
import { TenancyContext } from '../tenancy/tenancy.context';
import {
  DEFAULT_LOAN_DAYS,
  LoanView,
  MAX_ACTIVE_LOANS,
  addDays,
  calculateFine,
  toLoanView,
} from './loan.rules';

@Injectable()
export class LoansService {
  constructor(
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    private readonly dataSource: DataSource,
    private readonly tenancy: TenancyContext,
  ) {}

  private tenantId(): number {
    return this.tenancy.requireTenantId();
  }

  async findAll(query: LoanQueryDto = {}): Promise<LoanView[]> {
    const where: FindOptionsWhere<Loan> = { tenantId: this.tenantId() };
    if (query.memberId) where.member = { id: query.memberId };
    if (query.bookId) where.book = { id: query.bookId };
    if (query.status === 'returned') where.returnDate = Not(IsNull());
    else if (query.status) where.returnDate = IsNull();

    const now = new Date();
    const views = (await this.loans.find({ where, order: { loanDate: 'DESC', id: 'DESC' } })).map(
      (loan) => toLoanView(loan, now),
    );
    return query.status === 'overdue' ? views.filter((loan) => loan.status === 'overdue') : views;
  }

  async findOne(id: number): Promise<LoanView> {
    const loan = await this.loans.findOneBy({ id, tenantId: this.tenantId() });
    if (!loan) {
      throw new NotFoundException(`Loan #${id} not found`);
    }
    return toLoanView(loan);
  }

  async borrow(dto: CreateLoanDto): Promise<LoanView> {
    const tenantId = this.tenantId();
    const loan = await this.dataSource.transaction(async (manager) => {
      const member = await manager.findOneBy(Member, { id: dto.memberId, tenantId });
      if (!member) throw new NotFoundException(`Member #${dto.memberId} not found`);
      if (!member.active) throw new BadRequestException(`Member "${member.name}" is inactive`);

      const book = await manager.findOneBy(Book, { id: dto.bookId, tenantId });
      if (!book) throw new NotFoundException(`Book #${dto.bookId} not found`);
      if (book.availableCopies < 1) {
        throw new BadRequestException(`No copies of "${book.title}" are available`);
      }

      const activeLoans = await manager.find(Loan, {
        where: { member: { id: member.id }, returnDate: IsNull() },
      });
      if (activeLoans.length >= MAX_ACTIVE_LOANS) {
        throw new BadRequestException(`Member has reached the limit of ${MAX_ACTIVE_LOANS} active loans`);
      }
      if (activeLoans.some((existing) => existing.book.id === book.id)) {
        throw new BadRequestException(`Member already has a copy of "${book.title}"`);
      }

      book.availableCopies -= 1;
      await manager.save(book);

      const loanDate = new Date();
      return manager.save(
        manager.create(Loan, {
          tenantId,
          book,
          member,
          loanDate,
          dueDate: addDays(loanDate, dto.loanDays ?? DEFAULT_LOAN_DAYS),
          returnDate: null,
          fine: 0,
        }),
      );
    });
    return toLoanView(loan);
  }

  async returnLoan(id: number): Promise<LoanView> {
    const loan = await this.dataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(Loan, { id, tenantId: this.tenantId() });
      if (!existing) throw new NotFoundException(`Loan #${id} not found`);
      if (existing.returnDate) throw new BadRequestException(`Loan #${id} has already been returned`);

      const returnDate = new Date();
      existing.returnDate = returnDate;
      existing.fine = calculateFine(existing.dueDate, returnDate);
      existing.book.availableCopies += 1;
      await manager.save(existing.book);
      return manager.save(existing);
    });
    return toLoanView(loan);
  }
}
