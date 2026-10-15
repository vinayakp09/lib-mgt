import { isSubscriptionActive, SUBSCRIPTION_EXPIRED_MESSAGE } from './subscription.rules';

describe('subscription.rules', () => {
  it('treats active tenants as subscribed through expiry end-of-day', () => {
    const expiresAt = new Date(2026, 11, 31, 10, 0, 0);
    expect(
      isSubscriptionActive(
        { subscriptionStatus: 'active', subscriptionExpiresAt: expiresAt },
        new Date(2026, 11, 31, 23, 0, 0),
      ),
    ).toBe(true);
  });

  it('marks expired status and past dates as inactive', () => {
    expect(
      isSubscriptionActive(
        { subscriptionStatus: 'expired', subscriptionExpiresAt: new Date('2026-01-01T00:00:00.000Z') },
        new Date('2026-06-01T00:00:00.000Z'),
      ),
    ).toBe(false);
    expect(SUBSCRIPTION_EXPIRED_MESSAGE).toMatch(/Subscription expired/i);
  });
});
