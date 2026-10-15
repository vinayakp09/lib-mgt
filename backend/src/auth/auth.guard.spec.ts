import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { TenantsService } from '../tenancy/tenants.service';
import { DEFAULT_PASSWORD, DEFAULT_TENANT_SLUG, Public, Role, Roles } from './auth.constants';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { AuthService } from './auth.service';

class TestController {
  open() {}
  anyRole() {}
  adminOnly() {}
}
Public()(TestController.prototype.open);
Roles('admin')(TestController.prototype.adminOnly);

function contextFor(handler: () => void, authorization?: string) {
  const request = { headers: { authorization } } as AuthenticatedRequest;
  const context = {
    getHandler: () => handler,
    getClass: () => TestController,
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
  return { context, request };
}

describe('AuthGuard', () => {
  let moduleRef: TestingModule;
  let guard: AuthGuard;
  let auth: AuthService;

  const tenants = {
    findBySlug: jest.fn(),
    findById: jest.fn().mockResolvedValue({
      id: 1,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 86400000),
    }),
  };

  const bearer = async (role: Role) =>
    `Bearer ${(
      await auth.login({ tenantSlug: DEFAULT_TENANT_SLUG, role, password: DEFAULT_PASSWORD })
    ).token}`;

  beforeEach(async () => {
    tenants.findBySlug.mockResolvedValue({
      id: 1,
      slug: DEFAULT_TENANT_SLUG,
      subscriptionStatus: 'active',
      subscriptionExpiresAt: new Date(Date.now() + 86400000),
    });
    moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret' })],
      providers: [AuthService, AuthGuard, Reflector, { provide: TenantsService, useValue: tenants }],
    }).compile();
    guard = moduleRef.get(AuthGuard);
    auth = moduleRef.get(AuthService);
  });

  afterEach(() => moduleRef.close());

  it('allows @Public() routes without a token', async () => {
    await expect(guard.canActivate(contextFor(TestController.prototype.open).context)).resolves.toBe(true);
  });

  it.each([undefined, 'Bearer', 'Bearer not-a-token', 'Basic abc'])(
    'rejects a protected route with authorization header %p',
    async (header) => {
      const { context } = contextFor(TestController.prototype.anyRole, header);
      await expect(guard.canActivate(context)).rejects.toBeInstanceOf(UnauthorizedException);
    },
  );

  it.each(['admin', 'user'] as const)('lets the %s role into routes without @Roles and attaches the user', async (role) => {
    const { context, request } = contextFor(TestController.prototype.anyRole, await bearer(role));
    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.user).toEqual({ role, principal: 'tenant', tenantId: 1 });
  });

  it('lets admins into admin-only routes', async () => {
    const { context } = contextFor(TestController.prototype.adminOnly, await bearer('admin'));
    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it('forbids users from admin-only routes', async () => {
    const { context } = contextFor(TestController.prototype.adminOnly, await bearer('user'));
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
