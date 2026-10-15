import { Module } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { config } from '../config';
import { TenancyInterceptor } from '../tenancy/tenancy.interceptor';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';

@Module({
  imports: [
    JwtModule.register({
      secret: config.authSecret,
      signOptions: { expiresIn: config.authTokenTtlSeconds },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    { provide: APP_GUARD, useClass: AuthGuard },
    { provide: APP_INTERCEPTOR, useClass: TenancyInterceptor },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
