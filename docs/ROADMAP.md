# Roadmap do Restaurant Brasil

Percentual atual estimado: 35%

Este arquivo acompanha a ordem de execucao do projeto. A cada funcionalidade entregue, o checklist deve ser atualizado no mesmo commit da implementacao.

## Regra de acompanhamento

- Marcar como concluido somente quando houver codigo, build/teste e commit.
- Manter commits pequenos, com titulo e descricao em portugues.
- Subir primeiro na branch `teste`, validar, depois avancar `master`.
- Quando uma tarefa gerar ajuste visual ou funcional, registrar o teste feito.

## Etapa 1 - Fundacao, autenticacao e layout

Status: concluida parcialmente, com base funcional.

- [x] Estrutura Next.js, TypeScript, Prisma e PostgreSQL.
- [x] Docker/Postgres configurado para desenvolvimento.
- [x] Seeds iniciais com usuario admin e dados de exemplo.
- [x] Login com JWT/cookie.
- [x] Logout e recuperacao de senha preparada.
- [x] RBAC com usuarios, perfis e permissoes.
- [x] Protecao de rotas por permissao.
- [x] Layout administrativo.
- [x] Layout operacional.
- [x] Menu lateral agrupado e revisado visualmente.
- [ ] Tela completa de usuarios com edicao e manutencao.
- [ ] Tela completa de perfis/permissoes com edicao segura.
- [ ] Testes automatizados de autenticacao e permissao.

## Etapa 2 - Cadastros principais

Status: em andamento.

- [x] Categorias.
- [x] Produtos.
- [x] Insumos.
- [x] Clientes.
- [x] Fornecedores.
- [x] Funcionarios.
- [x] Mesas.
- [x] Comandas.
- [x] Formas de pagamento.
- [x] Layout dos cadastros revisado para nao ficar apertado.
- [ ] Edicao de registros.
- [ ] Inativacao/exclusao controlada.
- [ ] Filtros, busca e paginacao nas listas.
- [ ] Validacoes visuais mais claras por campo.
- [ ] Mascara de CPF/CNPJ, telefone, NCM/CFOP e valores.

## Etapa 3 - Estoque

Status: iniciado.

- [x] Modelagem de produtos, insumos, saldos e movimentacoes.
- [x] Estoque minimo previsto no cadastro de insumos.
- [x] Fichas tecnicas modeladas.
- [x] Baixa automatica inicial ao quitar venda.
- [x] Inventario inicial.
- [ ] Tela completa de movimentacoes com filtros.
- [ ] Inventario com contagem, divergencia e ajuste auditado.
- [ ] Perdas e desperdicio.
- [ ] Controle de validade e alertas.
- [ ] Baixa por ficha tecnica com regras mais robustas.
- [ ] Relatorio de estoque, CMV e desperdicio.

## Etapa 4 - Vendas, pedidos, comandas e PDV

Status: em andamento, foco atual.

- [x] Criacao de pedido.
- [x] Pedido por comanda como fluxo principal.
- [x] Criacao automatica de comanda digitada.
- [x] Adicao de item em comanda existente.
- [x] Pedido por mesa, balcao, retirada, delivery e PDV preparados.
- [x] Tela de pedidos revisada visualmente.
- [x] Atalhos no painel operacional.
- [x] Tela de comandas operacionais com consulta e acoes.
- [x] Cancelamento auditado de pedido.
- [ ] Tela de PDV rapido com busca de produto.
- [ ] Cancelamento de item individual.
- [ ] Desconto, acrescimo e taxa de servico.
- [ ] Transferencia de itens entre comandas.
- [ ] Juntar/dividir comandas.
- [ ] Impressao/recibo.
- [ ] Fluxo completo de cozinha com tempo/status.

## Etapa 5 - Compras

Status: iniciado.

- [x] Fornecedores.
- [x] Pedidos de compra iniciais.
- [x] Recebimento inicial com atualizacao de estoque.
- [ ] Solicitacao de compra.
- [ ] Pedido de compra completo com status.
- [ ] Recebimento parcial.
- [ ] Conferencia de divergencia.
- [ ] Integracao com contas a pagar.
- [ ] Relatorios de compras.

## Etapa 6 - Financeiro e caixa

Status: em andamento.

- [x] Abertura de caixa.
- [x] Sangria e suprimento.
- [x] Fechamento de caixa com conferencia.
- [x] Pagamento de pedido.
- [x] Pagamento dividido.
- [x] Quitacao rapida.
- [x] Formularios do caixa revisados visualmente.
- [x] Contas a pagar e receber iniciais.
- [ ] Fluxo de caixa consolidado.
- [ ] Conciliação de pagamentos.
- [ ] Fechamento diario completo.
- [ ] Relatorios financeiros.
- [ ] Estornos e devolucoes.
- [ ] Regras de bloqueio para caixa fechado.

## Etapa 7 - Fiscal brasileiro

Status: estrutura inicial, ainda nao pronto para uso real.

- [x] Cadastro fiscal basico de produtos.
- [x] Modelagem de documentos fiscais.
- [x] Vinculo previsto entre venda e documento fiscal.
- [ ] Configuracao fiscal da empresa.
- [ ] Certificado digital.
- [ ] NFC-e.
- [ ] NF-e.
- [ ] Cancelamento, inutilizacao e contingencia.
- [ ] Integracao com SEFAZ ou provedor fiscal.
- [ ] Historico fiscal operacional.

## Etapa 8 - Balanca

Status: em andamento.

- [x] Cadastro de dispositivos de balanca.
- [x] Leitura manual com auditoria.
- [x] Leitura simulada/preparada para dispositivo.
- [x] Lancamento de item por quilo em comanda.
- [x] Valor por quilo calculado por peso x preco/kg.
- [ ] Integracao real serial/USB/API.
- [ ] Configuracao por modelo de balanca.
- [ ] Estabilizacao e confirmacao de peso.
- [ ] Auditoria de alteracao de peso.
- [ ] Testes com hardware real.

## Etapa 9 - Relatorios, auditoria, QA e producao

Status: iniciado.

- [x] Auditoria de login e acoes principais.
- [x] Tela inicial de auditoria.
- [ ] Relatorio de vendas.
- [ ] Relatorio de estoque.
- [ ] Relatorio de compras.
- [ ] Relatorio financeiro.
- [ ] Relatorio de margem, CMV e desperdicio.
- [ ] Exportacao CSV/Excel/PDF.
- [ ] Testes automatizados unitarios.
- [ ] Testes E2E.
- [ ] CI/CD.
- [ ] Backup e restauracao.
- [ ] Observabilidade/logs de producao.
- [ ] Hardening de seguranca.
- [ ] Deploy homologacao/producao.

## Historico de commits funcionais recentes

- [x] `fbd6701` - Melhora leitura do menu lateral.
- [x] `0757042` - Melhora layout dos cadastros administrativos.
- [x] `8a143f8` - Melhora fluxo de pedido por comanda.
- [x] `648056f` - Adiciona atalhos ao painel operacional.
- [x] `5f29ac4` - Melhora usabilidade dos formularios do caixa.

## Proxima ordem recomendada

1. Fechar fluxo de caixa/comanda para cobrança real.
2. Melhorar PDV rapido com busca de produto.
3. Implementar edicao/inativacao nos cadastros principais.
4. Fortalecer estoque: inventario, perdas, validade e baixa por ficha tecnica.
5. Evoluir compras e financeiro.
6. Criar relatorios exportaveis.
7. Evoluir fiscal e integracao real com balanca.
8. Adicionar testes automatizados e preparar producao.
