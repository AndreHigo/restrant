# Roadmap de Produto Final - Restaurant Brasil

Status atual: MVP funcional concluido. Produto comercial pronto estimado em 68%.

Este roadmap substitui a ideia de "MVP pronto" por uma trilha para deixar o sistema realmente confiavel, gostoso de usar e pronto para homologacao/producao em restaurante. Cada item deve virar commit pequeno, testado primeiro na branch `teste` e depois enviado para `master`.

## Leitura honesta do andamento

O primeiro ciclo MVP esta funcional, mas isso nao significa produto final pronto. O sistema ja tem base operacional, administrativa, comanda, caixa, estoque, compras, financeiro, relatorios, auditoria, RBAC e balanca simulada/manual. Para vender com seguranca como produto comercial ainda faltam principalmente integracoes reais, infraestrutura de producao, testes automatizados mais profundos e homologacao com o restaurante.

- Pequeno restaurante com operacao simples: perto de 70% pronto.
- Restaurante medio com equipe, caixa, estoque e compras recorrentes: perto de 60% pronto.
- Restaurante grande ou multioperacao: perto de 45% pronto.
- Produto comercial geral, considerando fiscal, hardware, deploy e suporte: 68%.

## Como medir 100%

O sistema so deve ser considerado 100% quando atender estes criterios:

- Fluxos principais testados com dados reais do restaurante.
- Garcom, caixa, balanca, cozinha/producao, estoque, compras e financeiro funcionando sem retorno inesperado de tela.
- Fiscal homologado conforme a escolha do cliente: SEFAZ direta ou provedor fiscal.
- Balanca fisica testada no equipamento real.
- Backup, restauracao, deploy, monitoramento e logs de producao configurados.
- Permissoes revisadas por papel real de funcionario.
- Testes automatizados cobrindo rotas, regras criticas e pelo menos os fluxos operacionais principais.
- Interface revisada para celular, balcao/caixa e uso rapido por codigo numerico.

## Legenda

- `[FEITO]`: pronto e validado no MVP.
- `[AJUSTAR]`: existe, mas precisa melhorar para uso real.
- `[FAZER]`: ainda nao existe.
- `[HOMOLOGAR]`: depende de teste com cliente, hardware, provedor externo ou dados reais.
- `[PRODUCAO]`: infraestrutura, seguranca, deploy e operacao continua.

## Fase 1 - Estabilidade e experiencia de uso

Objetivo: reduzir telas confusas, cliques desnecessarios e regressao visual.

Prioridade: muito alta.

- [FEITO] Revisar visualmente todas as telas principais em desktop e celular.
- [FEITO] Padronizar cabecalhos, botoes, filtros, tabelas e estados vazios.
- [AJUSTAR] Garantir botao de voltar/retorno em todas as telas operacionais e administrativas.
- [FEITO] Criar configuracao para habilitar modos de operacao: quilo, PF, cozinha, balcao, retirada, delivery e mesa.
- [AJUSTAR] Revisar telas que ainda dependem de selecao rigida e trocar por digitacao por codigo/nome.
- [FEITO] Melhorar a tela de pedidos/PDV com lancamento continuo por codigo ou nome.
- [FEITO] Melhorar tela do garcom para consulta, abertura, edicao e continuacao de comanda em uma jornada unica.
- [AJUSTAR] Melhorar tela de insumos para ficar mais clara: cadastro, saldo, custo, validade e movimentacao.
- [AJUSTAR] Revisar produtos para edicao rapida de preco, preco/kg, status fiscal e setor de producao.
- [AJUSTAR] Criar feedback visual consistente para erro, sucesso, carregamento e bloqueio por permissao.
- [AJUSTAR] Criar atalhos por teclado/codigo para caixa e demais rotinas do PDV.

Criterio de aceite:

- Fluxo garcom -> pedido -> cozinha/producao -> caixa funciona sem telas quebradas.
- Usuario consegue operar usando codigo numerico sem depender de listas longas.
- Smoke visual/manual aprovado nas principais rotas em desktop e celular.

## Fase 2 - Comandas, PDV e atendimento real

Objetivo: transformar o operacional em um PDV de restaurante realmente fluido.

Prioridade: muito alta.

