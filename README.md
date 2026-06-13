# Derycash Backend

API e regras de negocio do Derycash, o app que calcula quanto dinheiro realmente pode ser usado antes da bufunfa sumir.

## Stack

- TypeScript
- Express
- Prisma
- Postgres
- Zod
- Vitest

## Modulos

- Perfil financeiro inicial
- Contas recorrentes e pagamentos mensais
- Cartoes de credito
- Compras no cartao e parcelas futuras
- Gastos avulsos
- Metas e aportes
- Resumo do dashboard
- Simulador "Posso Gastar?"
- Simulador educativo de investimentos
- Investment Intelligence com IA em background
- Previa de importacao de extratos de investimentos

## Endpoints

```text
GET  /api/health
GET  /api/financial-profile
PUT  /api/financial-profile
GET  /api/recurring-expenses
POST /api/recurring-expenses
PUT  /api/recurring-expenses/:expenseId
DEL  /api/recurring-expenses/:expenseId
POST /api/recurring-expenses/:expenseId/pay
GET  /api/credit-cards
POST /api/credit-cards
PUT  /api/credit-cards/:cardId
DEL  /api/credit-cards/:cardId
GET  /api/credit-card-purchases
POST /api/credit-card-purchases
DEL  /api/credit-card-purchases/:purchaseId
GET  /api/transactions
POST /api/transactions
DEL  /api/transactions/:transactionId
GET  /api/goals
POST /api/goals
DEL  /api/goals/:goalId
POST /api/goals/:goalId/contributions
GET  /api/dashboard/summary
POST /api/simulator/can-i-buy
POST /api/investments/simulate
GET  /api/investments/portfolio
POST /api/investments/analyze-asset
GET  /api/investments/imports/template.csv
POST /api/investments/imports/preview
POST /api/investments/imports/confirm
POST /api/investments/movements
```

## Ambiente

Copie `.env.example` para `.env`.

```env
DATABASE_URL=""
PORT=3333
FRONTEND_URL="http://localhost:3000"
CRON_SECRET=""
NVIDIA_API_KEY=""
NVIDIA_BASE_URL="https://integrate.api.nvidia.com/v1"
NVIDIA_MAIN_MODEL="nvidia/llama-3.3-nemotron-super-49b-v1.5"
NVIDIA_FALLBACK_MODEL="nvidia/llama-3.3-nemotron-super-49b-v1"
NVIDIA_LIGHT_MODEL="nvidia/nvidia-nemotron-nano-9b-v2"
```

## IA e investimentos

A IA fica no backend como camada auxiliar. Ela explica dados estruturados de investimentos, mas nao calcula metricas finais e nao deve recomendar compra ou venda. Sem `NVIDIA_API_KEY`, o endpoint usa fallback educativo para manter a interface funcionando.

## Importacao de extratos

O fluxo inicial de importacao gera uma previa revisavel. Nada e gravado automaticamente antes da confirmacao:

```text
upload/conteudo do arquivo -> parser -> previa -> revisao do usuario -> confirmacao -> movimentos/posicoes
```

O parser automatico atual suporta o CSV padrao Derycash. XLSX e PDF ja entram no contrato como formatos planejados, retornando necessidade de mapeamento manual ate os parsers especificos de B3, XP, Inter, Nubank e Itau evoluirem.

Modelos persistidos:

- plataformas de investimento;
- ativos;
- lotes de importacao;
- movimentacoes;
- posicoes consolidadas por ativo/plataforma.

## Banco local

```bash
docker compose up -d postgres
npm run prisma:generate
npm run prisma:migrate
```

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm run build
```

## Autenticacao temporaria

Enquanto a sessao final entre frontend e backend nao e unificada, as rotas financeiras usam headers:

```text
x-user-id
x-user-email
x-user-name
```

Toda query filtra por `userId`.

## Aviso financeiro

O Derycash nao fornece recomendacao financeira profissional. Simulacoes e indicadores devem ser tratados como material educativo para organizacao pessoal.
