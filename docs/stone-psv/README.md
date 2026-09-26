# Stone PSV - MVP sintético isolado

Entrada local: `/stone-psv.html`. Esta página separada não altera as rotas existentes `?view=...`, autenticação nem o banco da Nova Odisseia.

Ela apresenta cinco empresas inventadas, filtros por etapa/rota/agente, mudança temporária de etapa e próxima ação, plano semanal e validação preliminar de CSV. O arquivo CSV é lido no navegador, não é transmitido nem importado. Não há persistência, alertas enviados, acesso a dados da Stone, ou API para esta página.

## Executar

`pnpm dev`, depois abrir `/stone-psv.html` na porta local. `pnpm test:unit -- server/stonePsvSandbox.test.ts` cobre filtros, TPV ausente, CSV malformado, IDs duplicados. `pnpm build` inclui a entrada separada em `dist/public/stone-psv.html`.

## Limites e próximos passos

- Este código serve para homologar a interface e regras. Ele **não** é um app corporativo pronto para produção. Não publicar ou fazer merge sem revisão explícita.
- O CSV demonstrativo exige `id,cliente,rota,agente,etapa,tpv,acao,data`; a prévia não mostra nomes nem IDs e nunca grava. **Não usar exports reais** aqui.
- Integração com planilha, login corporativo, isolamento por usuário, banco, auditoria, validação de origem e permissões devem ser desenhados no ambiente aprovado pela Stone antes de se considerar uso operacional.
- Excalidraw mistura PSV Stone, Yeo Mids e planos pessoais; apenas o recorte PSV/rituais orientou a demonstração. Fonte de regras: aba PSV Regras do export de 25/09/2026, retrato datado, não integração ao vivo.
- TPV vazio fica `null`, nunca zero. O foco 100k-300k é um sinal de revisão, não uma regra que apaga ou oculta registros. Classificação, deduplicação e exceções exigem aprovação humana.

## Capturas inspecionadas

Capturas desktop e mobile serão anexadas ao PR para revisão, sem incluir arquivos de imagem no repositório.
