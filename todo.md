# Revisão por segmento e CNAE/MCC

- [x] Extrair dos materiais de julho os clientes, MCCs, tiers, valores unitários e totais de remuneração.
- [x] Confrontar a tabela fixa atual com os valores reais pagos e identificar divergências por segmento/MCC.
- [x] Criar uma matriz configurável de comissão por segmento, proposta e faixa de TPV.
- [x] Incluir campos de MCC/CNAE e segmento no cadastro de clientes do aplicativo.
- [x] Ajustar o resumo, as fórmulas explicativas e os cenários para a nova matriz.
- [x] Validar a simulação com o total de venda nova de julho e registrar limitações dos dados fornecidos.

## Calculadora genérica para novos usuários

- [x] Remover referências a julho, agosto e resultados pessoais da abertura padrão.
- [x] Definir uma configuração inicial vazia com meta, TPV Hunter, clientes e segmentos preenchíveis.
- [x] Criar um guia de primeiro uso para orientar o preenchimento das regras e clientes.
- [x] Validar o cálculo automático em uma sessão nova do navegador.

## Identidade do aplicativo

- [x] Atualizar título, assinatura e wordmark para FIORATI ELITE 2026.

## Projeção de outubro de 2026

- [x] Consolidar os clientes fechados em agosto, segmentos, TPVs e valores-base da variável.
- [x] Calcular a remuneração de venda nova com o multiplicador de KPI.
- [x] Calcular a parcela Hunter para os cenários de R$ 2,0 milhões e R$ 2,5 milhões.
- [x] Entregar a projeção com as premissas de recebimento em outubro.

## Plataforma privada e gamificada

- [x] Definir as tabelas de perfis, simulações, metas, PSV, RMR, pontuação e ranking.
- [x] Habilitar autenticação e banco de dados sem alterar o endereço público já compartilhado.
- [x] Criar acesso individual por e-mail e senha com registros privados por agente.
- [x] Desenvolver painel individual com histórico, metas, atingimentos, pontos e conquistas.
- [x] Desenvolver sugestão de PSV a partir da RV alvo e do progresso mensal.
- [x] Desenvolver análise de RMR com período, indicadores e benchmarks de produtividade.
- [x] Validar acesso, persistência, cálculos e ranking antes da publicação.
- [x] Ler a matriz de comissão salva na última simulação para orientar a PSV por segmento, proposta e tier.
- [x] Exibir cenários auditáveis de PSV por segmento/tier, sem usar mix de comissão fixo.
- [x] Validar a PSV integrada contra uma matriz salva pelo próprio agente, incluindo a memória de cálculo exibida.

## Base de MCC/CNAE e comissão agressiva

- [x] Consolidar o catálogo de MCCs, atividades e CNAEs fornecido para uso na calculadora.
- [x] Mapear as correlações de segmentos próximos e os valores agressivos confirmados por tier.
- [x] Adicionar seleção assistida de segmento por MCC/CNAE no cadastro de clientes.
- [x] Pré-carregar regras agressivas confirmadas, preservando edição manual por agente.
- [x] Validar os valores por tier e publicar no mesmo link do FIORATI ELITE 2026.
- [x] Distinguir visualmente no catálogo as regras confirmadas nos cards das correlações autorizadas entre setores próximos.
- [x] Incluir seleção assistida também por CNAE e validar a associação CNAE/MCC para segmento.
- [x] Conferir que cada alíquota pré-carregada possui origem confirmada em card ou correlação explicitamente marcada.
- [x] Testar o catálogo integral para impedir alíquota pré-carregada sem evidência visual.

## Migração M1, funil PSV e inteligência de desempenho

- [x] Renomear a área de novos ativos para Migração M1 e totalizar o TPV de clientes elegíveis.
- [x] Manter cálculo automático de remuneração por MCC, segmento, proposta e TPV de cada cliente.
- [x] Pré-selecionar segmentos do catálogo no cadastro de clientes, preservando regras editáveis.
- [x] Criar funil de PSV por cliente com temperatura, segmento, TPV, próxima data e etapa.
- [x] Persistir a lista de funil privada de cada agente e resumir volume, TPV e etapas.
- [x] Adicionar gráficos de indicadores à análise RMR e recomendações de planejamento.
- [x] Melhorar o ranking compartilhado de todos os agentes por pontuação e posição.
- [x] Validar os novos fluxos em desktop e celular e publicar no mesmo link.
- [x] Salvar novo checkpoint com Migração M1, funil PSV, análise, ranking e acesso master.
- [x] Confirmar a publicação da versão atualizada no endereço já compartilhado com o time.
- [x] Limitar os segmentos e tiers pré-preenchidos às regras comprovadas nos cards do usuário, mantendo edição manual por agente.