- [FEITO] Comanda como fluxo principal.
- [FEITO] Criacao automatica de comanda digitada.
- [FEITO] Lancamento por codigo numerico de produto.
- [FEITO] Edicao auditada de quantidade, observacao e peso.
- [FEITO] Transferencia e uniao de comandas.
- [FEITO] Usar modos de operacao configurados para esconder canais nao usados no formulario completo de pedido.
- [FEITO] Expandir modos de operacao para esconder atalhos e menus operacionais nao usados.
- [FEITO] Bloquear acesso direto por URL para balanca, cozinha e producao quando os modos estiverem desabilitados.
- [FEITO] Manter garcom disponivel por comanda, independente do modo de atendimento por mesa.
- [FEITO] Adicionar regras ativaveis para peso manual, pagamento parcial, caixa aberto, baixa de estoque e auditoria de cancelamento.
- [FEITO] Aplicar no backend bloqueio de peso manual, pagamento parcial e baixa automatica de estoque conforme configuracao.
- [FEITO] Refletir peso manual, destinos da balanca e pagamento parcial na interface operacional.
- [FEITO] Bloquear criacao de pedido em canais desabilitados tambem pela API.
- [FEITO] Criar painel de prontidao operacional do dia com caixa, balanca, estoque, comandas e modos ativos.
- [FEITO] Expandir bloqueios por modo para futuros canais dedicados de delivery, retirada e balcao.
- [FEITO] Divisao rapida no caixa por total, metade, terco, varias formas e quantidade digitada de pessoas.
- [AJUSTAR] Divisao parcial de conta por item/valor/pessoa. Valor, pessoas e selecao de itens para calcular parcial avancados; baixa de item quitado ainda pendente.
- [FEITO] Reabrir/retomar comanda de forma mais direta.
- [FEITO] Criar historico completo da comanda com quem fez cada acao.
- [FEITO] Melhorar tela de fechamento para comanda grande com resumo de itens no caixa.
- [FEITO] Adicionar desconto geral e taxa com regra de permissao no caixa.
- [FEITO] Adicionar descontos por item com regra de permissao.
- [FEITO] Melhorar recibo/impressao com layout de cupom.
- [FEITO] Cancelamento com motivo padronizado.
- [FEITO] Nivel de aprovacao opcional para cancelamento de item.
- [FEITO] Expandir cancelamento auditado do pedido completo fora do caixa, com rota operacional e acao na comanda.
- [FEITO] Modo atendimento rapido de balcao/marmita com envio automatico ao setor.
- [FEITO] Controle de taxa de servico configuravel.

Criterio de aceite:

- Um atendimento completo pode ser feito por comanda sem acessar admin.
- Caixa consegue cobrar, dividir, estornar e imprimir com poucos passos.
- Wesley consegue ver o que cada garcom fez.

## Fase 3 - Balanca fisica e buffet por quilo

Objetivo: sair do modo manual/simulado e operar com hardware real.

Prioridade: muito alta para restaurante por quilo.

- [FEITO] Tela operacional de balanca.
- [FEITO] Cadastro de dispositivos e parametros por modelo.
- [FEITO] Tara, estabilidade e leituras minimas.
- [FEITO] Fallback manual auditado.
- [HOMOLOGAR] Identificar modelo real da balanca do cliente.
- [FAZER] Adaptador serial/USB/API por driver ou servico local.
- [FEITO] Captura automatica de peso estavel simulada com amostras, tara e variacao maxima.
- [FEITO] Bloqueio opcional para impedir peso manual sem permissao em pedidos, balanca e ajuste de item.
- [FEITO] Log detalhado de cada leitura: peso bruto, tara, peso liquido, dispositivo, operador e hora.
- [FEITO] Tela de balanca para digitacao rapida de comanda/produto por codigo e modo de repeticao.
- [FEITO] Ajustar tela de balanca para operacao continua com comanda fixa, confirmacao de pesagem, valor previsto e historico local.
- [HOMOLOGAR] Teste no restaurante com balanca real e varias pesagens seguidas.

Criterio de aceite:

- Operador digita a comanda, pesa o prato, confirma e o item cai na comanda correta.
- Se a balanca falhar, fallback manual fica auditado e visivel.

