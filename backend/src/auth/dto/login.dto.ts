import { IsIn, IsNotEmpty, IsString, Matches, MaxLength } from 'class-validator';
import { ROLES, Role } from '../auth.constants';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(48)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  tenantSlug: string;

  @IsIn(ROLES)
  role: Role;

  @IsString()
  @IsNotEmpty()
  password: string;
}