## Acesso master de líderes

- [x] Reconhecer os líderes informados durante o cadastro e perguntar pela função de liderança.
- [x] Armazenar a função escolhida e aplicar permissão master somente a líderes elegíveis.
- [x] Criar painel geral de líderes com busca, filtros e visão consolidada de agentes.
- [x] Garantir que agentes comuns não consigam consultar dados de outros usuários.

## Estrutura organizacional e filtros

- [x] Criar campos persistidos de regional, distrito, polo e rota no perfil do agente.
- [x] Disponibilizar as listas de regional, distrito e polo fornecidas, com opção Outros e entrada livre.
- [x] Exibir e permitir a edição da estrutura organizacional no perfil do agente.
- [x] Adicionar filtros de regional, distrito, polo e agente ao painel master de líderes.
- [x] Validar edição, persistência e filtros e publicar no mesmo endereço.
- [x] Adicionar teste automatizado para persistir e reler regional, distrito, polo e rota do perfil.
- [x] Adicionar teste automatizado da filtragem master por regional, distrito e polo com controle de permissão.
- [x] Registrar a evidência de validação ponta a ponta da persistência e dos filtros organizacionais.
- [x] Adicionar teste de integração de atualização e releitura do perfil organizacional.
- [x] Adicionar teste de integração da visão master com filtros organizacionais e bloqueio de perfil comum.

## Correção de base na Migração M1

- [x] Remover a coluna de segmento da tabela de clientes.
- [x] Calcular automaticamente a base por MCC, proposta e tier usando os valores comprovados dos cards.
- [x] Adicionar base manual opcional por cliente, prevalecendo sobre a sugestão automática.
- [x] Validar o caso de alimentação MCC 5812 com TPV de R$ 30 mil e publicar no mesmo link.

## Projeto Ulisses: Fiorati

- [x] Renomear a marca do aplicativo para Projeto Ulisses: Fiorati.
- [x] Criar card finalizado do mês anterior com KPI global, TPV migrado, multiplicador e volumes por tier.
- [x] Criar ranking anônimo Tio Patinhas com RV realizada, TPV e contagem de clientes por faixa relevante.
- [x] Exibir no ranking geral o nome do agente e a linha Polo · Distrito cadastrada no perfil.
- [x] Criar tabelas de carteira da base e carteira de leads compartilhadas por rota.
- [x] Permitir importação de planilhas Excel de carteira da base e carteira da rota por líderes e agentes.
- [x] Exibir automaticamente ao agente as carteiras já importadas para a mesma rota por qualquer responsável.
- [x] Exibir PSV Líder com os leads da rota correspondente ao agente.
- [x] Adicionar recomendações de conteúdo conforme os principais gaps do RMR.
- [x] Validar permissões, importação, ranking anônimo e cards antes de publicar no mesmo link.

## Identidade Stone e narrativa Projeto Ulisses

- [x] Pesquisar a identidade visual atualizada da Stone em fontes oficiais e posts recentes.
- [x] Definir uma direção visual que conecte Stone e o imaginário da Odisseia sem reproduzir marcas de terceiros.
- [x] Criar símbolo e logos proprietários do Projeto Ulisses: Fiorati com capacete/guarda grego em verde-musgo.
- [x] Aplicar cores, tipografia, ícones, fundos e componentes do novo sistema visual em todo o aplicativo.
- [x] Revisar visualmente a experiência em desktop e celular.
- [x] Publicar a atualização no mesmo endereço e entregar os arquivos de logo em PNG ou JPEG.
- [x] Confirmar o símbolo final e criar uma variação de lockup do Projeto Ulisses para entrega em PNG.
- [x] Revisar o tema Stone–Odisseia nas telas de Perfil, PSV, Carteiras, Card final, Liderança e RMR.

## Tutoriais do Projeto Ulisses

- [x] Elaborar guia A4 de uma página para agentes.
- [x] Elaborar guia A4 de uma página para donos de polo.
- [x] Elaborar guia A4 de uma página para líderes distritais.
- [x] Diagramar os três tutoriais com identidade Stone–Odisseia e exportar em PDF.
- [x] Revisar a legibilidade dos três PDFs e entregar os arquivos.

