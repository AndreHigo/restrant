# Seguranca e desempenho

Este documento registra o estado atual da base e os proximos controles necessarios antes de uso comercial em producao.

## Controles ja implementados

- Senhas novas exigem no minimo 10 caracteres, letra maiuscula, letra minuscula, numero e simbolo. Espacos nao sao aceitos.
- Senhas sao armazenadas com hash bcrypt; nenhum fluxo persiste senha em texto puro.
- Login usa sessao JWT assinada em cookie `httpOnly`, com expiracao de 12 horas, `sameSite=lax` e `secure` em producao.
- Acesso a paginas e APIs privadas e protegido por sessao e permissao RBAC.
- Abertura, cobranca, suprimento, sangria, fechamento, cancelamento e estorno de caixa exigem permissoes proprias; os controles sensiveis tambem ficam ocultos na interface sem a autorizacao correspondente. Transmissao, cancelamento de NFC-e e certificado A1 tambem possuem permissoes exclusivas.
- Edicao, cancelamento e transferencia de item, ajuste de pedido, uniao de comandas, cancelamento completo e peso manual possuem permissoes operacionais separadas no backend e na interface.
- Ajuste manual de estoque, recebimento/cancelamento de compra, pagamento, recebimento e conciliacao financeira tambem possuem permissoes separadas no backend e na interface.
- Falhas consecutivas de login possuem bloqueio temporario por usuario e por IP, com registro em `LoginLog` e auditoria.
- Recuperacao de senha possui limite temporario por usuario e por IP, com resposta generica, `Retry-After` e auditoria de tentativas.
- Recuperacao de senha usa token aleatorio, armazenado somente como hash, de uso unico e validade de 30 minutos.
- Alteracoes de usuario, perfil, senha, login, logout e acoes operacionais importantes geram auditoria persistida.

## Configuracoes de ambiente

- `JWT_SECRET`: obrigatorio e aleatorio em producao; nunca reutilizar a chave de desenvolvimento.
- `LOGIN_FAILED_WINDOW_MINUTES`: janela de contagem de tentativas; padrao `15`.
- `LOGIN_FAILED_LIMIT`: tentativas por usuario antes do bloqueio; padrao `5`.
- `LOGIN_FAILED_IP_LIMIT`: tentativas por IP antes do bloqueio; padrao `30`.
- `LOGIN_LOCKOUT_MINUTES`: duracao do bloqueio; padrao `10`.
- `PASSWORD_RESET_DEBUG`: deve permanecer ausente ou `false` em producao para nao expor link de recuperacao na resposta da API.
- `PASSWORD_RESET_WINDOW_MINUTES`: janela de contagem das solicitacoes de recuperacao; padrao `60`.
- `PASSWORD_RESET_IDENTIFIER_LIMIT`: solicitacoes por usuario dentro da janela; padrao `3`.
- `PASSWORD_RESET_IP_LIMIT`: solicitacoes por IP dentro da janela; padrao `12`.

## Pendencias antes de producao

- Configurar envio de recuperacao de senha por e-mail ou canal transacional; o link nao pode depender da resposta da API.
- Aplicar rate limit compartilhado em Redis ou gateway para login e recuperacao, evitando limite somente local em instalacoes com varias instancias.
- Centralizar logs, alertas de seguranca, backup testado e monitoramento de disponibilidade.
- Executar revisao de permissoes com os papéis reais do restaurante e teste de invasao contratado antes do go-live.
- Criar indices e teste de carga baseado no volume real de comandas, itens, caixa e auditoria.

## Rotina de validacao local

```powershell
npm run test:password-policy
npm run test:login-lockout
npm run test:password-reset-rate-limit
npm run db:sync-sensitive-permissions
npm run test:sensitive-permissions
npm run test:operational-permissions
npm run test:management-permissions
npm run test:cash-permissions
npm run test:api-rbac
npm run build
```
