import { DynamicModule, Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { AuthModule } from './auth/auth.module';
import { Book } from './books/book.entity';
import { BooksModule } from './books/books.module';
import { config } from './config';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { Loan } from './loans/loan.entity';
import { LoansModule } from './loans/loans.module';
import { Member } from './members/member.entity';
import { MembersModule } from './members/members.module';

export interface AppOptions {
  dbPath: string;
  serveFrontend: boolean;
  autoSeed: boolean;
}

export const entities = [Book, Member, Loan];

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
      AuthModule,
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
