import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { config } from '../config';
import { PaymentsModule } from '../payments/payments.module';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminTenantsController } from './admin-tenants.controller';
import { SuperAdminUser } from './super-admin.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([SuperAdminUser]),
    PaymentsModule,
    JwtModule.register({
      secret: config.authSecret,
      signOptions: { expiresIn: config.authTokenTtlSeconds },
    }),
  ],
  controllers: [AdminAuthController, AdminTenantsController],
  providers: [AdminAuthService],
  exports: [AdminAuthService],
})
export class AdminModule {}
