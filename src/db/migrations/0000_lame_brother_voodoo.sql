CREATE TABLE "invite_usages" (
	"id" text PRIMARY KEY NOT NULL,
	"invite_id" text NOT NULL,
	"user_id" text NOT NULL,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"left_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invites" (
	"id" text PRIMARY KEY NOT NULL,
	"creator_id" text NOT NULL,
	"code" text NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"max_uses" integer,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"channel_id" text NOT NULL,
	CONSTRAINT "invites_code_unique" UNIQUE("code")
);
--> statement-breakpoint
ALTER TABLE "invite_usages" ADD CONSTRAINT "invite_usages_invite_id_invites_id_fk" FOREIGN KEY ("invite_id") REFERENCES "public"."invites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_invite_usages_invite_id" ON "invite_usages" USING btree ("invite_id");--> statement-breakpoint
CREATE INDEX "idx_invite_usages_user_id" ON "invite_usages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_invite_usages_is_active" ON "invite_usages" USING btree ("is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "unique_invite_user" ON "invite_usages" USING btree ("invite_id","user_id");--> statement-breakpoint
CREATE INDEX "idx_invites_creator_id" ON "invites" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_invites_code" ON "invites" USING btree ("code");