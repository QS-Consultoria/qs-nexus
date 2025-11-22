-- Add model_provider and model_name columns to templates table
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "model_provider" "model_provider";--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "model_name" text;--> statement-breakpoint

