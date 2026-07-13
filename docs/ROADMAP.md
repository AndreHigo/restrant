# Roadmap do Restaurant Brasil

Percentual atual estimado: 99%

Este arquivo acompanha a ordem de execucao do projeto. A cada funcionalidade entregue, o checklist deve ser atualizado no mesmo commit da implementacao.

## Legenda

- `[MVP]`: existe uma versao funcional testada no sistema.
- `[PARCIAL]`: existe base ou parte do fluxo, mas ainda nao fecha a necessidade completa.
- `[PENDENTE]`: ainda nao foi implementado.
- `[PRODUCAO]`: funciona no MVP, mas ainda precisa robustez, testes, seguranca ou integracao real para producao.

## Regra de acompanhamento

- Subir primeiro na branch `teste`, validar, depois avancar `master`.
- Marcar como `[MVP]` somente quando houver codigo, build/teste e commit.
- Marcar como `[PARCIAL]` quando existir modelagem, tela ou endpoint, mas o fluxo ainda estiver incompleto.
- Marcar como `[PRODUCAO]` quando o MVP funciona, mas ainda falta maturidade para uso real continuo.
- Atualizar percentual e checklist no mesmo commit da funcionalidade entregue.
- Manter commits pequenos, com titulo e descricao em portugues.

## Etapa 1 - Fundacao, autenticacao e layout

Status: base funcional, ainda precisa maturidade de producao.

- [MVP] Estrutura Next.js, TypeScript, Prisma e PostgreSQL.
- [MVP] Docker/Postgres configurado para desenvolvimento.
- [MVP] Seeds iniciais com usuario admin e dados de exemplo.
- [MVP] Login com JWT/cookie e fallback POST seguro.
- [MVP] Logout e recuperacao de senha com token seguro, expiracao e auditoria.
- [MVP] RBAC com usuarios, perfis e permissoes.
- [MVP] Protecao de rotas por permissao.
- [MVP] Layout administrativo.
- [MVP] Layout operacional.
- [MVP] Menu lateral agrupado e revisado visualmente.
- [MVP] Central de configuracoes com parametrizacoes agrupadas.
- [MVP] Tela completa de usuarios com edicao e manutencao.
- [MVP] Edicao do proprio perfil com identificador flexivel e auditoria.
- [MVP] Tela completa de perfis/permissoes com edicao segura.
- [MVP] Testes automatizados de autenticacao e permissao.
- [MVP] Hardening de sessao, cookies, expiracao e trilha de acesso.

## Etapa 2 - Cadastros principais

Status: MVP de criacao/listagem, sem manutencao completa.

- [MVP] Categorias.
- [MVP] Produtos.
- [MVP] Tela dedicada de produtos com KPIs, status e busca.
- [MVP] Insumos.
- [MVP] Tela dedicada de insumos com KPIs, status e busca.
- [MVP] Validacoes visuais na tela dedicada de insumos.
- [MVP] Clientes.
- [MVP] Fornecedores.
- [MVP] Funcionarios.
- [MVP] Mesas.
- [MVP] Comandas.
- [MVP] Formas de pagamento.
- [MVP] Layout dos cadastros revisado para nao ficar apertado.
- [MVP] Edicao de registros iniciada por produtos, insumos, clientes, fornecedores, mesas, comandas, categorias, funcionarios e formas de pagamento.
- [MVP] Inativacao controlada sem exclusao fisica para produtos, clientes, fornecedores, mesas, comandas, funcionarios e formas de pagamento.
- [MVP] Filtros de ativos, inativos e todos iniciados nos cadastros com status.
- [MVP] Busca ampla iniciada nos cadastros genericos e telas dedicadas principais.
- [MVP] Botao/acao de pesquisa clara nas telas de cadastro genericas e produtos.
- [MVP] Campos digitaveis por codigo/nome para selecao de produtos e insumos em fluxos criticos.
- [MVP] Campos digitaveis para clientes, mesas, fornecedores, pedidos pendentes e contas pendentes.
- [MVP] Paginacao nas listas administrativas genericas.
- [MVP] Validacoes visuais mais claras por campo nos cadastros genericos.
- [MVP] Mascara e validacao de CPF/CNPJ e telefone nos cadastros genericos.
- [PARCIAL] Mascara de NCM, CFOP e CEST na tela dedicada de produtos.
- [PARCIAL] Mascara de valores iniciada nas telas dedicadas de produtos, insumos e compras.
- [MVP] Vinculo de produto com setor de producao e tempo estimado.

