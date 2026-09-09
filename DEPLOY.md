# Nova Odisseia — implantação independente

## Recomendação
Para a primeira migração, use Railway ou Render para manter o Express + tRPC + MySQL em um único serviço. Vercel pode ser usado depois para separar o frontend, mas o app completo aceita uploads de até 12 MB e tem processos HTTP/DB que ficam mais simples em uma plataforma de servidor persistente.

## Serviços externos
- MySQL compatível
- S3 ou Cloudflare R2 para arquivos
- Resend para e-mails

## Variáveis
Copie `.env.example` para as variáveis do provedor.

## Banco
Execute as migrations Drizzle após criar o MySQL:
`npx drizzle-kit migrate`

## Desenvolvimento
`npm install`
`npm run dev`

## Produção
`npm run build`
`npm start`

## Segurança
- Defina um `JWT_SECRET` aleatório e longo.
- Use HTTPS.
- Restrinja cadastro a `@stone.com.br` ou ajuste `ALLOWED_EMAIL_DOMAIN`.
- Configure domínio verificado no Resend.
- Não commite `.env`.
- Configure S3/R2 com credenciais que tenham somente as permissões necessárias para o bucket.


## Release 0.1 gate

Before declaring production ready, run in an environment with registry access:

```bash
pnpm install --frozen-lockfile
pnpm run check
pnpm run test:unit
pnpm run build
DATABASE_URL=... pnpm run db:migrate
pnpm run start:prod
SMOKE_URL=https://www.novaodisseia.com pnpm run smoke
```

Integration tests that mutate a database are intentionally separate: `pnpm run test:integration`.
The production process runs committed Drizzle migrations before starting the HTTP server.
