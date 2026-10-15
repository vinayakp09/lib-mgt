import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { timingSafeEqual } from 'crypto';
import { Repository } from 'typeorm';
import { config } from '../config';
import { PaymentsService } from '../payments/payments.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';
import { SuperAdminUser } from './super-admin.entity';

export interface SuperAdminLoginResponse {
  success: true;
  role: 'super_admin';
  token: string;
  expiresIn: number;
}

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(SuperAdminUser) private readonly admins: Repository<SuperAdminUser>,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: SuperAdminLoginDto): Promise<SuperAdminLoginResponse> {
    const email = dto.email.trim().toLowerCase();
    const admin = await this.admins.findOneBy({ email });
    const hash = PaymentsService.hashPassword(dto.password);
    if (
      !admin ||
      hash.length !== admin.passwordHash.length ||
      !timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(admin.passwordHash, 'hex'))
    ) {
      throw new UnauthorizedException('Invalid email or password');
    }
    const token = await this.jwt.signAsync({
      role: 'super_admin',
      principal: 'super',
      superAdminId: admin.id,
    });
    return { success: true, role: 'super_admin', token, expiresIn: config.authTokenTtlSeconds };
  }

  async ensureSeedAdmin(email: string, password: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    if (await this.admins.existsBy({ email: normalized })) {
      return;
    }
    await this.admins.save(
      this.admins.create({
        email: normalized,
        passwordHash: PaymentsService.hashPassword(password),
      }),
    );
  }
}