## Correções e contexto Projeto Ulisses 2026

- [x] Corrigir a validação do KPI global no Card final para aceitar superação acima de 150%.
- [x] Corrigir o carregamento do símbolo do Projeto Ulisses em todos os tamanhos de tela.
- [x] Reforçar o contraste entre textos, botões, campos e superfícies, especialmente em celular.
- [x] Adicionar um card curto explicando Ulisses, Ítaca, gamificação e o convite à colaboração de código aberto.
- [x] Validar o salvamento do Card final, as imagens e o novo card em desktop e celular antes de publicar.

## Autenticação Stone e carteiras distritais

- [x] Restringir novos cadastros a e-mails @stone.com.br, preservando a exceção administrativa autorizada.
- [x] Exibir a mensagem temática de bloqueio para qualquer cadastro fora do domínio Stone.
- [x] Manter a confirmação por código documentada para ativação futura, após a configuração de domínio próprio.
- [x] Configurar a conta administrativa autorizada com acesso total a todas as áreas e hierarquias.
- [x] Criar importação Excel de carteira distrital por líderes distritais.
- [x] Distribuir automaticamente carteira de base e carteira de leads por rota, mantendo linhas sem rota compatível em espera.
- [x] Exibir as carteiras distribuídas nos painéis Carteira da base, Carteira da rota e PSV Líder dos agentes.
- [x] Validar cadastro Stone sem confirmação por código, privilégios administrativos, importação e distribuição antes de publicar.
- [x] Registrar a reativação futura da confirmação por código quando houver domínio verificado; execução adiada a pedido do usuário.
- [x] Liberar o cadastro direto de fioratigabriel.8@gmail.com como Master e normalizar suas permissões administrativas sem expor credenciais.
- [x] Criar o fluxo “Esqueci minha senha” com solicitação, confirmação por código e nova senha sem perda de dados privados.
- [x] Viabilizar a entrega de código de redefinição para e-mails Stone por domínio remetente verificado ou fallback temporário seguro.
- [x] Adicionar validação integrada ponta a ponta do reset via tRPC para solicitação, confirmação e troca efetiva de senha.
- [x] Configurar `fiorati@novaodisseia.com` como remetente de recuperação de senha e confirmar a entrega segura a uma caixa de teste autorizada.
- [x] Revalidar `novaodisseia.com` no Resend após a confirmação de domínio feita pelo usuário.
- [x] Confirmar a entrega real de recuperação de senha para uma caixa Stone autorizada, antes de declarar o fluxo operacional para o time.
- [x] Enviar a validação autorizada para o endereço corporativo Stone corrigido pelo usuário e registrar a confirmação de recebimento.

## Prospecção Cavalo de Tróia

- [x] Revisar os materiais enviados pelo usuário e definir critérios de mapeamento de leads.
- [x] Modelar um funil de Prospecção Cavalo de Tróia com pesquisa, contato, visita e avanço comercial.
- [x] Definir pesquisa segura em fontes públicas para CNPJ, região, mercado, concorrentes, parceiros e referências.
- [x] Criar scripts de agendamento por ligação e roteiro de visita PAP presencial.
- [x] Priorizar leads de carteira por meta, RV alvo e potencial, com opção de pesquisa manual por CNPJ ou nome.
- [x] Implementar a nova ferramenta no aplicativo após a confirmação dos materiais e das fontes autorizadas.

## Materiais Stone, PSV e RMR

- [x] Extrair os princípios de abordagem, agendamento, produto e pesquisa dos materiais enviados.
- [x] Atualizar a PSV com as rotinas e cadências aplicáveis dos playbooks.
- [x] Adicionar à PSV o resultado e plano do dia, roteiro semanal e preparação das 20–30 oportunidades usando dados persistidos do funil.
- [x] Validar visualmente a PSV com os rituais operacionais do playbook além da cadência numérica.
- [x] Atualizar a RMR com indicadores, rituais e recomendações aplicáveis dos materiais.
- [x] Registrar na RMR causa-raiz, ação, responsável, resultado esperado e prazo, vinculados aos indicadores reais do período.
- [x] Definir a pesquisa automática de fontes públicas para o Cavalo de Tróia com rastreabilidade de fonte e revisão do agente.
- [x] Implementar a primeira versão somente com fontes públicas gratuitas, sem APIs pagas ou cobrança por consulta.

