-- Add per-trainer activity access + activity type visibility/team-requirement flags.

CREATE TABLE "trainer_activity_access" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_activity_access_user_id_activity_type_id_unique" UNIQUE("user_id","activity_type_id")
);
--> statement-breakpoint
ALTER TABLE "trainer_activity_access" ADD CONSTRAINT "trainer_activity_access_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trainer_activity_access" ADD CONSTRAINT "trainer_activity_access_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "activity_types" ADD COLUMN "is_default_visible" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "activity_types" ADD COLUMN "requires_team" boolean DEFAULT true NOT NULL;
--> statement-breakpoint
ALTER TABLE "performances" ALTER COLUMN "team_id" DROP NOT NULL;
--> statement-breakpoint
UPDATE "activity_types" SET "is_default_visible" = false, "requires_team" = false WHERE "name" = 'Peersv woensdagt';
