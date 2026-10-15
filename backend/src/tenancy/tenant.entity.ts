import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { Subscription } from '../subscriptions/subscription.entity';

export type TenantSubscriptionStatus = 'pending' | 'active' | 'expired';

@Entity('tenants')
export class Tenant {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  slug: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', default: 'pending' })
  subscriptionStatus: TenantSubscriptionStatus;

  @Column({ type: 'datetime', nullable: true })
  subscriptionExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true })
  contactEmail: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => Subscription, (subscription) => subscription.tenant)
  subscriptions: Subscription[];
}