## Etapa 3 - Estoque

Status: base iniciada, ainda longe de estoque completo.

- [MVP] Modelagem de produtos, insumos, saldos e movimentacoes.
- [PARCIAL] Estoque minimo previsto no cadastro de insumos.
- [PARCIAL] Fichas tecnicas modeladas.
- [PARCIAL] Baixa automatica inicial ao quitar venda.
- [MVP] Inventario com contagem, divergencia previa e ajuste auditado.
- [MVP] Tela operacional de estoque com filtros, busca e historico recente.
- [MVP] Perdas e desperdicio com baixa auditada de estoque.
- [MVP] Controle de validade e alertas.
- [PENDENTE] Baixa por ficha tecnica com regras mais robustas.
- [MVP] Relatorio de estoque, CMV e desperdicio com CSV, PDF e impressao individual.

## Etapa 4 - Vendas, pedidos, comandas e PDV

Status: foco atual, fluxo de comanda em MVP.

- [MVP] Criacao de pedido.
- [MVP] Pedido por comanda como fluxo principal.
- [MVP] Criacao automatica de comanda digitada.
- [MVP] Adicao de item em comanda existente.
- [PARCIAL] Pedido por mesa, balcao, retirada, delivery e PDV preparados.
- [MVP] Tela de pedidos revisada visualmente.
- [MVP] Atalhos no painel operacional.
- [MVP] Tela de comandas operacionais com consulta e acoes.
- [MVP] Cancelamento auditado de pedido.
- [MVP] Tela de PDV rapido com lancamento por comanda e codigo numerico de produto.
- [MVP] Cancelamento de item individual.
- [MVP] Edicao auditada de quantidade e observacao dos itens da comanda.
- [MVP] Desconto, acrescimo e taxa de servico.
- [MVP] Mascara de valores em desconto, acrescimo e taxa de servico.
- [MVP] Transferencia auditada de itens entre comandas.
- [MVP] Juntar comandas e dividir por transferencia de itens.
- [MVP] Impressao/recibo.
- [PARCIAL] Fluxo completo de cozinha com tempo/status.
- [MVP] Base PWA/mobile operacional para instalacao no celular e navegacao compacta.
- [MVP] Botao de instalacao PWA quando o navegador permitir.
- [MVP] Tela mobile do garcom para selecionar comanda e acessar produto, peso, consulta e cobranca.
- [MVP] Setores de producao com fila por item do pedido.
- [MVP] Geracao automatica de itens de producao ao lancar pedido.
- [MVP] Tela operacional de producao por setor com status pendente, em preparo, pronto e entregue.

## Etapa 5 - Compras

Status: iniciado.

- [MVP] Fornecedores.
- [PARCIAL] Pedidos de compra iniciais.
- [MVP] Validacao visual e mascara de custo na compra rapida.
- [PARCIAL] Recebimento inicial com atualizacao de estoque.
- [PENDENTE] Solicitacao de compra.
- [PENDENTE] Pedido de compra completo com status.
- [MVP] Recebimento parcial.
- [PENDENTE] Conferencia de divergencia.
- [PENDENTE] Integracao com contas a pagar.
- [PENDENTE] Relatorios de compras.
- [PENDENTE] Entrada automatica de compras por nota/cupom enviado via WhatsApp.
- [PENDENTE] Leitura inteligente de nota/cupom com OCR/IA para identificar fornecedor, itens, quantidades, custos e impostos.
- [PENDENTE] Tela de conferencia humana antes de atualizar estoque, compras e financeiro.
- [PENDENTE] Tratamento de divergencias entre itens da nota e cadastros internos de insumos/produtos.
- [PENDENTE] Historico de documentos importados com arquivo original, resultado da IA e auditoria.

## Etapa 6 - Financeiro e caixa

