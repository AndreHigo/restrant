# Entrega do MVP - Restaurant Brasil

Status: primeiro ciclo MVP concluido e validado.

Este documento resume o que esta pronto para demonstracao, treinamento e homologacao inicial em restaurante. Ele nao substitui a etapa de producao real, que ainda exige integracoes oficiais, infraestrutura e testes em campo.

## Escopo validado

- Login, logout, recuperacao de senha, sessao por cookie JWT e RBAC.
- Usuarios, perfis, permissoes, preferencias e troca de senha.
- Cadastros principais com busca, edicao, inativacao sem exclusao fisica e validacoes visuais.
- Operacao por comanda como fluxo principal.
- Lancamento por codigo numerico de produto.
- Lancamento por balanca manual/simulada com peso, tara e auditoria.
- Garcom mobile/PWA com consulta e continuidade de comanda.
- Caixa com abertura, suprimento, sangria, pagamento dividido, estorno e fechamento.
- Estoque com saldos, movimentos, inventario, validade, perdas e baixa por venda.
- Compras com pedido rapido, recebimento parcial e atualizacao de estoque.
- Financeiro com contas a pagar, contas a receber, baixas parciais, fluxo de caixa e conciliacao.
- Fiscal estruturado para cadastro da empresa, produtos e historico inicial.
- Relatorios de vendas, estoque, compras, financeiro, margem, CMV e desperdicio com CSV/PDF.
- Auditoria de login, alteracoes sensiveis, cancelamentos, pagamentos e leituras.

## Validacao executada

- `npm run build`
- `npm run test:smoke`
- `npm run test:flow`
- `npm run test:rbac`
- `npm run test:scenario`
- `npm run test:qa`

O QA consolidado valida build, rotas criticas, fluxo operacional por comanda, balanca, edicao de item, transferencia, uniao de comandas, recibo, caixa, RBAC e simulacao de restaurante com Wesley, 3 garcons e 20 mesas.

## Limites antes de producao real

- NFC-e/NF-e ainda dependem de certificado digital e integracao com SEFAZ ou provedor fiscal.
- Balanca fisica ainda precisa teste com hardware real, porta serial/USB/API e homologacao no local.
- O ambiente de producao precisa CI/CD, backup, restauracao, observabilidade e politica formal de seguranca.
- Testes unitarios e E2E dedicados ainda devem ser adicionados.
- Entrada automatica de compras por WhatsApp com OCR/IA segue planejada para evolucao.

## Proximo ciclo recomendado

1. Homologar em ambiente de teste com dados reais do restaurante.
2. Testar balanca fisica real e ajustar protocolo de leitura.
3. Definir provedor fiscal ou caminho direto com SEFAZ.
4. Criar rotina de backup/restauracao e monitoramento.
5. Refinar compras, conferencia de notas e automacao por WhatsApp/IA.
