import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/auth.constants';
import { AdminAuthService } from './admin-auth.service';
import { SuperAdminLoginDto } from './dto/super-admin-login.dto';

@Controller('v1/super-admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuth: AdminAuthService) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: SuperAdminLoginDto) {
    return this.adminAuth.login(dto);
  }
}
