import { DynamicModule, Module } from '@nestjs/common';
import { AdminModule } from '../admin/admin.module';
import { AUTO_SEED, SeedService } from './seed.service';

@Module({})
export class DatabaseModule {
  static register(autoSeed: boolean): DynamicModule {
    return {
      module: DatabaseModule,
      imports: [AdminModule],
      providers: [{ provide: AUTO_SEED, useValue: autoSeed }, SeedService],
      exports: [SeedService],
    };
  }
}
