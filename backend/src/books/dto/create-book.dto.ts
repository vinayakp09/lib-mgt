import { IsInt, IsNotEmpty, IsOptional, IsString, IsUrl, Length, Max, MaxLength, Min } from 'class-validator';

export class CreateBookDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  author: string;

  @IsString()
  @Length(10, 17)
  isbn: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2100)
  publishedYear?: number | null;

  @IsInt()
  @Min(1)
  @Max(1000)
  totalCopies: number;

  @IsOptional()
  @IsUrl({ protocols: ['http', 'https'], require_protocol: true })
  @MaxLength(500)
  coverImageUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string | null;
}