## Fase 4 - Cozinha, setores e producao

Objetivo: cada item ir automaticamente para o setor certo.

Prioridade: alta.

- [FEITO] Setores de producao.
- [FEITO] Fila por item do pedido.
- [FEITO] Status pendente, em preparo, pronto e entregue.
- [FEITO] Melhorar tela por setor para tablet/celular com atalhos grandes, contadores, proximos da fila e cards mais tocaveis.
- [AJUSTAR] Separar marmita, cozinha quente, bebidas, sobremesas e buffet quando fizer sentido.
- [FEITO] Prioridade e tempo de preparo por item com alerta de atraso no painel.
- [FEITO] Alerta visual/sonoro de novo pedido com opcao de silenciar na tela de producao.
- [FEITO] Painel de senha por setor usando codigo curto do pedido no card de producao.
- [FEITO] Motivo obrigatorio para cancelamento de producao com auditoria.

Criterio de aceite:

- Item de marmita aparece no setor de marmita.
- Item do garcom aparece no setor correto sem intervencao manual.
- Producao consegue atualizar status sem usar painel administrativo.

## Fase 5 - Estoque e ficha tecnica confiavel

Objetivo: estoque deixar de ser apenas registro e virar controle real de custo.

Prioridade: alta.

- [FEITO] Movimentacoes, inventario, perdas e validade.
- [FEITO] Baixa inicial por venda.
- [FEITO] Baixa por ficha tecnica com auditoria de custo, saldo anterior, saldo novo e CMV estimado da venda.
- [AJUSTAR] CMV por lote/custo historico no momento exato da venda.
- [AJUSTAR] Tratar produto sem ficha tecnica, produto por kg e produto pronto.
- [FEITO] Calcular CMV estimado por venda usando custo vigente do insumo/produto e registrar na auditoria.
- [FEITO] Alertas de estoque minimo por consumo medio recente e sugestao de cobertura para compra.
- [AJUSTAR] Controle de lote/validade por recebimento.
- [FEITO] Previsao inicial de compra sugerida por consumo medio recente.
- [AJUSTAR] Evoluir previsao de compra com sazonalidade, dia da semana, fornecedor preferencial e prazo de entrega.
- [FEITO] Travar venda opcional quando nao houver estoque para produto pronto e produto com ficha tecnica.
- [FEITO] Auditoria completa para ajuste manual de estoque com saldo anterior, saldo novo, diferenca, motivo e usuario.

Criterio de aceite:

- Venda impacta insumos corretos.
- Compra recebida alimenta estoque.
- Inventario ajusta divergencia com log.
- Relatorio de CMV bate com ficha tecnica.

## Fase 6 - Compras e entrada por nota/WhatsApp

Objetivo: compras alimentarem estoque e financeiro com conferencia.

Prioridade: alta, mas depois de PDV/balanca.

- [FEITO] Pedido rapido e recebimento parcial inicial.
- [AJUSTAR] Pedido de compra completo com status: rascunho, aprovado, enviado, recebido parcial, recebido total, cancelado. Cancelamento auditado de pedido ainda nao recebido implementado.
- [FEITO] Integracao automatica com contas a pagar ao receber compra, com retorno visivel na tela e auditoria financeira.
- [FEITO] Conferencia de divergencia entre pedido e recebido com status visual de aberto, parcial, conferido e cancelado.
- [FEITO] Sugestao de compra por estoque minimo e consumo medio preenchendo a compra rapida para revisao humana.
- [FAZER] Upload/manual de cupom fiscal ou nota.
- [FAZER] Entrada por WhatsApp via n8n/Evolution API.
- [FAZER] OCR/IA para extrair fornecedor, itens, quantidades, custos e impostos.
- [FAZER] Tela de conferencia humana antes de alterar estoque/financeiro.
- [FAZER] Historico do documento original, retorno da IA e auditoria.

Criterio de aceite:

- Compra recebida gera estoque e conta a pagar.
- Nota enviada por WhatsApp vira pre-lancamento conferivel.
- Nada altera estoque automaticamente sem aprovacao humana.

## Fase 7 - Financeiro e fechamento profissional

Objetivo: caixa e financeiro baterem com a rotina do restaurante.

Prioridade: alta.

