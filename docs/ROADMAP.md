# Roadmap do Restaurant Brasil

Percentual atual estimado: 57%

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
- [PARCIAL] Logout e recuperacao de senha preparada.
- [MVP] RBAC com usuarios, perfis e permissoes.
- [MVP] Protecao de rotas por permissao.
- [MVP] Layout administrativo.
- [MVP] Layout operacional.
- [MVP] Menu lateral agrupado e revisado visualmente.
- [PENDENTE] Tela completa de usuarios com edicao e manutencao.
- [PENDENTE] Tela completa de perfis/permissoes com edicao segura.
- [PENDENTE] Testes automatizados de autenticacao e permissao.
- [PRODUCAO] Hardening de sessao, cookies, expiração e trilha de acesso.

## Etapa 2 - Cadastros principais

Status: MVP de criacao/listagem, sem manutencao completa.

- [MVP] Categorias.
- [MVP] Produtos.
- [MVP] Tela dedicada de produtos com KPIs, status e busca.
- [MVP] Insumos.
- [MVP] Tela dedicada de insumos com KPIs, status e busca.
- [MVP] Clientes.
- [MVP] Fornecedores.
- [MVP] Funcionarios.
- [MVP] Mesas.
- [MVP] Comandas.
- [MVP] Formas de pagamento.
- [MVP] Layout dos cadastros revisado para nao ficar apertado.
- [PARCIAL] Edicao de registros iniciada por produtos, insumos, clientes, fornecedores, mesas, comandas, categorias, funcionarios e formas de pagamento.
- [PARCIAL] Inativacao controlada sem exclusao fisica para produtos, clientes, fornecedores, mesas, comandas, funcionarios e formas de pagamento.
- [PARCIAL] Filtros de ativos, inativos e todos iniciados nos cadastros com status.
- [PARCIAL] Busca ampla iniciada nos cadastros genericos e telas dedicadas principais.
- [MVP] Botao/acao de pesquisa clara nas telas de cadastro genericas e produtos.
- [MVP] Paginacao nas listas administrativas genericas.
- [MVP] Validacoes visuais mais claras por campo nos cadastros genericos.
- [PARCIAL] Mascara de CPF/CNPJ e telefone nos cadastros genericos.
- [PARCIAL] Mascara de NCM, CFOP e CEST na tela dedicada de produtos.
- [PENDENTE] Mascara de valores nas telas dedicadas.

## Etapa 3 - Estoque

Status: base iniciada, ainda longe de estoque completo.

- [MVP] Modelagem de produtos, insumos, saldos e movimentacoes.
- [PARCIAL] Estoque minimo previsto no cadastro de insumos.
- [PARCIAL] Fichas tecnicas modeladas.
- [PARCIAL] Baixa automatica inicial ao quitar venda.
- [MVP] Inventario com contagem, divergencia previa e ajuste auditado.
- [MVP] Tela operacional de estoque com filtros, busca e historico recente.
- [MVP] Perdas e desperdicio com baixa auditada de estoque.
- [PENDENTE] Controle de validade e alertas.
- [PENDENTE] Baixa por ficha tecnica com regras mais robustas.
- [PENDENTE] Relatorio de estoque, CMV e desperdicio.

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
- [PARCIAL] Tela de PDV rapido com busca de produto.
- [MVP] Cancelamento de item individual.
- [MVP] Desconto, acrescimo e taxa de servico.
- [PENDENTE] Transferencia de itens entre comandas.
- [PENDENTE] Juntar/dividir comandas.
- [MVP] Impressao/recibo.
- [PARCIAL] Fluxo completo de cozinha com tempo/status.

## Etapa 5 - Compras

Status: iniciado.

- [MVP] Fornecedores.
- [PARCIAL] Pedidos de compra iniciais.
- [PARCIAL] Recebimento inicial com atualizacao de estoque.
- [PENDENTE] Solicitacao de compra.
- [PENDENTE] Pedido de compra completo com status.
- [PENDENTE] Recebimento parcial.
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
- [MVP] Pagamento de pedido.
- [MVP] Pagamento dividido.
- [MVP] Quitacao rapida.
- [MVP] Busca direta de comanda no caixa para cobranca.
- [MVP] Formularios do caixa revisados visualmente.
- [PARCIAL] Contas a pagar e receber iniciais.
- [PENDENTE] Fluxo de caixa consolidado.
- [PENDENTE] Conciliacao de pagamentos.
- [PENDENTE] Fechamento diario completo.
- [PENDENTE] Relatorios financeiros.
- [PENDENTE] Estornos e devolucoes.
- [PENDENTE] Regras de bloqueio para caixa fechado.

## Etapa 7 - Fiscal brasileiro

Status: estrutura inicial, ainda nao pronto para emissao real.

- [PARCIAL] Cadastro fiscal basico de produtos.
- [PARCIAL] Modelagem de documentos fiscais.
- [PARCIAL] Vinculo previsto entre venda e documento fiscal.
- [PENDENTE] Configuracao fiscal da empresa.
- [PENDENTE] Certificado digital.
- [PENDENTE] NFC-e.
- [PENDENTE] NF-e.
- [PENDENTE] Cancelamento, inutilizacao e contingencia.
- [PENDENTE] Integracao com SEFAZ ou provedor fiscal.
- [PENDENTE] Historico fiscal operacional.

## Etapa 8 - Balanca

Status: MVP manual/simulado, integracao real pendente.

- [MVP] Cadastro de dispositivos de balanca.
- [MVP] Leitura manual com auditoria.
- [MVP] Leitura simulada/preparada para dispositivo.
- [MVP] Lancamento de item por quilo em comanda.
- [MVP] Valor por quilo calculado por peso x preco/kg.
- [PENDENTE] Integracao real serial/USB/API.
- [PENDENTE] Configuracao por modelo de balanca.
- [PENDENTE] Estabilizacao e confirmacao de peso.
- [PENDENTE] Auditoria de alteracao de peso.
- [PENDENTE] Testes com hardware real.

## Etapa 9 - Relatorios, auditoria, QA e producao

Status: auditoria iniciada, relatorios e QA pendentes.

- [MVP] Auditoria de login e acoes principais.
- [MVP] Tela inicial de auditoria.
- [PENDENTE] Tela central de relatorios com atalhos por modulo.
- [PENDENTE] Relatorios contextuais dentro de vendas, estoque, compras e financeiro.
- [PENDENTE] Relatorio de vendas.
- [PENDENTE] Relatorio de estoque.
- [PENDENTE] Relatorio de compras.
- [PENDENTE] Relatorio financeiro.
- [PENDENTE] Relatorio de margem, CMV e desperdicio.
- [PENDENTE] Exportacao CSV/Excel/PDF.
- [PENDENTE] Testes automatizados unitarios.
- [PENDENTE] Testes E2E.
- [MVP] Smoke test das rotas criticas.
- [MVP] Smoke test de fluxo operacional com comanda e balanca.
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
