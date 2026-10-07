import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { ROLES, Role } from '../auth.constants';

export class LoginDto {
  @IsIn(ROLES)
  role: Role;

  @IsString()
  @IsNotEmpty()
  password: string;
}
