# Pesquisa de compatibilidade de hospedagem

Consulta em 13/11/2026; avaliação baseada nos arquivos atuais do QuadraPass e documentação oficial consultada.

## Código local

- Web full-stack é React/Vite + Express/tRPC/Node; servidor serve arquivos estáticos no mesmo Express. O tRPC web aponta para `/api/trpc` relativo à origem.
- `web/Dockerfile` já define Node 22, pnpm 10.18.0, `pnpm install --frozen-lockfile`, `pnpm build` e inicia `dist/index.js`.
- Banco atual é MySQL (`mysql2`, Drizzle, schema `mysqlEnum`, migrações MySQL). App usa `DATABASE_URL` e `drizzle(process.env.DATABASE_URL)`.
- Mobile é Expo/React Native e requer `EXPO_PUBLIC_API_BASE_URL` para a API publicada.
- Não há evidência de config específica Vercel/Render nem de provisionamento/conexão real a provedores; OAuth, banco e domínio precisam de env vars e configuração externa.

## Avaliação por provedor

- Render: docs aceitam serviços Node/Express. Free web services dormem após 15 min e levam cerca de 1 min para acordar; 750 horas/mês por workspace. Render oferece no plano grátis Postgres/Key Value, não serviço MySQL gerenciado. O app pode usar TiDB externo, mas não é adequado a produção segundo as limitações oficiais.
- TiDB Cloud Starter: MySQL-compatible; cota grátis por instância de 5 GiB row + 5 GiB columnar + 50 milhões RU/mês; ao atingir cota free, novas conexões/leituras/escritas ficam limitadas até reset se não habilitar billing. A conexão pública exige TLS; exemplo oficial usa `mysql2` com parâmetro `ssl`, que o atual `drizzle(DATABASE_URL)` não configura explicitamente. Exige testar/ajustar inicialização da conexão.
- Vercel: documenta Express em uma Vercel Function e Hobby free com cotas. O repo atual não tem entrypoint/config Vercel; serviço de produção faz `server.listen` em `server/_core/index.ts` e serve build via `express.static`, que a documentação Vercel diz ser ignorado. Exige adaptar entrypoint/estáticos; não é deploy drop-in. Banco externo continua necessário.
- Supabase: banco é PostgreSQL (free quota 500 MB por projeto), incompatível diretamente com schema e driver MySQL. Pode servir após migração de schema/queries/driver; Auth Supabase não substitui automaticamente o fluxo Manus OAuth atual.

## Fontes oficiais

- Vercel Express: https://vercel.com/docs/frameworks/backend/express
- Vercel Hobby quotas: https://vercel.com/docs/plans/hobby
- Render free: https://render.com/docs/free
- Render web services: https://render.com/docs/web-services
- TiDB tiers/cotas: https://docs.pingcap.com/tidbcloud/select-cluster-tier/
- TiDB FAQ: https://docs.pingcap.com/tidbcloud/serverless-faqs/
- TiDB Node.js mysql2/TLS: https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-mysql2/
- Supabase Postgres: https://supabase.com/docs/guides/database/overview
- Supabase billing quotas: https://supabase.com/docs/guides/platform/billing-on-supabase
