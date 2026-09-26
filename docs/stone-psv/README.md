# Stone PSV - MVP sintético isolado

Entrada local: `/stone-psv.html`. Esta página separada não altera as rotas existentes `?view=...`, autenticação nem o banco da Nova Odisseia.

Ela apresenta cinco empresas inventadas, filtros por etapa/rota/agente, mudança temporária de etapa e próxima ação, Promessa do dia com checkpoint/feito e resumo semanal derivado, além de uma estrutura de Preparar visita com máscara de CNPJ fictício. Não há consulta de CNPJ ou transmissão de informações. Não há persistência, alertas enviados, acesso a dados da Stone, ou API para esta página.

## Executar

`pnpm dev`, depois abrir `/stone-psv.html` na porta local. `pnpm test:unit -- server/stonePsvSandbox.test.ts` cobre filtros, TPV ausente, resumo semanal e máscara de CNPJ. `pnpm build` inclui a entrada separada em `dist/public/stone-psv.html`.

## Limites e próximos passos

- Este código serve para homologar a interface e regras. Ele **não** é um app corporativo pronto para produção. Não publicar ou fazer merge sem revisão explícita.
- O funil usa cinco exemplos inventados. Preparar visita aceita apenas entrada fictícia para visualizar a máscara; não consultar CNPJ real neste sandbox. Não há importação nesta versão.
- Integração com planilha, login corporativo, isolamento por usuário, banco, auditoria, validação de origem e permissões devem ser desenhados no ambiente aprovado pela Stone antes de se considerar uso operacional.
- Excalidraw mistura PSV Stone, Yeo Mids e planos pessoais; apenas o recorte PSV/rituais orientou a demonstração. Fonte de regras: aba PSV Regras do export de 25/09/2026, retrato datado, não integração ao vivo.
- TPV vazio fica `null`, nunca zero. O foco 100k-300k é um sinal de revisão, não uma regra que apaga ou oculta registros. Classificação, deduplicação e exceções exigem aprovação humana.

## Capturas inspecionadas

Capturas desktop e mobile serão anexadas ao PR para revisão, sem incluir arquivos de imagem no repositório.
