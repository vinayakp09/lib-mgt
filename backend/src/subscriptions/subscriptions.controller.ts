import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { Public } from '../auth/auth.constants';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { SubscriptionsService } from './subscriptions.service';

@Controller('v1/subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptions: SubscriptionsService) {}

  @Public()
  @Post('checkout-session')
  @HttpCode(200)
  createCheckout(@Body() dto: CreateCheckoutDto) {
    return this.subscriptions.createCheckoutSession(dto);
  }
}
