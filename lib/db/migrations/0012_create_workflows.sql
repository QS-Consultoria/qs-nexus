-- Create workflow_execution_status enum
DO $$ BEGIN
  CREATE TYPE "public"."workflow_execution_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create workflow_templates table
CREATE TABLE IF NOT EXISTS "workflow_templates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "is_shared" boolean DEFAULT false NOT NULL,
  "organization_id" uuid,
  "langchain_graph" jsonb NOT NULL,
  "input_schema" jsonb,
  "output_schema" jsonb,
  "tags" text[],
  "category" text,
  "version" text DEFAULT '1.0.0',
  "created_by" uuid,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create workflow_executions table
CREATE TABLE IF NOT EXISTS "workflow_executions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "workflow_template_id" uuid NOT NULL REFERENCES "workflow_templates"("id"),
  "organization_id" uuid,
  "user_id" uuid NOT NULL,
  "status" "workflow_execution_status" DEFAULT 'pending' NOT NULL,
  "input" jsonb,
  "output" jsonb,
  "error" text,
  "error_stack" text,
  "current_step" text,
  "total_steps" text,
  "progress" text,
  "started_at" timestamp,
  "completed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "metadata" jsonb
);

-- Create workflow_execution_steps table
CREATE TABLE IF NOT EXISTS "workflow_execution_steps" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "execution_id" uuid NOT NULL REFERENCES "workflow_executions"("id") ON DELETE CASCADE,
  "step_name" text NOT NULL,
  "step_type" text,
  "step_index" text NOT NULL,
  "status" "workflow_execution_status" NOT NULL,
  "input" jsonb,
  "output" jsonb,
  "error" text,
  "tool_name" text,
  "llm_model" text,
  "tokens_used" text,
  "started_at" timestamp DEFAULT now() NOT NULL,
  "completed_at" timestamp,
  "duration" text
);

-- Create indexes for workflow_templates
CREATE INDEX IF NOT EXISTS "workflow_templates_org_idx" ON "workflow_templates" ("organization_id");
CREATE INDEX IF NOT EXISTS "workflow_templates_shared_idx" ON "workflow_templates" ("is_shared");
CREATE INDEX IF NOT EXISTS "workflow_templates_category_idx" ON "workflow_templates" ("category");

-- Create indexes for workflow_executions
CREATE INDEX IF NOT EXISTS "workflow_executions_template_idx" ON "workflow_executions" ("workflow_template_id");
CREATE INDEX IF NOT EXISTS "workflow_executions_org_idx" ON "workflow_executions" ("organization_id");
CREATE INDEX IF NOT EXISTS "workflow_executions_user_idx" ON "workflow_executions" ("user_id");
CREATE INDEX IF NOT EXISTS "workflow_executions_status_idx" ON "workflow_executions" ("status");
CREATE INDEX IF NOT EXISTS "workflow_executions_created_idx" ON "workflow_executions" ("created_at");

-- Create indexes for workflow_execution_steps
CREATE INDEX IF NOT EXISTS "workflow_execution_steps_execution_idx" ON "workflow_execution_steps" ("execution_id");

