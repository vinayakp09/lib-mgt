import { ForbiddenException, Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

@Injectable()
export class TenancyContext {
  private readonly storage = new AsyncLocalStorage<number>();

  run<T>(tenantId: number, fn: () => T): T {
    return this.storage.run(tenantId, fn);
  }

  getTenantId(): number | undefined {
    return this.storage.getStore();
  }

  requireTenantId(): number {
    const tenantId = this.getTenantId();
    if (tenantId == null) {
      throw new ForbiddenException('Tenant context is required');
    }
    return tenantId;
  }
}
