import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, timingSafeEqual } from 'crypto';
import { config } from '../config';
import { isSubscriptionActive, SUBSCRIPTION_EXPIRED_MESSAGE } from '../tenancy/subscription.rules';
import { TenantsService } from '../tenancy/tenants.service';
import { AuthUser, DEFAULT_PASSWORD, ROLES, Role, SUPER_ADMIN_ROLE } from './auth.constants';
import { LoginDto } from './dto/login.dto';

export interface LoginResponse {
  success: true;
  role: Role;
  tenantSlug: string;
  tenantId: number;
  subscriptionExpiresAt: string | null;
  token: string;
  expiresIn: number;
}

const digest = (value: string) => createHash('sha256').update(value).digest();

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly tenants: TenantsService,
  ) {}

  async login(dto: LoginDto): Promise<LoginResponse> {
    if (!timingSafeEqual(digest(dto.password), digest(DEFAULT_PASSWORD))) {
      throw new UnauthorizedException('Invalid tenant, role or password');
    }
    const tenant = await this.tenants.findBySlug(dto.tenantSlug);
    if (!tenant) {
      throw new UnauthorizedException('Invalid tenant, role or password');
    }
    if (!isSubscriptionActive(tenant)) {
      throw new ForbiddenException(SUBSCRIPTION_EXPIRED_MESSAGE);
    }
    const token = await this.jwt.signAsync({
      role: dto.role,
      principal: 'tenant',
      tenantId: tenant.id,
    });
    return {
      success: true,
      role: dto.role,
      tenantSlug: tenant.slug,
      tenantId: tenant.id,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
      token,
      expiresIn: config.authTokenTtlSeconds,
    };
  }

  /** Returns the user for a valid token, or null if it is missing, expired, tampered with or malformed. */
  async verify(token: string): Promise<AuthUser | null> {
    try {
      const payload = await this.jwt.verifyAsync<{
        role?: unknown;
        principal?: unknown;
        tenantId?: unknown;
        superAdminId?: unknown;
      }>(token);
      if (payload.principal === 'super' && payload.role === SUPER_ADMIN_ROLE) {
        const superAdminId = Number(payload.superAdminId);
        if (!Number.isFinite(superAdminId)) return null;
        return { role: SUPER_ADMIN_ROLE, principal: 'super', superAdminId };
      }
      if (
        payload.principal === 'tenant' &&
        ROLES.includes(payload.role as Role) &&
        typeof payload.tenantId === 'number'
      ) {
        return { role: payload.role as Role, principal: 'tenant', tenantId: payload.tenantId };
      }
      return null;
    } catch {
      return null;
    }
  }

  async assertTenantSubscriptionActive(tenantId: number): Promise<void> {
    const tenant = await this.tenants.findById(tenantId);
    if (!isSubscriptionActive(tenant)) {
      throw new ForbiddenException(SUBSCRIPTION_EXPIRED_MESSAGE);
    }
  }
}
