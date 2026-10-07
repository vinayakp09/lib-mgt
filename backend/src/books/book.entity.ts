import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Review } from './review.entity';

@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column()
  author: string;

  @Column({ unique: true })
  isbn: string;

  @Column({ default: 'General' })
  category: string;

  @Column({ type: 'integer', nullable: true })
  publishedYear: number | null;

  @Column({ type: 'integer', default: 1 })
  totalCopies: number;

  @Column({ type: 'integer', default: 1 })
  availableCopies: number;

  @Column({ type: 'varchar', nullable: true })
  coverImageUrl: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Mean of review ratings, rounded to 1 decimal; null until the first review. Maintained by BooksService. */
  @Column({ type: 'real', nullable: true })
  averageRating: number | null;

  @Column({ type: 'integer', default: 0 })
  reviewCount: number;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Loan, (loan) => loan.book)
  loans: Loan[];

  @OneToMany(() => Review, (review) => review.book)
  reviews: Review[];
}
