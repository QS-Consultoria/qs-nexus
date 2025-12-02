# 🔐 Guia de Configuração Segura - QS Nexus

## ⚠️ NUNCA COMPARTILHE SECRETS EM TEXTO PLANO

**REGRA DE OURO**: API keys, senhas e tokens NUNCA devem ser:
- Commitadas no Git
- Compartilhadas em chats/emails
- Hardcoded no código
- Expostas em logs

---

## 1️⃣ Primeira Configuração (Desenvolvimento Local)

### Passo 1: Criar arquivo de variáveis locais

```bash
# Copiar template
cp env.example .env.local

# Editar com suas credenciais
# NUNCA commite este arquivo!
```

### Passo 2: Configurar OpenAI API Key

**A) Obter nova chave**:
1. Acesse: https://platform.openai.com/api-keys
2. Clique em "Create new secret key"
3. Copie a chave (ela só aparece uma vez!)

**B) Adicionar no .env.local**:
```bash
# Edite .env.local e adicione:
OPENAI_API_KEY=sk-proj-SUA-NOVA-CHAVE-AQUI
```

### Passo 3: Gerar NEXTAUTH_SECRET

```bash
# Gerar secret aleatório
openssl rand -base64 32

# Adicionar no .env.local:
NEXTAUTH_SECRET=resultado-do-comando-acima
```

### Passo 4: Configurar DATABASE_URL

```bash
# Adicionar no .env.local (use a string do Neon DB):
DATABASE_URL=postgresql://user:pass@host/database?sslmode=require
```

---

## 2️⃣ Configuração no Heroku (Produção)

### NÃO faça isso ❌:
```bash
# NUNCA coloque a chave diretamente no comando visível
heroku config:set OPENAI_API_KEY="sk-proj-abc123..." -a qs-nexus
```

### Faça isso ✅:
```bash
# Método 1: Usar variável de ambiente temporária
read -s OPENAI_KEY
# Cole a chave e pressione Enter (não aparecerá na tela)

heroku config:set OPENAI_API_KEY="$OPENAI_KEY" -a qs-nexus

# Método 2: Via dashboard do Heroku
# 1. Acesse: https://dashboard.heroku.com/apps/qs-nexus/settings
# 2. Clique em "Reveal Config Vars"
# 3. Adicione OPENAI_API_KEY manualmente
```

### Configurar todas as variáveis necessárias:

```bash
# Gerar NEXTAUTH_SECRET
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Ler OpenAI Key de forma segura
read -s OPENAI_KEY

# Configurar todas de uma vez
heroku config:set \
  NEXTAUTH_SECRET="$NEXTAUTH_SECRET" \
  NEXTAUTH_URL="https://qs-nexus-a5bdab4d1fdb.herokuapp.com" \
  OPENAI_API_KEY="$OPENAI_KEY" \
  NODE_ENV="production" \
  DB_MAX_CONNECTIONS="10" \
  -a qs-nexus

# Limpar variáveis temporárias
unset OPENAI_KEY
unset NEXTAUTH_SECRET
```

---

## 3️⃣ Verificação de Segurança

### Verificar configuração (sem expor valores):

```bash
# Heroku
heroku config -a qs-nexus

# Local
node -e "console.log('OpenAI:', process.env.OPENAI_API_KEY ? '✅ Configurado' : '❌ Faltando')"
```

### Checklist de segurança:

- [ ] Arquivo `.env.local` está no `.gitignore`
- [ ] Não há API keys hardcoded no código
- [ ] Secrets rotacionados se foram expostos
- [ ] OpenAI API key tem rate limits configurados
- [ ] Database URL usa SSL (`?sslmode=require`)
- [ ] NEXTAUTH_SECRET é aleatório e forte (32+ caracteres)

---

## 4️⃣ O Que Fazer Se Expôs uma Chave

### Se expôs OPENAI_API_KEY:

1. **REVOGUE IMEDIATAMENTE**:
   - Acesse: https://platform.openai.com/api-keys
   - Encontre a chave exposta
   - Clique em "Delete"

2. **Crie nova chave**:
   - Clique em "Create new secret key"
   - Nomeie (ex: "qs-nexus-production")
   - Copie a chave

3. **Atualize nos ambientes**:
```bash
# Local
# Edite .env.local e substitua

# Heroku
heroku config:set OPENAI_API_KEY="nova-chave-aqui" -a qs-nexus
```

4. **Monitore uso**:
   - Verifique: https://platform.openai.com/usage
   - Procure por uso anormal

### Se expôs DATABASE_URL:

1. **ROTACIONE SENHA**:
   - Neon DB: Acesse console.neon.tech
   - Gere nova senha
   - Atualize DATABASE_URL em todos os lugares

2. **Verifique conexões**:
   - Neon DB: Monitore conexões ativas
   - Procure por IPs desconhecidos

---

## 5️⃣ Boas Práticas

### Desenvolvimento:

```bash
# Use .env.local (nunca .env)
# .env.local está no .gitignore por padrão

# Teste se variáveis estão carregadas:
npm run dev
# Deve mostrar erros se faltar alguma variável obrigatória
```

### Produção:

```bash
# Use Heroku Config Vars (nunca arquivos)
heroku config -a qs-nexus

# Para CI/CD, use GitHub Secrets
# Settings > Secrets and variables > Actions
```

### Rotação Regular:

- **NEXTAUTH_SECRET**: A cada 6 meses
- **OPENAI_API_KEY**: Anualmente ou se suspeitar de exposição
- **DATABASE_URL**: Trimestral em produção

---

## 6️⃣ Monitoramento

### OpenAI:

```bash
# Configurar alertas de uso:
# 1. Acesse: https://platform.openai.com/account/billing/limits
# 2. Defina limite mensal (ex: $100)
# 3. Configure email alert em 80%
```

### Heroku:

```bash
# Ver logs de acesso:
heroku logs --tail -a qs-nexus | grep "OPENAI"

# Verificar se há erros de autenticação:
heroku logs --tail -a qs-nexus | grep "401\|403"
```

---

## 📞 Em Caso de Emergência

### Chave comprometida:

1. ✅ Revogue IMEDIATAMENTE
2. ✅ Gere nova chave
3. ✅ Atualize em todos os ambientes
4. ✅ Monitore uso nas últimas 24h
5. ✅ Verifique logs para acesso não autorizado

### Banco comprometido:

1. ✅ Rotacione senha imediatamente
2. ✅ Verifique dados sensíveis
3. ✅ Revise logs de acesso
4. ✅ Considere backup e restore
5. ✅ Notifique stakeholders se houver vazamento

---

## ✅ Status de Configuração

Variáveis obrigatórias:
- [ ] `DATABASE_URL` configurado (local e Heroku)
- [ ] `NEXTAUTH_SECRET` configurado (local e Heroku)
- [ ] `NEXTAUTH_URL` configurado (Heroku)
- [ ] `OPENAI_API_KEY` configurado (local e Heroku)
- [ ] `NODE_ENV=production` (Heroku)

Verificação final:
```bash
# Local
npm run build
# Deve completar sem erros

# Heroku
heroku config -a qs-nexus
# Deve mostrar todas as variáveis (sem valores)

# Teste API
curl https://qs-nexus-a5bdab4d1fdb.herokuapp.com/api/health
# Deve retornar 200 OK
```

---

**Última atualização**: 2 de dezembro de 2025

