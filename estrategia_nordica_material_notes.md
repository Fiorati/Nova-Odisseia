# Estratégia Nórdica — leitura dos quadros de organização

## Quadro mensal de agosto

O cabeçalho traz identificação da rota, mês, dias úteis, dias corridos e data de referência. A área de meta acompanha contagens por tier de TPV: **30–50k, 50–100k, 100–200k e 200k+**. Para agosto, o quadro mostra 26 dias úteis, 25 dias corridos e referência em 26/08/2026. O acompanhamento separa linhas **Atual**, **Meta** e **GAP**, além de **RV atual**, **RV projeção** e **TPV projetado**.

No exemplo, os valores legíveis são: atual de 3, 8, 5 e 0; meta de 8, 5, 5 e 1; gap de 5, -3, 0 e 1; TPV projetado de R$ 585.000,00; RV atual de R$ 0,00; e RV projetada de R$ 10.034,00. A aplicação deve derivar esses totais de dados salvos, deixando explícito quando algum item depender de preenchimento manual.

## Plano, realizado, GAP e semana

O segundo quadro compara **Plano Agosto** e **Realizado Agosto**. Os campos de plano verificados são: tarefas de venda, novas propostas, novos clientes 30–50k, 50–100k, 100–200k, 200k+, total de novos clientes e TPV total. Como indicadores auxiliares, há CV1, CV2, TPV M-1, TPV M1–M4 e KPI global.

No exemplo, o plano mostra 210 tarefas de venda, 42 novas propostas, 8 clientes de 30–50k, 5 de 50–100k, 5 de 100–200k, 0 de 200k+, 18 clientes e TPV total de R$ 1.000.000,00. O realizado mostra 169 tarefas, 58 propostas, 4, 8, 2 e 0 clientes por tier, 14 clientes e TPV total de R$ 735.000,00, com CV1 de 34,32%, CV2 de 24,14%, TPV M-1 de R$ 688.400,00, TPV M1–M4 de R$ 905.871,73 e KPI global de 200,00%.

Há ainda colunas de **GAP Mês** e **Semana** para tarefas, propostas, cada tier, total de clientes e TPV. A implementação deve calcular a coluna semanal a partir do saldo do mês e dos dias úteis restantes, em vez de copiar valores fixos do exemplo.

## Mapa de microrrotas

O mapa de visitas é organizado em blocos por região/microrrota, cada um com coluna **Dia** e uma lista de estabelecimentos. Os grupos legíveis incluem “José Ermírio e derredores”, “Av. Nova Cantareira e derredores” e “Maria Amália e derredores”. O mesmo estabelecimento pode carregar o marcador “Lista 100K”, que deve vir da priorização e não de texto livre.

Exemplos de datas do quadro são “TER 21” e “QUA 22”. A nova agenda precisa, portanto, persistir: região da microrrota, data planejada, cliente ou lead relacionado, prioridade, objetivo da visita, status de execução e observação. Itens de microrrota sem cliente previamente salvo devem poder ser incluídos manualmente, sem que isso seja confundido com uma venda ou ativação realizada.

## Novos ativos e ativações

As tabelas “Novos Ativos” acompanham por cliente: Stonecode, TPV real, TPV projetado, produtos, marcos D+15 e D+30 e RV. Há também um multiplicador aplicado à projeção. A nova área deve disponibilizar o mesmo checklist por cliente, mas separar claramente valores informados do realizado e da projeção calculada.

Os exemplos também apresentam células de erro de planilha (`#VALUE!` e `#DIV/0!`). A Estratégia Nórdica não deve reproduzir erros técnicos: quando não houver dados suficientes para TPV projetado ou RV, deve exibir “Aguardando dado” e explicar o campo necessário. A RV estimada deve usar apenas a matriz/simulação existente ou um valor manual confirmado pelo agente; nunca deve ser inventada.

## Funil quente e Lista 100k+

O último quadro separa duas listas operacionais: **Quentes** e **Lista 100K+**. Cada entrada tem cliente, tier e segmento. A lista de 100k+ contém exemplos de tiers 100–200k e 200k+, enquanto o funil quente pode conter clientes em qualquer tier com prioridade comercial elevada.

A automação deve classificar leads do PSV e da carteira por dados já existentes: temperatura, TPV projetado, segmento, etapa e próxima data. O agente continuará podendo ajustar a prioridade, porque o sistema não deve inferir uma chance de fechamento que não esteja registrada. A lista 100k+ será uma visão derivada dos leads cujo TPV projetado seja de pelo menos R$ 100.000,00; o funil quente será derivado da temperatura “quente”.

## Decisões de implementação

O perfil continuará armazenando a função organizacional como `none`, `polo` ou `distrital`, exibida na interface como **Agente**, **Dono de Polo** e **Distrital**. A escolha será explícita no perfil e no cadastro, porém a concessão de acesso a dados de equipe continuará validada no servidor para impedir elevação indevida de privilégios.

O Dono de Polo verá somente agentes com o mesmo polo e poderá importar planilhas cujas rotas já cadastradas pertençam ao seu polo; rotas ainda não vinculadas permanecem aguardando associação. O Distrital verá dados do próprio distrito, incluindo os Donos de Polo, e poderá fazer a importação distrital. O administrador mantém acesso integral.

As metas coletivas precisam de **TPV alvo** e **novos clientes alvo**. O realizado será agregado de cards finais e, quando não existir card, da última RMR/simulação registrada de cada agente. A tela nunca criará resultados fictícios: ausência de registro aparecerá como “Sem resultado registrado”.

Para Estratégia Nórdica, serão persistidos planejamentos manuais de ativação e microrrota. As listas de quentes, 100k+, histórico e projeção serão derivadas do funil PSV, carteira e simulações existentes; a agenda de visitas apenas referencia um cliente/lead ou guarda um nome manual até que seja associado.
