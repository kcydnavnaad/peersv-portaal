-- Introduce activity_types + trainer_rate_overrides, replace performances.type enum with FK.

CREATE TABLE "activity_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "activity_types_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "trainer_rate_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"activity_type_id" integer NOT NULL,
	"rate" numeric(10, 2) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "trainer_rate_overrides_user_id_activity_type_id_unique" UNIQUE("user_id","activity_type_id")
);
--> statement-breakpoint
ALTER TABLE "trainer_rate_overrides" ADD CONSTRAINT "trainer_rate_overrides_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "trainer_rate_overrides" ADD CONSTRAINT "trainer_rate_overrides_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
INSERT INTO "activity_types" ("id", "name", "is_default") VALUES
	(1, 'Training', true),
	(2, 'Wedstrijd', false),
	(3, 'Toernooi', false),
	(4, 'Peersv woensdagt', false);
--> statement-breakpoint
SELECT setval('activity_types_id_seq', 4);
--> statement-breakpoint
ALTER TABLE "performances" ADD COLUMN "activity_type_id" integer;
--> statement-breakpoint
UPDATE "performances" SET "activity_type_id" = 1 WHERE "type" = 'training';
--> statement-breakpoint
UPDATE "performances" SET "activity_type_id" = 2 WHERE "type" = 'match';
--> statement-breakpoint
UPDATE "performances" SET "activity_type_id" = 3 WHERE "type" = 'tournament';
--> statement-breakpoint
ALTER TABLE "performances" ALTER COLUMN "activity_type_id" SET NOT NULL;
--> statement-breakpoint
ALTER TABLE "performances" ADD CONSTRAINT "performances_activity_type_id_activity_types_id_fk" FOREIGN KEY ("activity_type_id") REFERENCES "public"."activity_types"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "performances" DROP COLUMN "type";
--> statement-breakpoint
DROP TYPE "performance_type";
