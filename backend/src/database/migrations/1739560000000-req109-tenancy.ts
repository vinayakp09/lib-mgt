import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * REQ-109: additive multi-tenancy schema (also applied via synchronize in dev/tests).
 * Reversible steps drop new tables only — never drop legacy columns in the same release.
 */
export class Req109Tenancy1739560000000 implements MigrationInterface {
  name = 'Req109Tenancy1739560000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tenants" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "slug" varchar NOT NULL,
        "name" varchar NOT NULL,
        "subscriptionStatus" varchar NOT NULL DEFAULT 'pending',
        "subscriptionExpiresAt" datetime,
        "contactEmail" varchar,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "subscriptions" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "tenantId" integer NOT NULL,
        "status" varchar NOT NULL,
        "source" varchar NOT NULL,
        "startsAt" datetime NOT NULL,
        "expiresAt" datetime NOT NULL,
        "stripeCheckoutSessionId" varchar,
        "stripeCustomerId" varchar,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "FK_subscriptions_tenant" FOREIGN KEY ("tenantId") REFERENCES "tenants" ("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "super_admin_users" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "email" varchar NOT NULL,
        "passwordHash" varchar NOT NULL,
        "createdAt" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "UQ_super_admin_email" UNIQUE ("email")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "subscriptions"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "super_admin_users"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tenants"`);
  }
}
