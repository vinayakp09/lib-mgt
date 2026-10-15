import { IsEmail, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';

export class CreateCheckoutDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  collegeName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(48)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'slug must be lowercase letters, numbers and hyphens',
  })
  slug: string;

  @IsEmail()
  @MaxLength(120)
  contactEmail: string;
}