- [FEITO] Caixa, sangria, suprimento, pagamento, estorno e fechamento.
- [FEITO] Contas a pagar/receber com baixa parcial.
- [FEITO] Conciliacao por forma de pagamento.
- [FEITO] Alertas de recebiveis vencidos e proximos de vencer no financeiro.
- [AJUSTAR] Fechamento por operador/turno.
- [AJUSTAR] Relatorio de divergencia de caixa mais claro.
- [FEITO] Controle simples de taxas de cartao/maquininha por forma de pagamento, com valor liquido estimado no financeiro.
- [FAZER] Plano de contas simples.
- [FAZER] DRE gerencial simplificada.
- [FAZER] Exportacao financeira para contador.
- [FAZER] Anexos/comprovantes em contas a pagar.

Criterio de aceite:

- Wesley consegue fechar o dia e enxergar recebido, pendente, divergencia, estorno e operador.
- Financeiro sabe o que deve pagar e receber.

## Fase 8 - Fiscal brasileiro

Objetivo: preparar emissao real, sem confundir estrutura com homologacao fiscal.

Prioridade: alta se o cliente precisar emitir pelo sistema.

- [FEITO] Cadastro fiscal basico de empresa e produtos.
- [AJUSTAR] Cadastro fiscal completo por produto: NCM, CFOP, CEST, origem, CSOSN/CST, aliquotas.
- [FAZER] Certificado digital A1.
- [FAZER] Escolher integracao: SEFAZ direta ou provedor fiscal.
- [FAZER] NFC-e vinculada a venda.
- [FAZER] NF-e para compras/saida quando aplicavel.
- [FAZER] Cancelamento, inutilizacao e contingencia.
- [FAZER] DANFE/NFC-e e historico fiscal operacional.
- [HOMOLOGAR] Ambiente de homologacao fiscal antes de producao.

Criterio de aceite:

- Venda gera documento fiscal real ou fila fiscal controlada.
- Erro fiscal nao trava o atendimento sem contingencia definida.

## Fase 9 - Relatorios e gestao

Objetivo: dar visao clara para decisao, nao apenas tabelas exportaveis.

Prioridade: media/alta.

- [FEITO] Relatorios de vendas, estoque, compras, financeiro, margem e desperdicio.
- [FEITO] CSV, PDF e impressao individual.
- [AJUSTAR] Dashboard com KPIs por periodo.
- [AJUSTAR] Filtros salvos por usuario.
- [AJUSTAR] Relatorios por garcom, setor, produto, horario e forma de pagamento.
- [AJUSTAR] Comparativo diario/semanal/mensal.
- [FAZER] Exportacao Excel real.
- [FAZER] Agendamento/envio automatico de relatorios.

Criterio de aceite:

- Dono acompanha venda, margem, desperdicio, caixa e desempenho de equipe sem montar planilha manual.

## Fase 10 - Seguranca, qualidade e producao

Objetivo: deixar o sistema operavel fora da maquina local.

Prioridade: obrigatoria antes de producao.

- [FEITO] Smoke, RBAC, fluxo operacional e simulacao de restaurante.
- [AJUSTAR] Separar configuracao por ambiente: desenvolvimento, homologacao e producao.
- [FAZER] Testes unitarios para regras criticas: estoque, pagamentos, estorno, RBAC, compras e balanca.
- [FAZER] Testes E2E com navegador para login, garcom, balanca, caixa, admin e financeiro.
- [FAZER] Pipeline CI/CD.
- [FAZER] Deploy de homologacao.
- [FAZER] Deploy de producao.
- [FAZER] Backup automatico do PostgreSQL.
- [FAZER] Teste de restauracao.
- [FAZER] Logs estruturados e monitoramento.
- [FAZER] Controle de erros e alertas.
- [FAZER] Rate limit em login, recuperacao de senha e APIs sensiveis.
- [FAZER] Bloqueio temporario por muitas tentativas de login.
- [FAZER] Revisao de permissoes criticas no backend, incluindo acoes de caixa, fiscal, estoque e financeiro.
- [FAZER] Indices de banco para rotas de alto volume: comandas, pedidos, itens, pagamentos, movimentos de estoque, auditoria e relatorios.
- [FAZER] Teste de carga leve para login, comanda, PDV, balanca, cozinha, caixa e relatorios.
- [FAZER] Metas de desempenho por rota: tempo medio, p95, erro maximo aceitavel e volume simultaneo esperado.
- [FAZER] Avaliar fila/background job para emissao fiscal, WhatsApp/OCR, relatorios grandes e tarefas demoradas.
- [FAZER] Cache controlado para dashboard, KPIs e consultas gerenciais que nao precisam ser em tempo real.
- [FAZER] Revisao LGPD operacional: dados pessoais, logs, retencao e acesso.
- [FAZER] Politica de senhas, expiracao opcional e bloqueio por tentativas.

