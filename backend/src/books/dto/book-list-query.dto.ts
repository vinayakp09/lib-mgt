import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export const BOOK_SORT_FIELDS = ['title', 'author', 'publishedYear', 'averageRating', 'createdAt'] as const;
export type BookSortField = (typeof BOOK_SORT_FIELDS)[number];

export class BookListQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsIn(['available', 'unavailable'])
  availability?: 'available' | 'unavailable';

  @IsOptional()
  @IsIn(BOOK_SORT_FIELDS)
  sort?: BookSortField;

  @IsOptional()
  @IsIn(['asc', 'desc'])
  order?: 'asc' | 'desc';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  pageSize?: number;
}
