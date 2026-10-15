import { Column, CreateDateColumn, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Tenant } from '../tenancy/tenant.entity';

export type SubscriptionSource = 'stripe' | 'offline';

@Entity('subscriptions')
export class Subscription {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant, (tenant) => tenant.subscriptions, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @Column({ type: 'varchar' })
  status: 'active' | 'expired' | 'pending';

  @Column({ type: 'varchar' })
  source: SubscriptionSource;

  @Column({ type: 'datetime' })
  startsAt: Date;

  @Column({ type: 'datetime' })
  expiresAt: Date;

  @Column({ type: 'varchar', nullable: true })
  stripeCheckoutSessionId: string | null;

  @Column({ type: 'varchar', nullable: true })
  stripeCustomerId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}
