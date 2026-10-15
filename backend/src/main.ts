import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { existsSync } from 'fs';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';
import { config } from './config';

async function bootstrap() {
  const app = configureApp(await NestFactory.create(AppModule.register(), { rawBody: true }));
  await app.listen(config.port);

  const logger = new Logger('Bootstrap');
  logger.log(`API:      http://localhost:${config.port}/api`);
  logger.log(`Database: ${config.dbPath}`);
  if (existsSync(config.frontendDist)) {
    logger.log(`Web app:  http://localhost:${config.port}`);
  } else {
    logger.log('Frontend not built - run "npm run dev" at the repo root for the Vite dev server');
  }
}

bootstrap();
