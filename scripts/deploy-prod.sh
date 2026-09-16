#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f .env ]]; then
  echo "Arquivo .env não encontrado. Copie o .env.example e ajuste as variáveis antes do deploy."
  exit 1
fi

echo "[1/4] Instalando dependências"
pnpm install --frozen-lockfile

echo "[2/4] Validando TypeScript"
pnpm run check

echo "[3/4] Rodando testes unitários"
pnpm run test:unit

echo "[4/4] Build de produção"
pnpm run build

echo "Build concluído. Agora rode em produção:"
echo "  PORT=3000 NODE_ENV=production pnpm run start"

echo "Ou, se quiser migrar banco antes do start:"
echo "  pnpm run db:migrate"
