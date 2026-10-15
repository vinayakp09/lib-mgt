import { Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import { Public } from '../auth/auth.constants';
import { PaymentsService } from './payments.service';

@Controller('v1/payments/stripe')
export class StripeWebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(@Req() req: { rawBody?: Buffer; body?: unknown }, @Headers('stripe-signature') signature?: string) {
    const rawBody = req.rawBody ?? Buffer.from(JSON.stringify(req.body ?? {}));
    await this.payments.handleStripeWebhook(rawBody, signature);
    return { received: true };
  }
}
