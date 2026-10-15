import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentsService } from '../payments/payments.service';
import { ANNUAL_SUBSCRIPTION_DAYS } from '../tenancy/subscription.rules';
import { TenantsService } from '../tenancy/tenants.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Subscription } from './subscription.entity';

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
    private readonly tenants: TenantsService,
    private readonly payments: PaymentsService,
  ) {}

  async createCheckoutSession(dto: CreateCheckoutDto): Promise<{ url: string; sessionId: string }> {
    return this.payments.createCollegeCheckoutSession(dto);
  }

  async recordSubscription(input: {
    tenantId: number;
    source: 'stripe' | 'offline';
    startsAt: Date;
    expiresAt: Date;
    stripeCheckoutSessionId?: string | null;
    stripeCustomerId?: string | null;
  }): Promise<Subscription> {
    await this.tenants.activateSubscription(input.tenantId, input.expiresAt);
    return this.subscriptions.save(
      this.subscriptions.create({
        tenantId: input.tenantId,
        status: 'active',
        source: input.source,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
        stripeCustomerId: input.stripeCustomerId ?? null,
      }),
    );
  }

  annualExpiryFrom(start: Date = new Date()): Date {
    return new Date(start.getTime() + ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  }
}
