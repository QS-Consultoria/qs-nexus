-- Verificar usuários e seus globalRole
SELECT id, name, email, global_role, is_active 
FROM rag_users 
WHERE email IN ('erickneves@qualitysupport.com.br', 'admin@qsconsultoria.com.br');

-- Atualizar para super_admin se ainda não estiver
UPDATE rag_users 
SET global_role = 'super_admin', updated_at = NOW()
WHERE email IN ('erickneves@qualitysupport.com.br', 'admin@qsconsultoria.com.br')
AND (global_role IS NULL OR global_role != 'super_admin');

-- Verificar novamente
SELECT id, name, email, global_role, is_active 
FROM rag_users 
WHERE email IN ('erickneves@qualitysupport.com.br', 'admin@qsconsultoria.com.br');

