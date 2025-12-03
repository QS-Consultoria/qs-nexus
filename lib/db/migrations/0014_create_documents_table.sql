-- Migration: Create documents table for general document management
-- Created: 2025-12-03

-- Create document_type enum
DO $$ BEGIN
  CREATE TYPE "document_type" AS ENUM ('pdf', 'docx', 'doc', 'txt', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create document_status enum
DO $$ BEGIN
  CREATE TYPE "document_status" AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create documents table
CREATE TABLE IF NOT EXISTS "documents" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  
  -- Multi-tenant
  "organization_id" uuid NOT NULL,
  "uploaded_by" uuid NOT NULL,
  
  -- Identification
  "file_name" text NOT NULL,
  "original_file_name" text NOT NULL,
  "file_path" text NOT NULL,
  "file_size" integer NOT NULL,
  "file_hash" text NOT NULL,
  "mime_type" text NOT NULL,
  "document_type" "document_type" NOT NULL,
  
  -- Metadata
  "title" text,
  "description" text,
  "tags" text[],
  "metadata" jsonb,
  
  -- RAG Processing
  "status" "document_status" DEFAULT 'pending' NOT NULL,
  "error_message" text,
  "processed_at" timestamp,
  
  -- Counters
  "total_chunks" integer DEFAULT 0,
  "total_tokens" integer DEFAULT 0,
  
  -- Soft delete
  "is_active" boolean DEFAULT true NOT NULL,
  "deleted_at" timestamp,
  "deleted_by" uuid,
  
  -- Timestamps
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "documents_org_idx" ON "documents" ("organization_id");
CREATE INDEX IF NOT EXISTS "documents_uploaded_by_idx" ON "documents" ("uploaded_by");
CREATE INDEX IF NOT EXISTS "documents_status_idx" ON "documents" ("status");
CREATE INDEX IF NOT EXISTS "documents_type_idx" ON "documents" ("document_type");
CREATE INDEX IF NOT EXISTS "documents_active_idx" ON "documents" ("is_active");
CREATE INDEX IF NOT EXISTS "documents_org_active_idx" ON "documents" ("organization_id", "is_active");

