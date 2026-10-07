import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { BooksService } from './books.service';
import { BookListQueryDto } from './dto/book-list-query.dto';
import { CreateReviewDto } from './dto/create-review.dto';

/** Paginated catalogue, book details with reviews, and reviews. Create/update/delete stay on /api/books. */
@Controller('v1/books')
export class BooksV1Controller {
  constructor(private readonly booksService: BooksService) {}

  @Get()
  list(@Query() query: BookListQueryDto) {
    return this.booksService.list(query);
  }

  @Get('categories')
  categories() {
    return this.booksService.categories();
  }

  @Get(':id')
  findDetail(@Param('id', ParseIntPipe) id: number) {
    return this.booksService.findDetail(id);
  }

  @Post(':id/reviews')
  addReview(@Param('id', ParseIntPipe) id: number, @Body() dto: CreateReviewDto) {
    return this.booksService.addReview(id, dto);
  }
}
