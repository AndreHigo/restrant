# Relatorio de uso - simulacao de restaurante

Data da simulacao: 2026-06-30

## Cenario

- Administrador e caixa: Wesley (`wesley`)
- Garcons: Garcom 01, Garcom 02 e Garcom 03
- Mesas preparadas: 20 mesas (`1` a `20`)
- Comandas usadas no teste: `2026063019492801` a `2026063019492820`
- Produtos usados:
  - `101` Prato executivo de frango
  - `102` Suco natural 500ml
  - `201` Buffet por quilo

## Execucao

- Wesley autenticou como administrador/caixa.
- Os 3 garcons autenticaram como atendentes.
- O sistema garantiu 20 mesas ativas.
- O caixa ja estava aberto e foi reutilizado: `20260629211718`.
- Cada mesa recebeu uma comanda.
- Os garcons lancaram pedidos por comanda.
- Parte das comandas recebeu item de buffet por quilo via modulo de balanca.
- Wesley registrou pagamentos em 8 pedidos.
- 12 pedidos ficaram pendentes em comandas abertas.
- Wesley acessou telas administrativas, auditoria, painel operacional, caixa e relatorios.

## Resultado numerico

- Pedidos simulados: 20
- Pedidos pagos pelo Wesley: 8
- Pedidos pendentes: 12
- Comandas do cenario abertas no painel: 12
- Total vendido simulado: R$ 800,61
- Total recebido no caixa: R$ 313,19
- Saldo pendente em comandas: R$ 487,42

## Distribuicao por garcom

| Garcom | Mesas | Pedidos | Total |
| --- | --- | ---: | ---: |
| Garcom 01 | 1, 4, 7, 10, 13, 16, 19 | 7 | R$ 474,01 |
| Garcom 02 | 2, 5, 8, 11, 14, 17, 20 | 7 | R$ 182,50 |
| Garcom 03 | 3, 6, 9, 12, 15, 18 | 6 | R$ 144,10 |

## Amostra de pedidos

| Mesa | Comanda | Garcom | Itens | Pago | Total |
| --- | --- | --- | --- | --- | ---: |
| 1 | 2026063019492801 | Garcom 01 | 101 Prato executivo de frango x2; 201 Buffet por quilo 0,420kg | sim | R$ 89,26 |
| 2 | 2026063019492802 | Garcom 02 | 102 Suco natural 500ml x1 | sim | R$ 9,50 |
| 3 | 2026063019492803 | Garcom 03 | 101 Prato executivo de frango x1 | sim | R$ 28,90 |
| 4 | 2026063019492804 | Garcom 01 | 102 Suco natural 500ml x1; 201 Buffet por quilo 0,453kg | sim | R$ 43,43 |
| 5 | 2026063019492805 | Garcom 02 | 101 Prato executivo de frango x2 | sim | R$ 57,80 |
| 6 | 2026063019492806 | Garcom 03 | 102 Suco natural 500ml x1 | sim | R$ 9,50 |
| 7 | 2026063019492807 | Garcom 01 | 101 Prato executivo de frango x1; 201 Buffet por quilo 0,486kg | sim | R$ 65,30 |
| 8 | 2026063019492808 | Garcom 02 | 102 Suco natural 500ml x1 | sim | R$ 9,50 |
| 9 | 2026063019492809 | Garcom 03 | 101 Prato executivo de frango x2 | nao | R$ 57,80 |
| 10 | 2026063019492810 | Garcom 01 | 102 Suco natural 500ml x1; 201 Buffet por quilo 0,519kg | nao | R$ 48,37 |

## Auditoria observada

| Usuario | Acoes registradas |
| --- | --- |
| Garcom 01 | 7 criacoes de pedido, 7 reforcos em pedido aberto, 7 leituras de balanca |
| Garcom 02 | 7 criacoes de pedido |
| Garcom 03 | 6 criacoes de pedido |
| Wesley | 8 pagamentos registrados, 8 contas a receber geradas, 8 baixas de estoque por venda |

## Telas verificadas

- Painel administrativo
- Auditoria
- Painel operacional
- Tela do garcom
- Caixa
- Relatorio de vendas
- Relatorio financeiro

## Conclusao

O fluxo atual suporta a vivencia basica de restaurante por comanda:

- garcons conseguem lancar pedidos por comanda;
- produto por codigo numerico funciona no lancamento;
- buffet por quilo alimenta a comanda;
- Wesley consegue atuar como caixa;
- pagamentos geram auditoria, contas a receber e baixa de estoque;
- auditoria permite ver quem executou as principais acoes.

O cenario pode ser reexecutado com:

```powershell
npm run test:scenario
```

## Pontos a melhorar

- A tela do garcom ainda nao mostra um resumo completo dos itens da comanda no proprio fluxo.
- A experiencia ideal seria permitir adicionar produto, peso, ver itens e cobrar sem sair da tela do garcom.
- A auditoria existe, mas o painel pode ganhar filtros mais diretos por funcionario, comanda e periodo.
- O fechamento de caixa completo deve ser testado em um cenario sem pedidos pendentes.
