import { Tenant } from './tenant.entity';

/** Subscription is active through the end of the expiry calendar day. */
export function isSubscriptionActive(
  tenant: Pick<Tenant, 'subscriptionStatus' | 'subscriptionExpiresAt'>,
  at: Date = new Date(),
): boolean {
  if (tenant.subscriptionStatus !== 'active' || !tenant.subscriptionExpiresAt) {
    return false;
  }
  const end = new Date(tenant.subscriptionExpiresAt);
  end.setHours(23, 59, 59, 999);
  return at.getTime() <= end.getTime();
}

export const SUBSCRIPTION_EXPIRED_MESSAGE =
  'Subscription expired. Please contact your administrator to renew.';

export const ANNUAL_SUBSCRIPTION_DAYS = 365;