## Hierarquia de Agente, Polo e Distrito

- [x] Permitir que o perfil selecione explicitamente Agente, Dono de Polo ou Distrital.
- [x] Aplicar permissões por papel para visão de agentes, líderes e carteiras em Excel.
- [x] Exibir para Donos de Polo indicadores de TPV, novos clientes e evolução dos agentes frente à meta mensal.
- [x] Exibir para Distritais indicadores consolidados e visão dos líderes sob seu distrito.
- [x] Ocultar card individual de metas para Donos de Polo e Distritais.
- [x] Validar isolamento de dados, importação por hierarquia e responsividade antes de publicar.
- [x] Criar na visão distrital uma seção explícita para acompanhar apenas os líderes do distrito, separada da visão geral de agentes.
- [x] Adicionar teste automatizado para confirmar que a visão distrital lista líderes do próprio distrito e exclui líderes de outros distritos.

## Estratégia Nórdica

- [x] Exibir na Estratégia Nórdica o resumo mensal de plano, realizado, GAP e ritmo semanal derivado do Período e de registros reais.
- [x] Criar a aba Estratégia Nórdica para consolidar plano, realizado, GAP e ritmo semanal.
- [x] Conectar metas de tarefas, propostas, TPV, novos clientes e KPI aos registros reais de RMR, card final e simulações.
- [x] Criar checklist de clientes e ativações com TPV real, TPV projetado, produtos, D+15, D+30 e RV estimada.
- [x] Organizar automaticamente funil quente, lista 100k+ e priorização por tier, segmento e próximo contato.
- [x] Permitir planejar microrrotas diárias por cliente, região, data e status de visita.
- [x] Integrar Estratégia Nórdica aos dados de PSV, RMR e carteira sem criar registros fictícios.

## Período, modo rápido e reconhecimento mensal

- [x] Criar uma tela de período simplificada por quantidade de clientes nos tiers 7–15k, 15–30k, 30–50k, 50–100k e 100k+.
- [x] Pré-preencher RV média por tier em R$ 50, R$ 80, R$ 150, R$ 300 e R$ 800, mantendo edição manual opcional.
- [x] Usar a tela de período para consolidar conversão, objetivos, KPIs e insumos de PSV/RMR sem exigir matriz detalhada por cliente.
- [x] Automatizar pontos por PSV realizada e faixas de KPI global mensal, sem duplicar pontuação em registros repetidos.
- [x] Exibir troféus mensais para top 3 novos clientes, TPV e KPI global, com desempate por TPV e quantidade de clientes.
- [x] Criar acompanhamentos mensais para captar apenas os dados necessários e validar os cálculos com registros reais.

## Roteamento e carteiras históricas do polo

- [x] Incluir os tiers 15–30k e 30–50k no ranking anônimo Tio Patinhas.
- [x] Permitir importar Carteira da Base do Polo e Carteira do Funil do Pipe com competência histórica de, no mínimo, seis meses.
- [x] Criar cadastro permanente de rota com nome e e-mail do agente responsável, inclusive antes do primeiro cadastro no aplicativo.
- [x] Permitir ao líder atribuir ou alterar o responsável de cada rota e manter o vínculo quando o agente se cadastrar.
- [x] Garantir que o agente consulte somente as carteiras e os leads vinculados às rotas sob sua titularidade.
- [x] Validar por teste a separação de dados por rota, a atribuição por e-mail e a retenção histórica das carteiras.

## Integração consolidada de rotas e Super Pipe

- [x] Auditar os contratos atuais de carteiras, titularidade de rotas, Super Pipe e visão de liderança após a reconciliação compartilhada.
- [x] Fazer de `route_assignments` a fonte de autorização para a leitura de carteiras por agentes, incluindo reatribuição segura e vínculo por e-mail.
- [x] Finalizar a seleção de competência histórica e a cobertura de seis meses nas carteiras de base e do funil.
- [x] Integrar o Super Pipe com dados reais de carteira autorizada, filtros, conversões e oportunidades quentes por escopo organizacional.
- [x] Exibir os tiers 15–30k e 30–50k no Tio Patinhas e a seção específica de líderes na visão distrital.
- [x] Cobrir as regras de autorização e as novas visões com testes automatizados e validação visual responsiva.
- [x] Comprovar por teste a retenção e a seleção correta de seis competências mensais para Base e Funil do Pipe, com isolamento por rota.
- [x] Validar visualmente a navegação por seis competências e o estado vazio para uma competência sem registros.

