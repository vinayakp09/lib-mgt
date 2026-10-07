import { UnauthorizedException } from '@nestjs/common';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DEFAULT_PASSWORD } from './auth.constants';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let moduleRef: TestingModule;
  let auth: AuthService;
  let jwt: JwtService;

  beforeEach(async () => {
    moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: 60 } })],
      providers: [AuthService],
    }).compile();
    auth = moduleRef.get(AuthService);
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => moduleRef.close());

  it.each(['admin', 'user'] as const)('logs in the %s role with the default password', async (role) => {
    const result = await auth.login({ role, password: DEFAULT_PASSWORD });

    expect(result).toMatchObject({ success: true, role });
    expect(result.expiresIn).toBeGreaterThan(0);
    expect(await auth.verify(result.token)).toEqual({ role });
  });

  it.each(['', '12345', '0000', ' 1234'])('rejects the wrong password %p', async (password) => {
    await expect(auth.login({ role: 'admin', password })).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('does not verify tampered, foreign or malformed tokens', async () => {
    const { token } = await auth.login({ role: 'user', password: DEFAULT_PASSWORD });
    const forged = await new JwtService({ secret: 'other-secret' }).signAsync({ role: 'admin' });

    expect(await auth.verify(`${token}x`)).toBeNull();
    expect(await auth.verify(forged)).toBeNull();
    expect(await auth.verify('not-a-token')).toBeNull();
  });

  it('does not verify a token with an unknown role', async () => {
    expect(await auth.verify(await jwt.signAsync({ role: 'superuser' }))).toBeNull();
  });

  it('does not verify an expired token', async () => {
    const expired = await jwt.signAsync({ role: 'admin' }, { expiresIn: -10 });
    expect(await auth.verify(expired)).toBeNull();
  });
});
