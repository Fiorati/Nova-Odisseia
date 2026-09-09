# Consolidação de materiais — Prospecção Cavalo de Tróia

## IA aplicada à venda

O e-book **Como usar Inteligência Artificial para vender mais?** apresenta a IA como apoio ao trabalho comercial, voltado a tornar a equipe mais eficiente e estratégica, e não como substituta da avaliação humana. A página conceitual também reforça que o modelo reconhece padrões e probabilidades, mas não compreende o contexto por si só. No Cavalo de Tróia, isso será traduzido em: pesquisa automatizada com fonte identificada, hipóteses claramente rotuladas e revisão obrigatória do agente antes de contato ou registro no funil.

As páginas de aplicação reforçam o uso da IA para acelerar respostas repetitivas e liberar tempo para o atendimento e o diagnóstico que exigem julgamento humano. No produto, isso aponta para: resumo automático do lead, perguntas sugeridas, roteiro editável e recomendação de próximo passo — nunca envio automático de mensagens, ligações ou alterações de dados sem ação explícita do agente.

## PSV e RMR

O **Mega PSV do Polo** organiza a rotina semanal em resultado/plano do dia, atualização do pipe, seleção de oportunidades e clientes, roteiro semanal e preparação de oportunidades. O material orienta selecionar e preparar de 20 a 30 oportunidades conforme o desafio, combinar oportunidades de venda e vida, e ajustar a estratégia diária de acordo com suficiência e preparação do funil.

O **Mega RMR do Agente** define a reunião mensal como análise de acompanhamentos, indicadores e alavancas, seguida de problemas, causas-raiz, plano de ação, responsáveis e resultado esperado. A rotina é pensada para até 60 minutos.

O **Rota Verde** reforça uma atuação consultiva organizada em conexão, diagnóstico, negociação, compromissos e fechamento, além de relacionamento no pós-venda. A preparação deve classificar o perfil de TPV do empreendimento e investigar necessidades de vender, gerir e girar. Os diferenciais esperados na interação são confiança, presença e facilidade.

O material **MEGA Polos** organiza os pilares Conquistar, Servir, Buscar a Excelência e Vencer em Time. Para a primeira versão, os pontos diretamente acionáveis são visitas de venda, novas propostas, novos clientes, execução de planejamento semanal, qualidade de diagnóstico e adesão às rotinas de acompanhamento.

O folder de soluções e o material de RAV serão usados apenas como repertório de hipóteses e perguntas de diagnóstico, sem prometer elegibilidade, taxa, crédito ou condição comercial. O agente deverá confirmar condições vigentes e adequação na conversa com o cliente.

## Pesquisa gratuita — primeira versão

A primeira versão usará a rota pública `GET /cnpj/v1/{cnpj}` da BrasilAPI como consulta automática cadastral. A documentação informa retorno de dados empresariais, situação cadastral, atividades econômicas, endereço, porte e quadro societário, com respostas explícitas para CNPJ inválido ou não encontrado. A pesquisa será executada somente por ação do agente e o dossiê manterá o link da fonte e a data da consulta.

Fonte oficial consultada: https://brasilapi.com.br/docs#tag/CNPJ

Para presença digital e contexto de mercado, a interface criará links de pesquisa por nome e município para site, Google Maps, Instagram e busca web. Ela não fará scraping de redes sociais, não automatizará contatos e não apresentará dados pessoais não públicos. Qualquer hipótese sobre dor, concorrência, parceiro ou tomador de decisão será tratada como hipótese a validar pelo agente.

### Avaliação complementar de fontes públicas sem custo — 27/08/2026

A documentação da BrasilAPI confirma que `GET /cnpj/v1/{cnpj}` retorna dados cadastrais empresariais, situação, atividades e localização, com respostas explícitas para CNPJ inválido ou não encontrado. A versão atual restringe a persistência ao resumo cadastral necessário e não armazena e-mail, telefone nem quadro societário, embora a fonte possa expor campos adicionais.

As APIs públicas de CEP (ViaCEP) e de localidades (IBGE) foram avaliadas como complementares geográficos, mas não ampliam o diagnóstico empresarial quando o CNPJ já informa município e UF. Por isso, não foram integradas nesta fase: adicionar consultas redundantes não melhora a preparação do lead e ampliaria o volume de fontes a revisar. Pesquisa em Google, Maps e Instagram permanece como link manual iniciado pelo agente, sem scraping.

Fontes consultadas: https://brasilapi.com.br/docs#tag/CNPJ ; https://viacep.com.br/ ; https://servicodados.ibge.gov.br/api/docs/localidades

## Agendamento consultivo

O treinamento e o playbook de agendamento reforçam que a ligação deve abrir contexto e conduzir para a reunião, não tentar vender tudo. A preparação deve considerar segmento, região, referências e possíveis dores. A abordagem deve conter abertura natural, contexto, microdiagnóstico breve, direcionamento e duas alternativas fechadas de horário. Cadência sugerida: tentativas de ligação em dias distintos, mensagem curta, áudio breve e visita presencial quando aplicável.
