CREATE TABLE "auth_events" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"email" varchar(255) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_events" ADD CONSTRAINT "auth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "auth_events_email_created_idx" ON "auth_events" ("email", "created_at" DESC);
--> statement-breakpoint
CREATE INDEX "auth_events_user_created_idx" ON "auth_events" ("user_id", "created_at" DESC) WHERE "user_id" IS NOT NULL;