import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { Loan } from '../loans/loan.entity';
import { Tenant } from '../tenancy/tenant.entity';

@Entity('members')
@Unique(['tenantId', 'email'])
export class Member {
  @Column()
  tenantId: number;

  @ManyToOne(() => Tenant, { onDelete: 'CASCADE' })
  tenant: Tenant;

  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  email: string;

  @Column({ type: 'varchar', nullable: true })
  phone: string | null;

  @Column({ default: true })
  active: boolean;

  @CreateDateColumn()
  joinedAt: Date;

  @OneToMany(() => Loan, (loan) => loan.member)
  loans: Loan[];
}
