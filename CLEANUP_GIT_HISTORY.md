# 🧹 Guia de Limpeza do Histórico Git

Este guia explica como remover arquivos grandes do histórico do Git para otimizar o repositório.

## 📊 Problema Identificado

O repositório contém arquivos grandes que foram commitados anteriormente:

- **9.4MB**: `data/markdown/c23bf6cdf0e49b2b4481a9e34ac0be7767694430017d47eb58d3686278c67ff3.md`
- **9.8MB**: Arquivo SPED txt processado
- **~5MB**: Arquivos CSV de curadoria
- **~1MB**: Screenshots do Playwright

**Total**: ~20MB de arquivos desnecessários no histórico

### Impacto

- ❌ Cada `git clone` baixa esses arquivos
- ❌ Cada `git push/pull` transfere dados extras
- ❌ Repositório maior que o necessário
- ❌ Deploys mais lentos no Heroku

## ✅ Solução Implementada

1. **`.gitignore` atualizado** - Novos arquivos não serão commitados
2. **Scripts de limpeza** - Removem arquivos do histórico

## 🚀 Como Usar

### Opção 1: BFG Repo-Cleaner (Recomendado)

BFG é mais rápido e simples que git-filter-repo.

```bash
# 1. Instalar BFG (se necessário)
brew install bfg

# 2. Fazer backup
cd /Users/ern/Downloads
cp -r qs-nexus qs-nexus-backup

# 3. Executar limpeza
cd qs-nexus
./scripts/cleanup-git-history-bfg.sh

# 4. Verificar resultado
git log --oneline -10
du -sh .git

# 5. Force push (CUIDADO!)
git push origin main --force
git push heroku main --force
```

### Opção 2: git-filter-repo

Mais preciso, mas requer instalação do git-filter-repo.

```bash
# 1. Instalar git-filter-repo
pip3 install git-filter-repo
# ou
brew install git-filter-repo

# 2. Fazer backup
cd /Users/ern/Downloads
cp -r qs-nexus qs-nexus-backup

# 3. Executar limpeza
cd qs-nexus
./scripts/cleanup-git-history.sh

# 4. Force push
git push origin main --force
git push heroku main --force
```

### Opção 3: Limpeza Manual (Mais Segura)

Se preferir não reescrever o histórico, você pode:

```bash
# 1. Remover arquivos tracked do Git (mas manter localmente)
git rm --cached -r data/
git rm --cached -r uploads/
git rm --cached -r .playwright-mcp/
git rm --cached *.csv *.xlsx

# 2. Commit
git commit -m "chore: remove arquivos grandes do índice"

# 3. Push
git push origin main
```

**Nota**: Esta opção não remove arquivos do histórico, apenas impede novos commits.

## ⚠️ IMPORTANTE - Antes de Executar

### 1. Fazer Backup

```bash
cd /Users/ern/Downloads
cp -r qs-nexus qs-nexus-backup
```

### 2. Avisar Colaboradores

Se outras pessoas trabalham no repositório:

1. Peça para commitarem e fazerem push de tudo
2. Avise que o histórico será reescrito
3. Após o force push, todos devem:

```bash
git fetch origin
git reset --hard origin/main
# ou simplesmente clonar novamente
```

### 3. Testar Antes do Force Push

```bash
# Testar se o build funciona
npm install
npm run build

# Testar se o app funciona
npm run dev
```

## 📈 Resultado Esperado

| Métrica | Antes | Depois | Melhoria |
|---------|-------|--------|----------|
| Tamanho .git | 14MB | ~4MB | -70% |
| Clone time | ~8s | ~2s | -75% |
| Push/Pull | ~5s | ~1s | -80% |

## 🔧 Troubleshooting

### Erro: "refusing to merge unrelated histories"

Se colaboradores tiverem problemas após force push:

```bash
git fetch origin
git reset --hard origin/main
```

### Erro: "git-filter-repo not found"

```bash
# macOS
brew install git-filter-repo

# Linux/WSL
pip3 install git-filter-repo

# Verificar instalação
git-filter-repo --version
```

### Erro: "BFG not found"

```bash
# macOS
brew install bfg

# Verificar instalação
bfg --version
```

## 📚 Recursos

- [BFG Repo-Cleaner](https://rtyley.github.io/bfg-repo-cleaner/)
- [git-filter-repo](https://github.com/newren/git-filter-repo)
- [Removing files from Git history](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## ❓ Dúvidas

Se tiver dúvidas ou problemas:

1. Verifique se fez backup
2. Teste em uma branch separada primeiro
3. Consulte a documentação oficial das ferramentas

---

**Última atualização**: Dezembro 2025

