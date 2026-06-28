# Roadmap do Restaurant Brasil

Percentual atual estimado: 40%

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
- [MVP] Insumos.
- [MVP] Clientes.
- [MVP] Fornecedores.
- [MVP] Funcionarios.
- [MVP] Mesas.
- [MVP] Comandas.
- [MVP] Formas de pagamento.
- [MVP] Layout dos cadastros revisado para nao ficar apertado.
- [PENDENTE] Edicao de registros.
- [PENDENTE] Inativacao/exclusao controlada.
- [PENDENTE] Filtros, busca e paginacao nas listas.
- [PENDENTE] Validacoes visuais mais claras por campo.
- [PENDENTE] Mascara de CPF/CNPJ, telefone, NCM/CFOP e valores.

## Etapa 3 - Estoque

Status: base iniciada, ainda longe de estoque completo.

- [MVP] Modelagem de produtos, insumos, saldos e movimentacoes.
- [PARCIAL] Estoque minimo previsto no cadastro de insumos.
- [PARCIAL] Fichas tecnicas modeladas.
- [PARCIAL] Baixa automatica inicial ao quitar venda.
- [PARCIAL] Inventario inicial.
- [PENDENTE] Tela completa de movimentacoes com filtros.
- [PENDENTE] Inventario com contagem, divergencia e ajuste auditado.
- [PENDENTE] Perdas e desperdicio.
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
- [PENDENTE] Relatorio de vendas.
- [PENDENTE] Relatorio de estoque.
- [PENDENTE] Relatorio de compras.
- [PENDENTE] Relatorio financeiro.
- [PENDENTE] Relatorio de margem, CMV e desperdicio.
- [PENDENTE] Exportacao CSV/Excel/PDF.
- [PENDENTE] Testes automatizados unitarios.
- [PENDENTE] Testes E2E.
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

## Proxima ordem recomendada

1. Fechar fluxo de caixa/comanda para cobranca real.
2. Melhorar PDV rapido com busca de produto.
3. Implementar edicao/inativacao nos cadastros principais.
4. Fortalecer estoque: inventario, perdas, validade e baixa por ficha tecnica.
5. Evoluir compras e financeiro.
6. Criar relatorios exportaveis.
7. Evoluir fiscal e integracao real com balanca.
8. Adicionar testes automatizados e preparar producao.
