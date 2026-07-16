# Roadmap de Produto Final - Restaurant Brasil

Status atual: MVP funcional concluido. Produto final estimado em 96%.

Este roadmap substitui a ideia de "MVP pronto" por uma trilha para deixar o sistema realmente confiavel, gostoso de usar e pronto para homologacao/producao em restaurante. Cada item deve virar commit pequeno, testado primeiro na branch `teste` e depois enviado para `master`.

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
- [FEITO] Melhorar tela por setor para tablet/celular com atalhos grandes, contadores e cards mais tocaveis.
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
- [AJUSTAR] Baixa por ficha tecnica com regras robustas.
- [AJUSTAR] Tratar produto sem ficha tecnica, produto por kg e produto pronto.
- [AJUSTAR] Calcular CMV por venda usando custo vigente do insumo.
- [AJUSTAR] Alertas de estoque minimo por consumo medio.
- [AJUSTAR] Controle de lote/validade por recebimento.
- [FAZER] Previsao de compra sugerida por consumo.
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
- [AJUSTAR] Integracao automatica com contas a pagar ao receber compra.
- [FEITO] Conferencia de divergencia entre pedido e recebido com status visual de aberto, parcial, conferido e cancelado.
- [FEITO] Sugestao de compra por estoque minimo preenchendo a compra rapida para revisao humana.
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
- [FAZER] Revisao LGPD operacional: dados pessoais, logs, retencao e acesso.
- [FAZER] Politica de senhas, expiracao opcional e bloqueio por tentativas.

Criterio de aceite:

- Alteracao so entra depois de teste.
- Banco tem backup e restauracao testada.
- Erros em producao sao rastreaveis.

## Ordem recomendada dos proximos commits

1. [FEITO] Revisar visual da tela do garcom e reduzir poluicao das telas principais.
2. [FEITO] Melhorar tela de pedidos/PDV para uso por codigo ou nome em fluxo continuo.
3. [FEITO] Ajustar tela de balanca para operacao real: comanda fixa, peso, tara, confirmacao e auditoria.
4. [PARCIAL] Fortalecer comanda: historico por usuario, divisao de conta e recibo melhor.
5. Melhorar cozinha/producao por setor, com alertas e layout de tablet.
6. Robustecer baixa por ficha tecnica e CMV.
7. Evoluir compras com status completo e contas a pagar automaticas.
8. Criar camada de homologacao para balanca fisica.
9. Definir integracao fiscal real.
10. Preparar CI/CD, backup e testes E2E.

## Percentual por area

- Experiencia de uso: 69%
- Operacao/PDV/comandas: 87%
- Balanca real: 45%
- Cozinha/producao: 55%
- Estoque/CMV: 58%
- Compras: 49%
- Financeiro: 70%
- Fiscal real: 25%
- Relatorios/gestao: 66%
- Producao/infra/testes: 35%

Percentual geral estimado para produto final: 96,5%.