Status: caixa em MVP, financeiro em base inicial.

- [MVP] Abertura de caixa.
- [MVP] Sangria e suprimento.
- [MVP] Fechamento de caixa com conferencia.
- [MVP] Mascara de valores na abertura, sangria, suprimento e fechamento de caixa.
- [MVP] Pagamento de pedido.
- [MVP] Pagamento dividido.
- [MVP] Mascara de valores no pagamento e divisao de pagamentos.
- [MVP] Quitacao rapida.
- [MVP] Busca direta de comanda no caixa para cobranca.
- [MVP] Formularios do caixa revisados visualmente.
- [MVP] Contas a pagar e receber com baixa parcial, total e auditoria.
- [MVP] Fluxo de caixa consolidado.
- [MVP] Conciliacao de pagamentos por forma com auditoria.
- [MVP] Fechamento diario completo.
- [MVP] Historico de recebimentos financeiros no fechamento diario, CSV e PDF.
- [MVP] Relatorios financeiros com fechamento diario exportavel.
- [MVP] Estorno de pagamento com auditoria.
- [MVP] Devolucao por estorno com retorno automatico de estoque.
- [MVP] Regras de bloqueio para caixa fechado.

## Etapa 7 - Fiscal brasileiro

Status: estrutura inicial, ainda nao pronto para emissao real.

- [PARCIAL] Cadastro fiscal basico de produtos.
- [PARCIAL] Modelagem de documentos fiscais.
- [PARCIAL] Vinculo previsto entre venda e documento fiscal.
- [MVP] Configuracao fiscal da empresa.
- [PENDENTE] Certificado digital.
- [PENDENTE] NFC-e.
- [PENDENTE] NF-e.
- [PENDENTE] Cancelamento, inutilizacao e contingencia.
- [PENDENTE] Integracao com SEFAZ ou provedor fiscal.
- [PENDENTE] Historico fiscal operacional.

## Etapa 8 - Balanca

Status: MVP manual/simulado, integracao real pendente.

- [MVP] Cadastro de dispositivos de balanca.
- [MVP] Tela administrativa de balanca com dispositivos e leituras recentes.
- [MVP] Edicao e inativacao de dispositivos de balanca sem exclusao fisica.
- [MVP] Leitura manual com auditoria.
- [MVP] Leitura simulada/preparada para dispositivo.
- [MVP] Lancamento de item por quilo em comanda.
- [MVP] Valor por quilo calculado por peso x preco/kg.
- [PENDENTE] Integracao real serial/USB/API.
- [MVP] Configuracao por modelo de balanca.
- [MVP] Parametros de estabilizacao, leituras minimas e tara padrao.
- [PARCIAL] Auditoria de alteracao de peso e fallback manual.
- [PENDENTE] Testes com hardware real.

## Etapa 9 - Relatorios, auditoria, QA e producao

Status: auditoria iniciada, relatorios e QA pendentes.

- [MVP] Auditoria de login e acoes principais.
- [MVP] Tela inicial de auditoria.
- [MVP] Tela central de relatorios com atalhos por modulo.
- [MVP] Relatorios contextuais dentro de vendas, estoque, compras e financeiro.
- [MVP] Relatorio de vendas.
- [MVP] Relatorio de estoque.
- [MVP] Relatorio de compras.
- [MVP] Relatorio financeiro.
- [MVP] Relatorio de margem, CMV e desperdicio.
- [MVP] Impressao individual por item nos relatorios principais.
- [PARCIAL] Exportacao CSV/Excel/PDF.
- [MVP] Exportacao CSV nos relatorios principais.
- [MVP] Exportacao PDF nos relatorios principais, incluindo PDF individual por linha.
- [PENDENTE] Testes automatizados unitarios.
- [PENDENTE] Testes E2E.
- [MVP] Smoke test das rotas criticas.
- [MVP] Smoke test de fluxo operacional com comanda e balanca.
- [MVP] Script de QA completo com build, servidor temporario e testes sequenciais.
- [MVP] Script de QA consolidado com RBAC e simulacao completa de restaurante.
- [MVP] Manual de uso inicial para operacao, administracao e testes.
- [PENDENTE] CI/CD.
- [PENDENTE] Backup e restauracao.
- [PENDENTE] Observabilidade/logs de producao.
- [PENDENTE] Hardening de seguranca.
- [PENDENTE] Deploy homologacao/producao.