## Cavalo de Tróia — versão pública e revisável

- [x] Criar dossiês privados de prospecção com estágio, hipóteses editáveis, fontes e histórico de pesquisa iniciada pelo agente.
- [x] Consultar CNPJ apenas sob ação explícita do agente e apresentar dados cadastrais públicos com fonte e data.
- [x] Sugerir prioridades semanais a partir da carteira formalmente autorizada, sem criar oportunidades nem fazer contato automático.
- [x] Incluir roteiros editáveis de ligação e visita PAP, com revisão obrigatória do agente antes de qualquer uso externo.
- [x] Avaliar fontes públicas adicionais além do CNPJ somente se houver contrato formal, custo zero e alternativa sem scraping; nesta versão, Google, Maps e Instagram permanecem links manuais.

## Campanhas de engajamento

- [x] Modelar campanhas privadas de liderança com objetivo, período, público, meta de participação e meta de impacto.
- [x] Restringir a criação, leitura e edição de campanhas ao polo, distrito ou administração autorizada.
- [x] Projetar alcance, participação esperada e impacto estimado a partir de agentes elegíveis e metas declaradas, sem fabricar resultados.
- [x] Criar uma tela exclusiva de líderes e distritais para planejar, acompanhar e encerrar campanhas.
- [x] Validar permissões, cálculos e responsividade antes de publicar a nova área.

## Identidade nominal Jornada do Herói

- [x] Atualizar o título, o metadado e os rótulos centrais de Calculadora de Remuneração Variável para Jornada do Herói - Stone, mantendo o domínio atual.
- [x] Substituir o lockup e os textos da tela de autenticação pela identidade Jornada do Herói - Stone.

## Endurecimento final de segurança

- [x] Auditar procedimentos de alteração, sessões, contas Master e exposição de rotas públicas.
- [x] Restringir alterações administrativas a contas autorizadas no servidor e registrar eventos críticos de gestão.
- [x] Reforçar limites, validações de entrada e respostas neutras nas superfícies públicas de autenticação.
- [x] Reduzir a exposição desnecessária de arquivos de desenvolvimento e documentar que o código do cliente não pode ser tornado secreto no navegador.
- [x] Validar o endurecimento com testes automatizados e publicar a versão final.

## SPARTACUS — desenvolvimento de competências

- [x] Consolidar catálogo de 20 hard skills e 20 soft skills com referências abertas e confiáveis.
- [x] Criar PDI privado que exige exatamente três hard skills e três soft skills selecionadas pelo usuário.
- [x] Gerar plano prático de estudo para blocos curtos, com texto, links de referência e roteiro de áudio acessível.
- [x] Criar prompt conversacional estruturado, copiável e contextualizado para praticar cada PDI em uma IA externa.
- [x] Preservar histórico privado de PDIs, validar persistência, responsividade e publicar no domínio existente.

## Administração e identidade Nova Odisseia

- [x] Auditar a conta administrativa autorizada e as regras atuais de exceção de cadastro fora do domínio Stone.
- [x] Promover a conta autorizada a administradora, com gestão segura de hierarquias, valores e eventos no servidor.
- [x] Atualizar título, metadados, lockups e textos públicos para Nova Odisseia: Fiorati.
- [x] Adicionar no Painel inicial um card conciso sobre a missão de desenvolver profissionais Outliers.
- [x] Cobrir a exceção e a permissão administrativa com testes, revisar responsividade e publicar no domínio existente.

## Progresso, exportações e notificações

- [x] Consolidar dados privados de PDI, PSV e RMR para acompanhamento e exportação.
- [x] Criar progresso declarativo de competências selecionadas e exibi-lo no painel inicial.
- [x] Criar notificações internas privadas quando um PDI for gerado.
- [x] Adicionar exportação em PDF com layout de impressão para PDI, PSV e RMR, sem expor dados de outros usuários.
- [x] Cobrir persistência, escopo de privacidade e exportação com testes; validar em desktop e celular e publicar.

## Mascote Fiodisseu