Criterio de aceite:

- Alteracao so entra depois de teste.
- Banco tem backup e restauracao testada.
- Erros em producao sao rastreaveis.

## Blocos de entrega ate producao

Estes blocos devem guiar a ordem de trabalho. Cada bloco mistura funcionalidade, seguranca, desempenho e validacao, para entregar partes realmente usaveis e nao melhorias soltas. Cada bloco pode ter varios commits pequenos, sempre testados na branch `teste` antes de ir para `master`.

### Bloco A - Acesso, usuarios e permissoes

- [PARCIAL] Rate limit em login, recuperacao de senha e APIs sensiveis de autenticacao. Login com limite inicial implementado; recuperacao e demais APIs pendentes.
- [FEITO] Bloqueio temporario por muitas tentativas erradas no login, com HTTP 429, Retry-After, logs e auditoria.
- [FAZER] Politica de senha, expiracao opcional e auditoria de troca de senha.
- [FAZER] Revisao RBAC backend para rotas administrativas, operacionais e acoes sensiveis.
- [PARCIAL] Teste de carga leve no login e validacao de permissoes por perfil. Smoke de bloqueio de login criado; carga ampla ainda pendente.
- [FAZER] Documento de seguranca inicial com riscos, protecoes e pendencias.

Criterio de aceite: usuario sem permissao nao acessa tela, API nem acao sensivel; login abusivo e bloqueado, auditado e testado.

### Bloco B - Atendimento por comanda, garcom e PDV

- [AJUSTAR] Fluxo mobile de garcom com validacao visual em celular.
- [AJUSTAR] Divisao parcial de conta por item, valor e pessoa.
- [FAZER] Indices para comandas, pedidos, itens e pagamentos.
- [FAZER] Revisao de permissoes para criar, editar, transferir, unir, cancelar e cobrar comandas.
- [FAZER] Teste de carga leve para abertura de comandas, lancamento de itens, cozinha e caixa.
- [FAZER] QA de fluxo completo: garcom -> producao -> caixa -> recibo.

Criterio de aceite: atendimento completo por comanda funciona de ponta a ponta em desktop e celular, com permissao, auditoria e resposta rapida.

### Bloco C - Caixa, financeiro e fechamento

- [AJUSTAR] Fechamento por operador/turno.
- [AJUSTAR] Caixa com relatorio de divergencia claro.
- [FAZER] Plano de contas simples, DRE gerencial e exportacao financeira para contador.
- [FAZER] Revisao de permissoes para sangria, suprimento, desconto, estorno, fechamento e baixa financeira.
- [FAZER] Indices para cash registers, payments, accounts payable e accounts receivable.
- [FAZER] Teste de carga leve para pagamento, fechamento diario e consultas financeiras.

Criterio de aceite: Wesley consegue operar como caixa, fechar turno, ver divergencias e auditar quem fez cada movimentacao.

### Bloco D - Estoque, compras e entrada de nota

- [AJUSTAR] CMV por lote/custo historico e controle de validade por recebimento.
- [FAZER] Upload de nota/cupom de compra com conferencia humana.
- [FAZER] Entrada de nota/cupom por WhatsApp via n8n/Evolution API e OCR/IA.
- [FAZER] Revisao de permissoes para ajuste de estoque, perdas, recebimento e aprovacao de compra.
- [FAZER] Indices para movimentos de estoque, saldos, compras, itens de compra e auditoria.
- [FAZER] Teste de carga leve para recebimento, baixa por venda, inventario e relatorios de estoque.

