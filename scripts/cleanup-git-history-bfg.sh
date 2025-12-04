#!/bin/bash
# Script alternativo usando BFG Repo-Cleaner para limpar histórico do Git
# BFG é mais rápido e simples que git-filter-repo
# ATENÇÃO: Este script reescreve o histórico do Git e requer force push

set -e

echo "🧹 Limpeza de Arquivos Grandes com BFG Repo-Cleaner"
echo "===================================================="
echo ""
echo "⚠️  ATENÇÃO: Este script irá reescrever o histórico do Git!"
echo "⚠️  Certifique-se de fazer backup antes de continuar."
echo ""
read -p "Deseja continuar? (s/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Ss]$ ]]
then
    echo "Operação cancelada."
    exit 1
fi

echo ""
echo "📦 Verificando tamanho atual do repositório..."
git count-objects -vH

echo ""
echo "🔍 Verificando instalação do BFG..."
if ! command -v bfg &> /dev/null; then
    echo "BFG não encontrado. Instalando via brew..."
    brew install bfg || {
        echo "❌ Erro ao instalar BFG"
        echo "Instale manualmente: brew install bfg"
        echo "Ou baixe de: https://rtyley.github.io/bfg-repo-cleaner/"
        exit 1
    }
fi

echo ""
echo "📝 Criando lista de arquivos para remover..."
cat > /tmp/files-to-delete.txt << EOF
c23bf6cdf0e49b2b4481a9e34ac0be7767694430017d47eb58d3686278c67ff3.md
01598794000108-01598794000108-2024-01-01-2024-12-31-G-923C3B187E235DB878300C01FC3B1BAC6A114078-2025-06-29T125936-AUTENTICADA-.txt
selecao_rag.csv
curadoria.csv
dataset_curado.csv
dataset_silver.csv
selecao_rag.xlsx
EOF

echo ""
echo "🗑️  Removendo arquivos grandes (>1MB) e arquivos específicos..."
# Remover arquivos maiores que 1MB
bfg --delete-files '{*.csv,*.xlsx}' --no-blob-protection .
bfg --strip-blobs-bigger-than 1M --no-blob-protection .
bfg --delete-files /tmp/files-to-delete.txt --no-blob-protection .

echo ""
echo "🧹 Removendo pastas específicas..."
bfg --delete-folders '{data,uploads,.playwright-mcp}' --no-blob-protection .

echo ""
echo "🔄 Limpando e otimizando repositório..."
git reflog expire --expire=now --all
git gc --prune=now --aggressive

echo ""
echo "📊 Novo tamanho do repositório:"
git count-objects -vH

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📤 Próximos passos:"
echo "1. Verifique se o repositório está funcionando: git log"
echo "2. Teste localmente: npm install && npm run build"
echo "3. Force push para os remotes:"
echo "   git push origin main --force"
echo "   git push heroku main --force"
echo ""
echo "⚠️  IMPORTANTE: Todos os colaboradores precisarão clonar o repositório novamente!"
echo "   ou executar: git fetch origin && git reset --hard origin/main"
echo ""
echo "🧼 Limpando arquivo temporário..."
rm -f /tmp/files-to-delete.txt

echo "✨ Pronto!"

