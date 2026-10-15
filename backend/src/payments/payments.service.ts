import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { Repository } from 'typeorm';
import { config } from '../config';
import { CreateCheckoutDto } from '../subscriptions/dto/create-checkout.dto';
import { ANNUAL_SUBSCRIPTION_DAYS } from '../tenancy/subscription.rules';
import { TenantsService } from '../tenancy/tenants.service';
import { Subscription } from '../subscriptions/subscription.entity';

export interface CheckoutMetadata {
  collegeName: string;
  slug: string;
  contactEmail: string;
}

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly tenants: TenantsService,
    @InjectRepository(Subscription) private readonly subscriptions: Repository<Subscription>,
  ) {}

  async createCollegeCheckoutSession(dto: CreateCheckoutDto): Promise<{ url: string; sessionId: string }> {
    const slug = dto.slug.trim().toLowerCase();
    const existing = await this.tenants.findBySlug(slug);
    if (existing && existing.subscriptionStatus === 'active') {
      throw new BadRequestException(`College "${slug}" already has an active subscription`);
    }

    if (!config.stripeSecretKey) {
      const sessionId = `cs_test_mock_${slug}_${Date.now()}`;
      return {
        sessionId,
        url: `${config.appPublicUrl}/subscribe/complete?session_id=${encodeURIComponent(sessionId)}`,
      };
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(config.stripeSecretKey);
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: `${config.appPublicUrl}/subscribe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.appPublicUrl}/subscribe`,
      customer_email: dto.contactEmail,
      line_items: [{ price: config.stripePriceId, quantity: 1 }],
      metadata: {
        collegeName: dto.collegeName,
        slug,
        contactEmail: dto.contactEmail,
      },
    });
    if (!session.url) {
      throw new BadRequestException('Stripe did not return a checkout URL');
    }
    return { url: session.url, sessionId: session.id };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined): Promise<void> {
    if (!config.stripeWebhookSecret) {
      await this.handleTestWebhookPayload(rawBody);
      return;
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(config.stripeSecretKey!);
    let event: { type: string; data: { object: Record<string, unknown> } };
    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        signature ?? '',
        config.stripeWebhookSecret,
      ) as unknown as {
        type: string;
        data: { object: Record<string, unknown> };
      };
    } catch (err) {
      this.logger.warn(`Stripe webhook signature verification failed: ${String(err)}`);
      throw new BadRequestException('Invalid Stripe webhook signature');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string;
        metadata: Record<string, string> | null;
        customer?: string | { id?: string } | null;
      };
      await this.provisionTenantFromCheckoutSession({
        sessionId: session.id,
        metadata: session.metadata as Record<string, string> | null,
        customerId:
          typeof session.customer === 'string'
            ? session.customer
            : session.customer && typeof session.customer === 'object'
              ? (session.customer.id ?? null)
              : null,
      });
    }
  }

  private async handleTestWebhookPayload(rawBody: Buffer): Promise<void> {
    const payload = JSON.parse(rawBody.toString('utf8')) as {
      type?: string;
      data?: { object?: { id?: string; metadata?: CheckoutMetadata } };
    };
    if (payload.type !== 'checkout.session.completed') {
      return;
    }
    const session = payload.data?.object;
    if (!session?.id || !session.metadata) {
      throw new BadRequestException('Invalid test webhook payload');
    }
    await this.provisionTenantFromCheckoutSession({
      sessionId: session.id,
      metadata: session.metadata as unknown as Record<string, string>,
      customerId: null,
    });
  }

  async provisionTenantFromCheckoutSession(input: {
    sessionId: string;
    metadata: Record<string, string> | null;
    customerId: string | null;
  }): Promise<void> {
    const meta = input.metadata ?? {};
    const slug = (meta.slug ?? '').trim().toLowerCase();
    const collegeName = (meta.collegeName ?? '').trim();
    const contactEmail = (meta.contactEmail ?? '').trim().toLowerCase();
    if (!slug || !collegeName) {
      throw new BadRequestException('Checkout metadata is missing college slug or name');
    }

    const duplicate = await this.subscriptions.findOneBy({ stripeCheckoutSessionId: input.sessionId });
    if (duplicate) {
      return;
    }

    let tenant = await this.tenants.findBySlug(slug);
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
    if (!tenant) {
      tenant = await this.tenants.provisionCollege({
        slug,
        name: collegeName,
        contactEmail,
        status: 'active',
        expiresAt,
      });
    } else {
      tenant = await this.tenants.activateSubscription(tenant.id, expiresAt);
    }

    await this.subscriptions.save(
      this.subscriptions.create({
        tenantId: tenant.id,
        status: 'active',
        source: 'stripe',
        startsAt,
        expiresAt,
        stripeCheckoutSessionId: input.sessionId,
        stripeCustomerId: input.customerId,
      }),
    );
  }

  async recordOfflinePayment(tenantId: number, years = 1): Promise<{ tenantId: number; expiresAt: string }> {
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + years * ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
    await this.tenants.activateSubscription(tenantId, expiresAt);
    await this.subscriptions.save(
      this.subscriptions.create({
        tenantId,
        status: 'active',
        source: 'offline',
        startsAt,
        expiresAt,
        stripeCheckoutSessionId: null,
        stripeCustomerId: null,
      }),
    );
    return { tenantId, expiresAt: expiresAt.toISOString() };
  }

  static hashPassword(password: string): string {
    return createHash('sha256').update(password).digest('hex');
  }
}
