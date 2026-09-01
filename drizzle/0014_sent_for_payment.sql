-- Introduce 'sent' status + sent_at/sent_by tracking.
-- NOTE: ALTER TYPE ... ADD VALUE cannot run inside a transaction block.
-- Drizzle wraps migrations in a transaction; the statement-breakpoint delimiter
-- above each ADD VALUE ensures drizzle-kit commits before it. If you apply
-- this migration through a different runner that wraps the whole file in a
-- single transaction, split at the breakpoint and run manually.

ALTER TYPE "performance_status" ADD VALUE IF NOT EXISTS 'sent';
--> statement-breakpoint
ALTER TABLE "performances" ADD COLUMN "sent_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "performances" ADD COLUMN "sent_by" integer;
--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_sent_by_users_id_fk"
  FOREIGN KEY ("sent_by") REFERENCES "public"."users"("id")
  ON DELETE set null ON UPDATE no action;