- [x] Criar o Fiodisseu como PNG sem fundo, mantendo a identidade visual de guerreiro da referência enviada.
- [x] Utilizar o Fiodisseu como ícone e ilustração discreta na navegação da Nova Odisseia.
- [x] Validar presença, contraste e responsividade do mascote e publicar a atualização.

## Lista Inteligente de Leads por link

- [x] Confirmar a origem autorizada do link da Lista Inteligente e o método de acesso corporativo permitido.
- [x] Validar domínio/origem, registrar data e origem da importação e bloquear links não aprovados.
- [x] Normalizar cliente, telefone, cidade, etapa, valor, última interação e próxima ação; remover duplicidades.
- [x] Exibir carteira privada por rota com filtros e lista de prioridades e integrar os campos permitidos ao perfil operacional do agente.
- [x] Cobrir leitura, deduplicação, escopo e responsividade com testes e publicar no domínio existente.

## Lista Inteligente — acesso direto

- [x] Adicionar uma aba Lista Inteligente à navegação de agentes.
- [x] Reutilizar o painel protegido de importação por link autorizado, sem duplicar a lógica de leitura.
- [x] Validar acesso por rota, estados de vazio e visual em desktop e celular.
- [x] Publicar o atalho de Lista Inteligente no domínio compartilhado.

## Lista Inteligente — relatório HTML oficial

- [x] Aceitar exclusivamente o host `apidata.googleusercontent.com` no formato de exportação temporária da Stone.
- [x] Exigir HTTPS, caminho de download esperado, arquivo `.html`, assinatura temporária e ausência de redirecionamentos.
- [x] Ler uma única tabela HTML com limite de tamanho e normalizar os mesmos campos da carteira.
- [x] Não persistir a URL completa nem a assinatura; registrar somente origem e data.
- [x] Preservar deduplicação e isolamento por rota formalmente atribuída.
- [x] Cobrir host, caminho, HTML malformado, normalização e escopo com testes sem acessar o link real.
- [x] Atualizar a orientação da interface e publicar no domínio atual.

## ÍTAKA — mensagem diária do agente

- [x] Validar as abas Banco de Mensagens e Instruções de Uso da planilha autorizada.
- [x] Mapear o dia do ano para frase, paráfrase da Odisseia, citação por Canto e tema.
- [x] Substituir a saudação inicial por ÍTAKA / dia-mês-ano e mensagem diária no painel do agente.
- [x] Testar a seleção dos dias, ausência de texto literal protegido e renderização responsiva.
- [x] Publicar a saudação diária no domínio existente.

## Período — comparativo semestral

- [x] Consolidar seis meses de registros privados do agente para comparação.
- [x] Adicionar no topo da aba Período um gráfico de barras com seletor de semestre.
- [x] Representar TPV realizado e meta de TPV sem criar dados fictícios.
- [x] Validar dados, estado vazio, acessibilidade e visual em desktop e celular.
- [x] Publicar o comparativo semestral no domínio existente.

## Remuneração por migração M0–M2 e carteira Hunter

- [x] Auditar o cálculo atual de venda nova, multiplicador e carteira Hunter contra os cards fornecidos.
- [x] Registrar por cliente o TPV acordado em M0, TPV migrado em M1, percentual de migração e mês de recebimento M2.
- [x] Incluir recebimentos de migrações tardias M−2 no valor de RV sem duplicar o TPV na meta de M1.
- [x] Tornar editável a alíquota da carteira Hunter, com suporte a 0,08%, 0,09% e 0,10%.
- [x] Exibir memória de cálculo separando RV de novos migrados, migração tardia, Hunter e multiplicador KPI.
- [x] Cobrir os cenários fornecidos, privacidade e responsividade com testes automatizados.
- [x] Publicar a atualização de cálculo no domínio compartilhado enquanto o domínio próprio aguarda apontamento confirmado.
- [x] Vincular `www.novaodisseia.com` ao projeto sem retirar o domínio atual até a confirmação de DNS.
- [x] Substituir o destino externo atual de `www.novaodisseia.com` somente após confirmação explícita do responsável.
- [x] Aplicar a vinculação autorizada de `www.novaodisseia.com` e validar a propagação sem desativar o domínio compartilhado.

## ÍTAKA — contraste da passagem diária

- [x] Aumentar a legibilidade da passagem e da citação no card escuro ÍTAKA.
- [x] Validar contraste e responsividade em desktop e celular.
- [x] Publicar a correção visual no domínio compartilhado.
