import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { AuthUser } from '../auth/auth.constants';
import { AuthenticatedRequest } from '../auth/auth.guard';
import { TenancyContext } from './tenancy.context';

@Injectable()
export class TenancyInterceptor implements NestInterceptor {
  constructor(private readonly tenancy: TenancyContext) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user as AuthUser | undefined;
    if (user?.principal === 'tenant' && user.tenantId != null) {
      return new Observable((subscriber) => {
        this.tenancy.run(user.tenantId!, () => {
          next.handle().subscribe(subscriber);
        });
      });
    }
    return next.handle();
  }
}
