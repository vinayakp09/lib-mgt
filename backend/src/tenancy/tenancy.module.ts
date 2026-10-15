import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from './tenant.entity';
import { TenancyContext } from './tenancy.context';
import { TenantsService } from './tenants.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Tenant])],
  providers: [TenancyContext, TenantsService],
  exports: [TenancyContext, TenantsService, TypeOrmModule],
})
export class TenancyModule {}
