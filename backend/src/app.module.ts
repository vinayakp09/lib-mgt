import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { AdminModule } from './admin/admin.module';
import { SuperAdminUser } from './admin/super-admin.entity';
import { AuthModule } from './auth/auth.module';
import { Book } from './books/book.entity';
import { BooksModule } from './books/books.module';
import { Review } from './books/review.entity';
import { config } from './config';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { Loan } from './loans/loan.entity';
import { LoansModule } from './loans/loans.module';
import { Member } from './members/member.entity';
import { MembersModule } from './members/members.module';
import { PaymentsModule } from './payments/payments.module';
import { Subscription } from './subscriptions/subscription.entity';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { Tenant } from './tenancy/tenant.entity';
import { TenancyModule } from './tenancy/tenancy.module';

export interface AppOptions {
  dbPath: string;
  serveFrontend: boolean;
  autoSeed: boolean;
}

export const entities = [Tenant, Subscription, SuperAdminUser, Book, Review, Member, Loan];

@Module({})
export class AppModule {
  static register(overrides: Partial<AppOptions> = {}): DynamicModule {
    const options: AppOptions = {
      dbPath: config.dbPath,
      serveFrontend: true,
      autoSeed: config.autoSeed,
      ...overrides,
    };

    if (options.dbPath !== ':memory:') {
      mkdirSync(dirname(options.dbPath), { recursive: true });
    }

    const imports: DynamicModule['imports'] = [
      TypeOrmModule.forRoot({
        type: 'better-sqlite3',
        database: options.dbPath,
        entities,
        synchronize: true,
      }),
      TenancyModule,
      AuthModule,
      AdminModule,
      SubscriptionsModule,
      PaymentsModule,
      BooksModule,
      MembersModule,
      LoansModule,
      DashboardModule,
      DatabaseModule.register(options.autoSeed),
    ];

    if (options.serveFrontend && existsSync(config.frontendDist)) {
      imports.push(
        ServeStaticModule.forRoot({
          rootPath: config.frontendDist,
          exclude: ['/api/(.*)'],
        }),
      );
    }

    return { module: AppModule, imports };
  }
}
