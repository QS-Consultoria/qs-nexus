#!/bin/bash
# Script para limpar arquivos grandes do histórico do Git
# ATENÇÃO: Este script reescreve o histórico do Git e requer force push
# Faça backup antes de executar!

set -e

echo "🧹 Limpeza de Arquivos Grandes do Histórico Git"
echo "=============================================="
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
echo "🔍 Instalando git-filter-repo (se necessário)..."
if ! command -v git-filter-repo &> /dev/null; then
    echo "Instalando git-filter-repo via pip..."
    pip3 install git-filter-repo || {
        echo "❌ Erro ao instalar git-filter-repo"
        echo "Instale manualmente: brew install git-filter-repo"
        exit 1
    }
fi

echo ""
echo "🗑️  Removendo arquivos grandes do histórico..."

# Lista de arquivos/diretórios para remover
PATHS_TO_REMOVE=(
    "data/markdown/c23bf6cdf0e49b2b4481a9e34ac0be7767694430017d47eb58d3686278c67ff3.md"
    "data/process/01598794000108-01598794000108-2024-01-01-2024-12-31-G-923C3B187E235DB878300C01FC3B1BAC6A114078-2025-06-29T125936-AUTENTICADA-.txt"
    ".playwright-mcp/"
    "selecao_rag.csv"
    "curadoria.csv"
    "dataset_curado.csv"
    "dataset_silver.csv"
    "selecao_rag.xlsx"
)

# Remover cada arquivo/diretório
for path in "${PATHS_TO_REMOVE[@]}"; do
    echo "  - Removendo: $path"
    git-filter-repo --path "$path" --invert-paths --force
done

echo ""
echo "🧹 Limpando referências antigas..."
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
echo "2. Teste localmente para garantir que nada quebrou"
echo "3. Force push para o remote (CUIDADO!):"
echo "   git push origin main --force"
echo "   git push heroku main --force"
echo ""
echo "⚠️  IMPORTANTE: Todos os colaboradores precisarão clonar o repositório novamente!"
echo "   ou fazer: git fetch origin && git reset --hard origin/main"