## Historico de commits funcionais recentes

- [MVP] `fbd6701` - Melhora leitura do menu lateral.
- [MVP] `0757042` - Melhora layout dos cadastros administrativos.
- [MVP] `8a143f8` - Melhora fluxo de pedido por comanda.
- [MVP] `648056f` - Adiciona atalhos ao painel operacional.
- [MVP] `5f29ac4` - Melhora usabilidade dos formularios do caixa.
- [MVP] `16a3064` - Cria roadmap de acompanhamento do projeto.
- [MVP] Adiciona busca de comanda no caixa.
- [PARCIAL] Adiciona busca de produto no pedido operacional.
- [MVP] Adiciona cancelamento de item individual em comanda.
- [MVP] Adiciona desconto, acrescimo e taxa de servico no caixa.
- [MVP] Adiciona recibo imprimivel do pedido.
- [MVP] Reforca login com fallback POST sem expor senha na URL.
- [MVP] Melhora tela de insumos para uso operacional.
- [MVP] Adiciona smoke test para rotas criticas.
- [MVP] Adiciona smoke test de fluxo operacional por comanda.
- [MVP] Melhora tela de produtos para PDV, balanca e fiscal.
- [MVP] Melhora tela operacional de estoque com filtros e historico.
- [MVP] Melhora inventario com busca, filtros, divergencia previa e ajuste auditado.
- [MVP] Adiciona controle de perdas e desperdicio com baixa de estoque.
- [MVP] Adiciona edicao de produtos cadastrados.
- [MVP] Adiciona edicao de insumos cadastrados sem alterar saldo direto.
- [MVP] Adiciona edicao de clientes, fornecedores, mesas e comandas.
- [MVP] Adiciona edicao de categorias, funcionarios e formas de pagamento.
- [PARCIAL] Adiciona acoes de ativar/inativar sem excluir registros.
- [PARCIAL] Adiciona filtros de ativos, inativos e todos nos cadastros com status.
- [MVP] Adiciona busca nos cadastros administrativos genericos.
- [MVP] Adiciona paginacao nos cadastros administrativos genericos.
- [MVP] Adiciona mascaras e validacoes visuais nos cadastros genericos.
- [PARCIAL] Adiciona mascaras fiscais na tela de produtos.
- [MVP] Adiciona validacoes visuais na tela de insumos.
- [PARCIAL] Adiciona mascara de valores na tela de produtos.
- [PARCIAL] Adiciona mascara de custo na tela de insumos.
- [MVP] Adiciona mascara de custo e validacao visual na compra rapida.
- [MVP] Adiciona mascara de valores nos formularios operacionais do caixa.
- [MVP] Adiciona mascara de valores no pagamento e centraliza utilitario de moeda.
- [MVP] Adiciona mascara de valores nos ajustes de desconto e taxa de servico.
- [MVP] Bloqueia cobranca visual quando nao existe caixa aberto.
- [MVP] Adiciona script de QA completo para evitar testes concorrentes no servidor de desenvolvimento.
- [MVP] Adiciona tela central de relatorios com indicadores e atalhos por modulo.
- [MVP] Adiciona relatorio de vendas com filtros e exportacao CSV.
- [MVP] Adiciona relatorio de estoque com filtros e exportacao CSV.
- [MVP] Adiciona relatorio de compras com filtros e exportacao CSV.
- [MVP] Adiciona relatorio financeiro com filtros e exportacao CSV.
- [MVP] Adiciona relatorio de margem, CMV e desperdicio com exportacao CSV.
- [MVP] Adiciona botoes de exportacao CSV na central de relatorios principais.
- [MVP] Adiciona configuracao fiscal da empresa com auditoria e historico fiscal recente.
- [MVP] Inclui modulo fiscal real no smoke test das rotas criticas.
- [MVP] Substitui placeholder de configuracoes por central de parametrizacao agrupada.
- [MVP] Inclui central de configuracoes no smoke test das rotas criticas.
- [MVP] Substitui placeholder de balanca por painel administrativo com cadastro de dispositivos e leituras recentes.
- [MVP] Inclui painel administrativo de balanca no smoke test das rotas criticas.
- [MVP] Adiciona edicao e ativacao/inativacao de dispositivos de balanca com auditoria.
- [PARCIAL] Registra usuario responsavel nas leituras de balanca e destaca fallback manual na auditoria.
- [MVP] Alinha roadmap e smoke test com controle de validade critica do estoque.
- [MVP] Adiciona recebimento parcial de compras com atualizacao proporcional de estoque e financeiro.
- [MVP] Melhora leitura de quantidades pendentes na tela de compras e inclui a rota no smoke test.
- [MVP] Adiciona fluxo de caixa consolidado com entradas, saidas e saldo liquido dos ultimos 30 dias.
- [PARCIAL] Inicia conciliacao por forma de pagamento no painel financeiro.
- [MVP] Adiciona tela de manutencao de usuarios com criacao, edicao, perfil, status e auditoria.
- [MVP] Permite usuario do sistema sem obrigatoriedade de e-mail e adiciona impressao individual nas linhas dos relatorios principais.
- [MVP] Adiciona exportacao PDF nos relatorios principais e PDF individual por item.
- [MVP] Adiciona atalhos contextuais de relatorios nas telas de caixa, estoque, compras e financeiro.
- [MVP] Reforca RBAC para bloquear perfis operacionais no painel administrativo e revalidar permissoes atuais no banco.
- [MVP] Filtra menus por permissao e exibe atalho administrativo bloqueado para perfil sem acesso.
- [MVP] Exibe usuario logado no topo com acesso a preferencias e logout.
- [MVP] Permite troca de senha pelo proprio usuario na tela de preferencias com auditoria.
- [MVP] Permite editar nome e usuario de acesso pelo perfil com auditoria.
- [MVP] Alinha recuperacao de senha para aceitar usuario de acesso sem exigir e-mail.
- [MVP] Adiciona manifest, service worker, icones PWA e shell mobile compacto para uso em celular.
- [MVP] Adiciona botao de instalacao do app no cabecalho mobile quando suportado pelo navegador.
- [MVP] Adiciona tela operacional mobile para garcom com fluxo rapido por comanda.
- [MVP] Refina tela mobile do garcom com foco em uso de bolso, acao principal e botoes maiores.
- [MVP] Adiciona busca por codigo numerico no lancamento de itens do garcom e clareia consulta de comandas abertas.
- [MVP] Adiciona setores de producao e fila operacional por item do pedido.
- [MVP] Adiciona manual de uso inicial do sistema.
- [MVP] Amplia QA consolidado com RBAC e cenario completo de restaurante.
- [MVP] Troca selecoes rigidas de produtos e insumos por busca digitavel por codigo ou nome.
- [MVP] Amplia busca digitavel e limita listas auxiliares para melhorar usabilidade e desempenho.
- [MVP] Limpa tela de login e amplia QA de cadastros genericos.
- [MVP] Adiciona PDV rapido por codigo numerico na tela operacional de pedidos.
- [MVP] Adiciona edicao de itens da comanda com auditoria e QA operacional.
- [MVP] Adiciona transferencia de itens entre comandas com recalculo de totais.
- [MVP] Adiciona uniao de comandas com movimentacao auditada dos pedidos.

## Proxima ordem recomendada

1. Fechar fluxo de caixa/comanda para cobranca real.
2. Melhorar PDV rapido com busca de produto.
3. Implementar edicao/inativacao nos cadastros principais.
4. Adicionar mascaras de valores nas telas dedicadas.
5. Fortalecer estoque: inventario, perdas, validade e baixa por ficha tecnica.
6. Evoluir compras e financeiro.
7. Planejar automacao de entrada de compras por WhatsApp, OCR/IA e conferencia humana.
8. Criar tela central de relatorios e relatorios contextuais por modulo.
9. Evoluir fiscal e integracao real com balanca.
10. Adicionar testes automatizados e preparar producao.
