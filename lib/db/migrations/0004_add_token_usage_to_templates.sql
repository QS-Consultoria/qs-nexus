-- Add input_tokens and output_tokens columns to templates table
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "input_tokens" integer;--> statement-breakpoint
ALTER TABLE "templates" ADD COLUMN IF NOT EXISTS "output_tokens" integer;--> statement-breakpoint

