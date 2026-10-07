import { SetMetadata } from '@nestjs/common';

export const ROLES = ['admin', 'user'] as const;
export type Role = (typeof ROLES)[number];

/** REQ-105: every role signs in with this static default password. */
export const DEFAULT_PASSWORD = '1234';

export interface AuthUser {
  role: Role;
}

export const IS_PUBLIC_KEY = 'isPublic';
export const ROLES_KEY = 'roles';

/** Skips authentication for a route or controller. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

/** Restricts a route or controller to the given roles (any authenticated role if omitted). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
