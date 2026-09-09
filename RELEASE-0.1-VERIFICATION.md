# Nova Odisseia — Release 0.1 Verification

## Objetivo
Remover a dependência operacional do Manus e deixar o projeto preparado para execução independente com:
- Node.js 22
- Express + tRPC
- React/Vite
- MySQL + Drizzle
- S3/R2 para objetos
- Resend para e-mail
- JWT local para sessão

## Correções aplicadas nesta rodada
1. Versão do pacote definida como `0.1.0`.
2. Processo de inicialização separado de `createApp()`, permitindo adapters futuros sem iniciar um listener ao importar o app.
3. Migração de banco de produção separada em `pnpm run db:migrate`.
4. Container de produção executa migrações versionadas antes de iniciar a aplicação.
5. Docker passou a usar `pnpm-lock.yaml` e `pnpm install --frozen-lockfile`.
6. Testes unitários e integração foram separados.
7. Adicionado `pnpm run smoke` para health/root/tRPC.
8. Favicon migrado de `manus-storage` para asset local.
9. Google Maps deixou de usar o proxy Forge/Manus e, se necessário, usa diretamente a API oficial do Google via `VITE_GOOGLE_MAPS_API_KEY`.
10. URL base OpenAI corrigida para não duplicar `/v1` quando o usuário já informa uma base compatível.
11. Referências ativas a `vite-plugin-manus-runtime`, `ManusDialog` e `manus-storage` removidas do código executável.
12. Lockfile saneado para remover o importador do plugin Manus.

## Verificações executadas neste ambiente
### PASS — análise sintática TypeScript/TSX
181 arquivos TS/TSX foram processados pelo compilador TypeScript em modo de transpile e não produziram diagnósticos sintáticos.

### PASS — varredura de dependência Manus
Não foram encontradas referências executáveis a:
- `vite-plugin-manus-runtime`
- `ManusDialog`
- `manus-storage`
- módulos OAuth/SDK Manus removidos

### PASS — remoção de proxy Forge
O componente de mapa não depende mais de `forge.butterfly-effect.dev`.

### BLOCKED — instalação de dependências
`npm install`/Corepack não conseguiu acessar `registry.npmjs.org` neste ambiente de execução (erro de resolução DNS `EAI_AGAIN`). Portanto, não é legítimo declarar `npm/pnpm install`, `tsc`, `vitest` ou `vite build` como executados com sucesso aqui.

### BLOCKED — build Docker
Não foi possível executar o build Docker porque o ambiente não possui acesso funcional ao registry necessário para baixar a imagem Node/dependências.

## Gate de produção
Em uma máquina/CI com acesso à internet, o gate deve ser:

```bash
corepack enable
corepack prepare pnpm@10.4.1 --activate
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:unit
pnpm run build
pnpm run db:migrate
pnpm run start:prod
SMOKE_URL=http://localhost:3000 pnpm run smoke
```

Depois:

```bash
pnpm run test:integration
SMOKE_URL=https://www.novaodisseia.com pnpm run smoke
```

## O que ainda depende de infraestrutura externa
- Criar/usar um MySQL de produção e aplicar as 19 migrations versionadas.
- Configurar S3 ou Cloudflare R2 para armazenamento de arquivos.
- Configurar domínio e DNS de `www.novaodisseia.com`.
- Configurar `fiorati@novaodisseia.com` no Resend e validar SPF/DKIM.
- Definir `JWT_SECRET` forte.
- Configurar, se usado, `VITE_GOOGLE_MAPS_API_KEY`.
- Opcionalmente configurar `OPENAI_API_KEY`.
- Se a aplicação Manus atual possuir dados de produção, exportar o banco e migrar os objetos do storage separadamente; o código-fonte não contém esses dados.
