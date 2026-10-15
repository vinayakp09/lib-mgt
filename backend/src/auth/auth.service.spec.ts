import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_PASSWORD, DEFAULT_TENANT_SLUG } from './auth.constants';
import { AuthService } from './auth.service';
import { TenantsService } from '../tenancy/tenants.service';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;
  let jwt: JwtService;

  const activeTenant = {
    id: 1,
    slug: DEFAULT_TENANT_SLUG,
    subscriptionStatus: 'active' as const,
    subscriptionExpiresAt: new Date(Date.now() + 86400000),
  };

  const tenants = {
    findBySlug: jest.fn().mockResolvedValue(activeTenant),
    findById: jest.fn().mockResolvedValue(activeTenant),
  };

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: 60 } })],
      providers: [AuthService, { provide: TenantsService, useValue: tenants }],
    }).compile();
    auth = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => moduleRef.close());

  it.each(['admin', 'user'] as const)('logs in the %s role with the default password', async (role) => {
    const result = await auth.login({ tenantSlug: DEFAULT_TENANT_SLUG, role, password: DEFAULT_PASSWORD });

    expect(result).toMatchObject({ success: true, role, tenantSlug: DEFAULT_TENANT_SLUG, tenantId: 1 });
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(await auth.verify(result.token)).toEqual({
      role,
      principal: 'tenant',
      tenantId: 1,
    });
  });

  it('blocks login when the tenant subscription is expired', async () => {
    tenants.findBySlug.mockResolvedValueOnce({
      ...activeTenant,
      subscriptionStatus: 'expired',
      subscriptionExpiresAt: new Date(Date.now() - 86400000),
    });
    await expect(
      auth.login({ tenantSlug: DEFAULT_TENANT_SLUG, role: 'user', password: DEFAULT_PASSWORD }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it.each(['', '12345', '0000', ' 1234'])('rejects the wrong password %p', async (password) => {
    await expect(
      auth.login({ tenantSlug: DEFAULT_TENANT_SLUG, role: 'admin', password }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not verify tampered, foreign or malformed tokens', async () => {
    const { token } = await auth.login({
      tenantSlug: DEFAULT_TENANT_SLUG,
      role: 'user',
      password: DEFAULT_PASSWORD,
    });
    const forged = await new JwtService({ secret: 'other-secret' }).signAsync({ role: 'admin' });

    expect(await auth.verify(`${token}x`)).toBeNull();
    expect(await auth.verify(forged)).toBeNull();
    expect(await auth.verify('not-a-token')).toBeNull();
  });

  it('does not verify a token with an unknown role', async () => {
    expect(await auth.verify(await jwt.signAsync({ role: 'superuser', principal: 'tenant', tenantId: 1 }))).toBeNull();
  });

  it('does not verify an expired token', async () => {
    const expired = await jwt.signAsync({ role: 'admin', principal: 'tenant', tenantId: 1 }, { expiresIn: -10 });
    expect(await auth.verify(expired)).toBeNull();
  });
});
