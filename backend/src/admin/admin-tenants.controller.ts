import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { Roles } from '../auth/auth.constants';
import { PaymentsService } from '../payments/payments.service';
import { TenantsService } from '../tenancy/tenants.service';
import { OfflinePaymentDto } from './dto/offline-payment.dto';

@Controller('v1/admin/tenants')
@Roles('super_admin')
export class AdminTenantsController {
  constructor(
    private readonly tenants: TenantsService,
    private readonly payments: PaymentsService,
  ) {}

  @Get()
  list() {
    return this.tenants.listAll();
  }

  @Post(':id/offline-payment')
  @HttpCode(200)
  recordOffline(@Param('id', ParseIntPipe) id: number, @Body() dto: OfflinePaymentDto) {
    return this.payments.recordOfflinePayment(id, dto.years ?? 1);
  }
}
