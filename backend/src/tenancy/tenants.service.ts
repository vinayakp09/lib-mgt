import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ANNUAL_SUBSCRIPTION_DAYS } from './subscription.rules';
import { Tenant, TenantSubscriptionStatus } from './tenant.entity';

export interface TenantListItem {
  id: number;
  slug: string;
  name: string;
  subscriptionStatus: TenantSubscriptionStatus;
  subscriptionExpiresAt: string | null;
  contactEmail: string | null;
  createdAt: string;
}

@Injectable()
export class TenantsService {
  constructor(@InjectRepository(Tenant) private readonly tenants: Repository<Tenant>) {}

  async findBySlug(slug: string): Promise<Tenant | null> {
    return this.tenants.findOneBy({ slug: slug.trim().toLowerCase() });
  }

  async findById(id: number): Promise<Tenant> {
    const tenant = await this.tenants.findOneBy({ id });
    if (!tenant) {
      throw new NotFoundException(`Tenant #${id} not found`);
    }
    return tenant;
  }

  async listAll(): Promise<TenantListItem[]> {
    const rows = await this.tenants.find({ order: { createdAt: 'DESC', id: 'DESC' } });
    return rows.map((tenant) => this.toListItem(tenant));
  }

  async provisionCollege(input: {
    slug: string;
    name: string;
    contactEmail?: string | null;
    status?: TenantSubscriptionStatus;
    expiresAt?: Date;
  }): Promise<Tenant> {
    const slug = input.slug.trim().toLowerCase();
    if (await this.tenants.existsBy({ slug })) {
      throw new ConflictException(`Tenant slug "${slug}" is already taken`);
    }
    const expiresAt =
      input.expiresAt ??
      new Date(Date.now() + ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
    return this.tenants.save(
      this.tenants.create({
        slug,
        name: input.name.trim(),
        contactEmail: input.contactEmail?.trim().toLowerCase() ?? null,
        subscriptionStatus: input.status ?? 'active',
        subscriptionExpiresAt: expiresAt,
      }),
    );
  }

  async activateSubscription(tenantId: number, expiresAt: Date): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    tenant.subscriptionStatus = 'active';
    tenant.subscriptionExpiresAt = expiresAt;
    return this.tenants.save(tenant);
  }

  async markExpired(tenantId: number): Promise<Tenant> {
    const tenant = await this.findById(tenantId);
    tenant.subscriptionStatus = 'expired';
    return this.tenants.save(tenant);
  }

  toListItem(tenant: Tenant): TenantListItem {
    return {
      id: tenant.id,
      slug: tenant.slug,
      name: tenant.name,
      subscriptionStatus: tenant.subscriptionStatus,
      subscriptionExpiresAt: tenant.subscriptionExpiresAt?.toISOString() ?? null,
      contactEmail: tenant.contactEmail,
      createdAt: tenant.createdAt.toISOString(),
    };
  }
}
