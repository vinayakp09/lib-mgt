import { randomBytes } from 'crypto';
import { resolve } from 'path';

// Works from both `src/` (ts-node / jest) and `dist/` (compiled): both are one level below backend/.
const projectRoot = resolve(__dirname, '..', '..');

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  dbPath: process.env.DB_PATH ?? resolve(projectRoot, 'database', 'library.sqlite'),
  frontendDist: resolve(projectRoot, 'frontend', 'dist'),
  autoSeed: process.env.AUTO_SEED !== 'false',
  // Without AUTH_SECRET a random secret is used, so sessions end when the server restarts.
  authSecret: process.env.AUTH_SECRET ?? randomBytes(32).toString('hex'),
  authTokenTtlSeconds: 8 * 60 * 60,
  appPublicUrl: process.env.APP_PUBLIC_URL ?? 'http://localhost:3000',
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? '',
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? '',
  stripePriceId: process.env.STRIPE_PRICE_ID ?? '',
  superAdminEmail: process.env.SUPER_ADMIN_EMAIL ?? 'super@library.local',
  superAdminPassword: process.env.SUPER_ADMIN_PASSWORD ?? 'super-admin-pass',
};
