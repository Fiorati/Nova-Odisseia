# Nova Odisseia — engenharia reversa e plano de migração

## 1. Diagnóstico
Aplicação full-stack TypeScript com React/Vite no frontend, Express+tRPC no backend, Drizzle ORM + MySQL, autenticação própria por e-mail/senha, Resend para e-mail e armazenamento S3/R2 na versão independente.

## 2. Módulos funcionais
- Autenticação, cadastro, verificação e recuperação de senha
- Dashboard do agente
- Calculadora de remuneração variável
- Cartão final mensal
- Período e metas
- PSV e ritual semanal
- RMR e plano de ação
- Carteiras, rotas e atribuições
- Pipeline / Super Pipe
- Prospecção e dossiês
- Estratégia Nórdica
- Liderança por polo/distrito
- Ranking e gamificação
- SPARTACUS / PDI / competências
- Biblioteca Ítaca / treinamentos
- Odisseia Updates
- Campanhas de engajamento
- Promessas e prioridades
- Notificações

## 3. Motor de remuneração
A lógica de remuneração está separada em `shared/migrationBase.ts`, `shared/migrationRemuneration.ts`, `shared/mccCatalog.ts`, `shared/metrics.ts` e componentes da calculadora. O fluxo geral é TPV/M0/M1 -> enquadramento -> MCC/CNAE/segmento -> tier -> proposta -> base -> multiplicador -> RV. Há tratamento específico de Hunter e possibilidade de base manual por cliente.

## 4. Banco
O schema Drizzle é a fonte de verdade. As migrations históricas estão em `drizzle/`. A implantação nova deve criar um MySQL limpo e aplicar as migrations antes de liberar o sistema.

## 5. Segurança
- Senhas com scrypt e salt
- Sessão assinada por JWT em cookie HTTP-only
- SameSite=Lax em implantação independente
- Verificação de e-mail antes da conclusão do cadastro
- Recuperação de senha por código com expiração e tentativas
- RBAC para usuário/agente/polo/distrital/admin
- Restrições de território e ownership no backend
- Auditoria de operações administrativas e importações
- Proteção de origem em mutações tRPC

## 6. Dependências removidas do Manus
A versão independente remove o runtime Manus, OAuth Manus, Forge Storage, Forge LLM, notificações Manus e endpoints Manus de desenvolvimento.

## 7. Substituições
| Manus | Independente |
|---|---|
| Manus OAuth | autenticação própria por e-mail/senha já existente no projeto |
| Manus Storage | S3 ou Cloudflare R2 |
| Manus Forge LLM | API OpenAI-compatible opcional |
| Manus Notification | Resend |
| Manus runtime | Express/Vite padrão |
| Manus deployment | Railway/Render/Docker |

## 8. Estratégia de deploy
Recomendação primária: Railway ou Render com Docker. Isso mantém frontend, Express/tRPC e banco em uma arquitetura simples e preserva o limite de upload atual.

Vercel pode receber o frontend posteriormente, mas o backend completo não é o primeiro alvo porque a aplicação usa Express, uploads grandes e operações de banco/arquivo que ficam mais previsíveis em um serviço de servidor.

## 9. Dados do Manus
Os dados e arquivos que ainda estiverem exclusivamente no storage do Manus não são migrados automaticamente pelo código-fonte. Para uma migração de produção, exporte o banco e copie os assets/storage para o novo bucket. O pacote já inclui os dados diários de Ítaca como código para eliminar essa dependência específica.

## 10. Critério de pronto
1. MySQL criado e migrations aplicadas
2. S3/R2 configurado
3. Resend configurado com domínio verificado
4. JWT_SECRET definido
5. Primeiro admin provisionado
6. Deploy Docker concluído
7. Login/cadastro testados
8. Calculadora RV testada com casos conhecidos
9. Carteira/arquivo testados
10. Permissões agente/polo/distrital/admin testadas
11. Domínio customizado configurado
12. Backup do banco configurado
