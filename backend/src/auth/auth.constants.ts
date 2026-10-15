import { SetMetadata } from '@nestjs/common';

export const ROLES = ['admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

export const SUPER_ADMIN_ROLE = 'super_admin' as const;
export type SuperAdminRole = typeof SUPER_ADMIN_ROLE;

/** REQ-105: every college role signs in with this static default password. */
export const DEFAULT_PASSWORD = '1234';

export type AuthPrincipal = 'tenant' | 'super';

export interface AuthUser {
  role: Role | SuperAdminRole;
  principal: AuthPrincipal;
  tenantId?: number;
  superAdminId?: number;
}

/** Default demo tenant slug seeded for local development and tests. */
export const DEFAULT_TENANT_SLUG = 'demo';

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Skips authentication for a route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

type RouteRole = Role | SuperAdminRole;

/** Restricts a route or controller to the given roles (any authenticated role if omitted). */
export const Roles = (...roles: RouteRole[]) => SetMetadata(ROLES_KEY, roles);
