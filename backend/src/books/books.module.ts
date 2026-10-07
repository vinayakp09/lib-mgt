import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Loan } from '../loans/loan.entity';
import { Book } from './book.entity';
import { BooksV1Controller } from './books-v1.controller';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { Review } from './review.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Book, Loan, Review])],
  controllers: [BooksController, BooksV1Controller],
  providers: [BooksService],
  exports: [BooksService],
})
export class BooksModule {}
