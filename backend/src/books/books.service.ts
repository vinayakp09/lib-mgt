import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, IsNull, Like, MoreThan, Repository } from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Book } from './book.entity';
import { BookListQueryDto } from './dto/book-list-query.dto';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { Review } from './review.entity';
import { summarizeRatings } from './review.rules';

export const DEFAULT_PAGE_SIZE = 10;

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export type BookDetail = Book & { reviews: Review[] };

@Injectable()
export class BooksService {
  constructor(
    @InjectRepository(Book) private readonly books: Repository<Book>,
    @InjectRepository(Loan) private readonly loans: Repository<Loan>,
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly dataSource: DataSource,
  ) {}

  async list(query: BookListQueryDto = {}): Promise<Paginated<Book>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;

    const filters: FindOptionsWhere<Book> = {};
    if (query.category) filters.category = query.category;
    if (query.availability === 'available') filters.availableCopies = MoreThan(0);
    if (query.availability === 'unavailable') filters.availableCopies = 0;

    const term = query.search?.trim();
    let where: FindOptionsWhere<Book> | FindOptionsWhere<Book>[] = filters;
    if (term) {
      const like = Like(`%${term}%`);
      // With a category filter, searching inside category could only re-match that same category.
      const fields = (['title', 'author', 'isbn', 'category'] as const).filter(
        (field) => !(field === 'category' && query.category),
      );
      where = fields.map((field) => ({ ...filters, [field]: like }));
    }

    const direction = (query.order ?? 'asc').toUpperCase() as 'ASC' | 'DESC';
    const [items, total] = await this.books.findAndCount({
      where,
      order: { [query.sort ?? 'title']: { direction, nulls: 'LAST' }, id: 'ASC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return { items, total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
  }

  async categories(): Promise<string[]> {
    const rows = await this.books
      .createQueryBuilder('book')
      .select('DISTINCT book.category', 'category')
      .orderBy('book.category', 'ASC')
      .getRawMany<{ category: string }>();
    return rows.map((row) => row.category);
  }

  async findDetail(id: number): Promise<BookDetail> {
    const book = await this.findOne(id);
    const reviews = await this.reviews.find({
      where: { book: { id } },
      order: { createdAt: 'DESC', id: 'DESC' },
    });
    return { ...book, reviews };
  }

  async addReview(id: number, dto: CreateReviewDto): Promise<BookDetail> {
    await this.dataSource.transaction(async (manager) => {
      const book = await manager.findOneBy(Book, { id });
      if (!book) throw new NotFoundException(`Book #${id} not found`);

      await manager.save(
        manager.create(Review, {
          book,
          reviewerName: dto.reviewerName.trim(),
          rating: dto.rating,
          comment: dto.comment?.trim() || null,
        }),
      );
      const ratings = await manager.find(Review, { where: { book: { id } }, select: { rating: true } });
      Object.assign(book, summarizeRatings(ratings.map((review) => review.rating)));
      await manager.save(book);
    });
    return this.findDetail(id);
  }

  findAll(search?: string): Promise<Book[]> {
    const term = search?.trim();
    if (!term) {
      return this.books.find({ order: { title: 'ASC' } });
    }
    const like = Like(`%${term}%`);
    return this.books.find({
      where: [{ title: like }, { author: like }, { isbn: like }, { category: like }],
      order: { title: 'ASC' },
    });
  }

  async findOne(id: number): Promise<Book> {
    const book = await this.books.findOneBy({ id });
    if (!book) {
      throw new NotFoundException(`Book #${id} not found`);
    }
    return book;
  }

  async create(dto: CreateBookDto): Promise<Book> {
    await this.ensureIsbnAvailable(dto.isbn);
    const book = this.books.create({ ...dto, availableCopies: dto.totalCopies });
    return this.books.save(book);
  }

  async update(id: number, dto: UpdateBookDto): Promise<Book> {
    const book = await this.findOne(id);
    if (dto.isbn && dto.isbn !== book.isbn) {
      await this.ensureIsbnAvailable(dto.isbn);
    }
    if (dto.totalCopies !== undefined) {
      const onLoan = book.totalCopies - book.availableCopies;
      if (dto.totalCopies < onLoan) {
        throw new BadRequestException(
          `Total copies cannot be less than ${onLoan} (copies currently on loan)`,
        );
      }
      book.availableCopies = dto.totalCopies - onLoan;
    }
    Object.assign(book, dto);
    return this.books.save(book);
  }

  async remove(id: number): Promise<void> {
    const book = await this.findOne(id);
    const activeLoans = await this.loans.count({ where: { book: { id }, returnDate: IsNull() } });
    if (activeLoans > 0) {
      throw new BadRequestException('Cannot delete a book that has copies on loan');
    }
    await this.books.remove(book);
  }

  private async ensureIsbnAvailable(isbn: string): Promise<void> {
    if (await this.books.existsBy({ isbn })) {
      throw new ConflictException(`A book with ISBN ${isbn} already exists`);
    }
  }
}
