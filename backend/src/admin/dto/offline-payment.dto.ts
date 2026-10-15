import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class OfflinePaymentDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  years?: number;
}
