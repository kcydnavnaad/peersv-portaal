CREATE TABLE "attendances" (
	"id" serial PRIMARY KEY NOT NULL,
	"performance_id" integer NOT NULL,
	"member_id" integer NOT NULL,
	"present" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "attendances_performance_member_unique" UNIQUE("performance_id","member_id")
);
--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_performance_id_performances_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendances" ADD CONSTRAINT "attendances_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;