Criterio de aceite: compra recebida alimenta estoque e financeiro com conferencia, CMV rastreavel e auditoria completa.

### Bloco E - Balanca, fiscal e integracoes reais

- [FAZER] Adaptador de balanca fisica serial/USB/API isolado.
- [FAZER] Teste com modelo real da balanca e varias pesagens seguidas.
- [FAZER] Fila fiscal operacional para NFC-e/NF-e.
- [FAZER] Certificado A1, configuracao de homologacao e tratamento de erro fiscal.
- [FAZER] Revisao de permissoes para peso manual, contingencia, emissao, cancelamento e inutilizacao fiscal.
- [FAZER] Fila/background job para fiscal e integracoes demoradas.

Criterio de aceite: balanca real e fiscal funcionam em homologacao sem travar atendimento, com fallback, contingencia e auditoria.

### Bloco F - Relatorios, dashboard e desempenho gerencial

- [AJUSTAR] Dashboard com KPIs por periodo.
- [AJUSTAR] Relatorios por garcom, setor, produto, horario e forma de pagamento.
- [FAZER] Exportacao Excel real e agendamento/envio automatico de relatorios.
- [FAZER] Cache controlado para dashboard, KPIs e consultas gerenciais.
- [FAZER] Indices para relatorios de vendas, estoque, financeiro, auditoria e margem.
- [FAZER] Teste de carga leve em relatorios grandes e metas de tempo medio/p95.

Criterio de aceite: dono acompanha indicadores sem montar planilha manual e sem travar o operacional.

### Bloco G - Infraestrutura, producao e continuidade

- [FAZER] Separar ambientes: desenvolvimento, homologacao e producao.
- [FAZER] CI/CD com testes obrigatorios.
- [FAZER] Deploy de homologacao e deploy de producao.
- [FAZER] Backup automatico do PostgreSQL e teste de restauracao.
- [FAZER] Logs estruturados, monitoramento, alertas e controle de erros.
- [FAZER] Revisao LGPD operacional: dados pessoais, logs, retencao e acesso.

Criterio de aceite: sistema roda fora da maquina local com backup, restauracao testada, erro rastreavel e governanca minima.

## Ordem recomendada dos proximos commits

1. [PARCIAL] Bloco A: rate limit, bloqueio temporario, RBAC backend e teste de login/permissao. Bloqueio de login entregue; RBAC amplo e carga ainda pendentes.
2. [AJUSTAR] Bloco B: fluxo de comanda/PDV com divisao parcial, indices e teste de carga operacional.
3. [AJUSTAR] Bloco C: fechamento por operador/turno, divergencia de caixa e permissoes financeiras.
4. [AJUSTAR] Bloco D: CMV por lote, validade por recebimento e seguranca em estoque/compras.
5. [FAZER] Bloco D: upload de nota/cupom com conferencia humana.
6. [FAZER] Bloco E: adaptador de balanca fisica e teste com hardware real.
7. [FAZER] Bloco E: fila fiscal NFC-e/NF-e com ambiente de homologacao.
8. [AJUSTAR] Bloco F: dashboard/relatorios com cache, indices e metas de desempenho.
9. [FAZER] Bloco G: backup automatico, teste de restauracao e deploy de homologacao.
10. [FAZER] Bloco G: CI/CD, monitoramento, logs estruturados e revisao LGPD.

## Bloqueadores externos para 100%

- Modelo real da balanca e protocolo de comunicacao.
- Certificado digital A1 do cliente.
- Definicao fiscal: SEFAZ direta ou provedor fiscal.
- Dados reais do restaurante para homologar produtos, impostos, formas de pagamento e operacao.
- Ambiente de hospedagem escolhido para homologacao e producao.
- Politica de backup, retencao de logs e usuarios responsaveis.

## Percentual por area

- Experiencia de uso: 69%
- Operacao/PDV/comandas: 87%
- Balanca real: 45%
- Cozinha/producao: 60%
- Estoque/CMV: 66%
- Compras: 55%
- Financeiro: 70%
- Fiscal real: 25%
- Relatorios/gestao: 66%
- Seguranca de producao: 45%
- Desempenho/carga: 30%
- Producao/infra/testes: 35%

Percentual geral estimado para produto comercial pronto: 68%.
