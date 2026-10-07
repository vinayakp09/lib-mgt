import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { config } from '../config';
import { AuthUser, DEFAULT_PASSWORD, ROLES, Role } from './auth.constants';
import { LoginDto } from './dto/login.dto';

export interface LoginResponse {
  success: true;
  role: Role;
  token: string;
  expiresIn: number;
}

const digest = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  async login({ role, password }: LoginDto): Promise<LoginResponse> {
    if (!timingSafeEqual(digest(password), digest(DEFAULT_PASSWORD))) {
      throw new UnauthorizedException('Invalid role or password');
    }
    const token = await this.jwt.signAsync({ role });
    return { success: true, role, token, expiresIn: config.authTokenTtlSeconds };
  }

  /** Returns the user for a valid token, or null if it is missing, expired, tampered with or malformed. */
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<{ role?: unknown }>(token);
      return ROLES.includes(payload.role as Role) ? { role: payload.role as Role } : null;
    } catch {
      return null;
    }
  }
}
