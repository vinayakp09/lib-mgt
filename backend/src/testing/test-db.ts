import { Provider } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { entities } from '../app.module';
import { ANNUAL_SUBSCRIPTION_DAYS } from '../tenancy/subscription.rules';
import { Tenant } from '../tenancy/tenant.entity';
import { TenancyContext } from '../tenancy/tenancy.context';

export function createTestingModule(providers: Provider[]): Promise<TestingModule> {
  let tenantId = 1;
  return Test.createTestingModule({
    imports: [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: ':memory:',
        entities,
        synchronize: true,
      }),
      TypeOrmModule.forFeature(entities),
    ],
    providers: [
      ...providers,
      {
        provide: TenancyContext,
        useValue: {
          requireTenantId: () => tenantId,
          getTenantId: () => tenantId,
          run: <T>(_id: number, fn: () => T) => fn(),
        },
      },
    ],
  })
    .compile()
    .then(async (moduleRef) => {
      tenantId = await seedTestTenant(moduleRef);
      return moduleRef;
    });
}

export async function seedTestTenant(moduleRef: TestingModule): Promise<number> {
  const tenants = moduleRef.get<Repository<Tenant>>(getRepositoryToken(Tenant));
  const expiresAt = new Date(Date.now() + ANNUAL_SUBSCRIPTION_DAYS * 24 * 60 * 60 * 1000);
  const tenant = await tenants.save(
    tenants.create({
      slug: 'test',
      name: 'Test College',
      subscriptionStatus: 'active',
      subscriptionExpiresAt: expiresAt,
    }),
  );
  return tenant.id;
}
