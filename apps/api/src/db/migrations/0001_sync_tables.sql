CREATE SEQUENCE "public"."sync_version_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1 CACHE 1;--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL,
	"deleted_at" timestamp with time zone,
	"effective_from" date NOT NULL,
	"daily_goal_ml" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"activity_level" text NOT NULL,
	"quick_amounts_ml" integer[] NOT NULL,
	"weight_tracking_enabled" boolean NOT NULL,
	"weight_consent_at" timestamp with time zone,
	"weight_consent_policy_version" text,
	"weight_consent_updated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL,
	"deleted_at" timestamp with time zone,
	"amount_ml" integer NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "weight_entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"server_version" bigint DEFAULT nextval('sync_version_seq') NOT NULL,
	"deleted_at" timestamp with time zone,
	"weight_grams" integer NOT NULL,
	"measured_at" timestamp with time zone NOT NULL,
	"local_date" date NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD CONSTRAINT "goals_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "weight_entries" ADD CONSTRAINT "weight_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goals_user_id_server_version_idx" ON "goals" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE UNIQUE INDEX "goals_user_id_effective_from_idx" ON "goals" USING btree ("user_id","effective_from") WHERE deleted_at is null;--> statement-breakpoint
CREATE INDEX "water_logs_user_id_server_version_idx" ON "water_logs" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE INDEX "weight_entries_user_id_server_version_idx" ON "weight_entries" USING btree ("user_id","server_version");--> statement-breakpoint
CREATE UNIQUE INDEX "weight_entries_user_id_local_date_idx" ON "weight_entries" USING btree ("user_id","local_date") WHERE deleted_at is null;