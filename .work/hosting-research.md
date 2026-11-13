# Notas de pesquisa — arquitetura e hospedagem

Consulta em 13/11/2026.

## Evidências locais

- Web: React, Vite, TypeScript; Express com tRPC e Zod; Drizzle ORM usando `mysql2`.
- Mobile: Expo/React Native, aponta para a API web por `EXPO_PUBLIC_API_BASE_URL`.
- MySQL com tabelas `users`, `reservations` e `reservation_participants`; migrations Drizzle em `web/drizzle/`.
- Servidor Express atende `PORT` (default 3000) e `0.0.0.0`; produção serve `dist/public`. `web/Dockerfile` já instala com pnpm, executa build e inicia o bundle Node.
- Cliente tRPC web usa URL relativa `/api/trpc`, portanto assume API no mesmo domínio. App Wouter possui rota administrativa `/interno`.
- `users.role` default `user`. `upsertUser` promove a conta quando seu `openId` corresponde a `OWNER_OPEN_ID`; sem OAuth e configuração desse identificador não há credencial admin padrão.

## Fontes oficiais

- GitHub Pages é hospedagem de HTML/CSS/JS estáticos; não executa Express/Node nem banco: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- Google Cloud Run publica serviços Node/Express a partir de código-fonte/contêiner e usa a variável `PORT`: https://docs.cloud.google.com/run/docs/quickstarts/build-and-deploy/deploy-nodejs-service
- Pricing do Cloud Run aplica cota gratuita por uso em regiões Tier 1; São Paulo (`southamerica-east1`) consta entre elas: https://cloud.google.com/run/pricing
- Cloud SQL MySQL oferece trial de até 30 dias; precisa billing e não é tier grátis permanente; trial é de teste, sem backups/restauração padrão: https://docs.cloud.google.com/sql/docs/mysql/free-trial-instance
