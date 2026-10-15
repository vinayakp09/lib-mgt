import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthUser, IS_PUBLIC_KEY, ROLES_KEY, Role, SUPER_ADMIN_ROLE } from './auth.constants';
import { AuthService } from './auth.service';

export type AuthenticatedRequest = Request & { user?: AuthUser };

type AllowedRole = Role | typeof SUPER_ADMIN_ROLE;

/** Global guard: every route needs a valid Bearer token unless marked @Public(); @Roles() narrows access further. */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const [scheme, token] = request.headers.authorization?.split(' ') ?? [];
    const user = scheme === 'Bearer' && token ? await this.auth.verify(token) : null;
    if (!user) {
      throw new UnauthorizedException('Login required');
    }
    request.user = user;

    if (user.principal === 'tenant' && user.tenantId != null) {
      await this.auth.assertTenantSubscriptionActive(user.tenantId);
    }

    const roles = this.reflector.getAllAndOverride<AllowedRole[] | undefined>(ROLES_KEY, targets);
    const superAdminRoute = roles?.includes(SUPER_ADMIN_ROLE) ?? false;
    if (user.principal === 'super' && !superAdminRoute) {
      throw new ForbiddenException('Super Admin cannot access college library routes');
    }
    if (user.principal === 'tenant' && superAdminRoute) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
    if (roles?.length && !roles.includes(user.role as AllowedRole)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }

    return true;
  }
}
