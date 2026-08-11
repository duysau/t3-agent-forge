CREATE TABLE "agentforge_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(12) NOT NULL,
	"python_session_id" varchar(32),
	"source_url" text NOT NULL,
	"mode" varchar(8) DEFAULT 'live' NOT NULL,
	"fixture_key" varchar(16),
	"degraded" boolean DEFAULT false NOT NULL,
	"product" varchar(8),
	"voice_id" varchar(32),
	"brand_name" text,
	"brand_color" varchar(9) DEFAULT '#203ADC' NOT NULL,
	"brand_logo_letter" varchar(4),
	"brand_logo_emoji" varchar(8),
	"industry" text,
	"persona" jsonb,
	"system_prompt" text,
	"guardrails" jsonb,
	"kb_facts" jsonb,
	"status" varchar(12) DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agentforge_agents_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "agentforge_crawled_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"url" text NOT NULL,
	"title" text,
	"status" varchar(8) NOT NULL,
	"ord" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentforge_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"document_id" varchar(32) NOT NULL,
	"file_name" text NOT NULL,
	"chunk_count" integer NOT NULL,
	"page_count" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentforge_eval_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eval_run_id" uuid NOT NULL,
	"category" varchar(10) NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"score" numeric(2, 1) NOT NULL,
	"passed" boolean NOT NULL,
	"reasoning" text,
	"ord" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentforge_eval_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"pass_rate" integer NOT NULL,
	"avg_score" numeric(3, 2) NOT NULL,
	"passed" integer NOT NULL,
	"total" integer NOT NULL,
	"breakdown" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentforge_kb_chunks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"content" text NOT NULL,
	"source_url" text,
	"source" varchar(8) DEFAULT 'web' NOT NULL,
	"ord" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentforge_voice_scripts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"turns" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "agentforge_crawled_pages" ADD CONSTRAINT "agentforge_crawled_pages_agent_id_agentforge_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agentforge_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentforge_documents" ADD CONSTRAINT "agentforge_documents_agent_id_agentforge_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agentforge_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentforge_eval_results" ADD CONSTRAINT "agentforge_eval_results_eval_run_id_agentforge_eval_runs_id_fk" FOREIGN KEY ("eval_run_id") REFERENCES "public"."agentforge_eval_runs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentforge_eval_runs" ADD CONSTRAINT "agentforge_eval_runs_agent_id_agentforge_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agentforge_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentforge_kb_chunks" ADD CONSTRAINT "agentforge_kb_chunks_agent_id_agentforge_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agentforge_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agentforge_voice_scripts" ADD CONSTRAINT "agentforge_voice_scripts_agent_id_agentforge_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agentforge_agents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "agents_slug_idx" ON "agentforge_agents" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "crawled_pages_agent_idx" ON "agentforge_crawled_pages" USING btree ("agent_id");--> statement-breakpoint
CREATE INDEX "eval_results_run_idx" ON "agentforge_eval_results" USING btree ("eval_run_id");--> statement-breakpoint
CREATE INDEX "kb_chunks_agent_idx" ON "agentforge_kb_chunks" USING btree ("agent_id");