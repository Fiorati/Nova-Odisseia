#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado. Copie o .env.example e ajuste as variáveis antes do deploy."
  exit 1
fi

echo "[1/5] Instalando dependências"
pnpm install --frozen-lockfile

echo "[2/5] Validando TypeScript"
pnpm run check

echo "[3/5] Rodando testes unitários"
pnpm run test:unit

echo "[4/5] Build de produção"
pnpm run build

echo "[5/5] Aplicando migrations do banco"
pnpm run db:migrate

echo "Deploy preparado com sucesso. O processo de produção pode ser iniciado com:"
echo "  PORT=3000 NODE_ENV=production pnpm run start"
