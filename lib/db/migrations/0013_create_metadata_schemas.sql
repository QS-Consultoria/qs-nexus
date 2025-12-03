-- Create metadata_schema_type enum
DO $$ BEGIN
  CREATE TYPE "public"."metadata_schema_type" AS ENUM('sped_ecd', 'sped_ecf', 'sped_efd', 'legal_document', 'fiscal_document', 'custom');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create field_type enum
DO $$ BEGIN
  CREATE TYPE "public"."field_type" AS ENUM('text', 'number', 'date', 'boolean', 'select', 'multiselect', 'json');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create metadata_schemas table
CREATE TABLE IF NOT EXISTS "metadata_schemas" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid,
  "name" text NOT NULL,
  "description" text,
  "type" "metadata_schema_type" NOT NULL,
  "base_schema" jsonb NOT NULL,
  "custom_fields" jsonb DEFAULT '{"fields":[]}'::jsonb,
  "validation_rules" jsonb,
  "ui_config" jsonb,
  "is_active" boolean DEFAULT true NOT NULL,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);

-- Create metadata_schema_versions table
CREATE TABLE IF NOT EXISTS "metadata_schema_versions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "schema_id" uuid NOT NULL REFERENCES "metadata_schemas"("id") ON DELETE CASCADE,
  "version" text NOT NULL,
  "base_schema" jsonb NOT NULL,
  "custom_fields" jsonb NOT NULL,
  "validation_rules" jsonb,
  "change_log" text,
  "created_by" uuid,
  "created_at" timestamp DEFAULT now() NOT NULL
);

-- Create indexes for metadata_schemas
CREATE INDEX IF NOT EXISTS "metadata_schemas_org_idx" ON "metadata_schemas" ("organization_id");
CREATE INDEX IF NOT EXISTS "metadata_schemas_type_idx" ON "metadata_schemas" ("type");
CREATE INDEX IF NOT EXISTS "metadata_schemas_active_idx" ON "metadata_schemas" ("is_active");

-- Create indexes for metadata_schema_versions
CREATE INDEX IF NOT EXISTS "metadata_schema_versions_schema_idx" ON "metadata_schema_versions" ("schema_id");
CREATE INDEX IF NOT EXISTS "metadata_schema_versions_version_idx" ON "metadata_schema_versions" ("version");

