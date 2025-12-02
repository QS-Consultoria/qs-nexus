-- Migration: Add User Management Fields
-- Date: 2025-12-02
-- Description: Adiciona campos para sistema completo de gerenciamento de usuários

BEGIN;

-- 1. Criar enums se não existirem
DO $$ BEGIN
    CREATE TYPE global_role AS ENUM (
        'super_admin',
        'admin_fiscal',
        'user_fiscal',
        'consultor_ia',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE org_role AS ENUM (
        'admin_fiscal',
        'user_fiscal',
        'consultor_ia',
        'viewer'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Adicionar campos à tabela rag_users
ALTER TABLE rag_users 
ADD COLUMN IF NOT EXISTS global_role global_role DEFAULT 'viewer',
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true NOT NULL,
ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 3. Atualizar usuários existentes para serem super_admin (retrocompatibilidade)
UPDATE rag_users 
SET global_role = 'super_admin', 
    is_active = true 
WHERE global_role IS NULL 
   OR email = 'admin@qsconsultoria.com.br';

-- 4. Adicionar campos à tabela organization_members
ALTER TABLE organization_members
ADD COLUMN IF NOT EXISTS invited_by uuid,
ADD COLUMN IF NOT EXISTS invited_at timestamptz;

-- 5. Atualizar role existentes de 'admin' para 'admin_fiscal'
UPDATE organization_members 
SET role = 'admin_fiscal' 
WHERE role = 'admin';

UPDATE organization_members 
SET role = 'user_fiscal' 
WHERE role = 'member';

-- 6. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_rag_users_global_role ON rag_users(global_role);
CREATE INDEX IF NOT EXISTS idx_rag_users_is_active ON rag_users(is_active);
CREATE INDEX IF NOT EXISTS idx_rag_users_email ON rag_users(email);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

COMMIT;

