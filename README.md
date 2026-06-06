# Restaurant Brasil

Sistema full stack de gestao para restaurante no Brasil, estruturado para crescer por fases.

## Stack escolhida

- Frontend e backend web: Next.js 14 com App Router
- Linguagem: TypeScript
- Banco: PostgreSQL
- ORM: Prisma
- UI: React + Tailwind CSS + componentes locais reutilizaveis
- Autenticacao: JWT em cookie httpOnly

## Estrutura inicial

```text
prisma/
  schema.prisma
  seed.ts
src/
  app/
    admin/
    api/
    login/
    operacao/
  components/
    auth/
    layout/
    ui/
  lib/
    data/
    validations/
middleware.ts
```

## Fase 1 entregue

- Estrutura base do projeto
- Modelagem inicial completa no Prisma
- Login, logout e recuperacao de senha preparada
- Controle de usuarios, perfis e permissoes
- Layout administrativo e operacional
- Dashboard inicial e tela de usuarios

## Como rodar

1. Instale as dependencias com `npm install`
2. Copie `.env.example` para `.env`
3. Gere o Prisma Client com `npx prisma generate`
4. Execute as migrations com `npx prisma migrate dev`
5. Rode o seed com `npx prisma db seed`
6. Suba a aplicacao com `npm run dev`

## Credenciais iniciais

- E-mail: `admin@restaurante.local`
- Senha: `Admin@123`
