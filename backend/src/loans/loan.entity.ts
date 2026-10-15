import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Book } from '../books/book.entity';
import { Member } from '../members/member.entity';
import { Tenant } from '../tenancy/tenant.entity';

@Entity('loans')
export class Loan {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @ManyToOne(() => Book, (book) => book.loans, { eager: true, nullable: false, onDelete: 'CASCADE' })
  book: Book;

  @ManyToOne(() => Member, (member) => member.loans, { eager: true, nullable: false, onDelete: 'CASCADE' })
  member: Member;

  @Column({ type: 'datetime' })
  loanDate: Date;

  @Column({ type: 'datetime' })
  dueDate: Date;

  @Column({ type: 'datetime', nullable: true })
  returnDate: Date | null;

  @Column({ type: 'real', default: 0 })
  fine: number;
}
