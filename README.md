# QuadraPass — Fatec Franca

Sistema de reservas da quadra organizado em um único repositório, com a aplicação web/API e o cliente mobile em pastas separadas.

## Estrutura

- [`web/`](./web/README.md): interface web, API Express/tRPC e acesso MySQL via Drizzle. O guia de configuração e deploy está em [`web/DEPLOY-VERCEL-TIDB-GUIA.md`](./web/DEPLOY-VERCEL-TIDB-GUIA.md).
- [`mobile/`](./mobile/README.md): aplicativo React Native/Expo, que consome a API da pasta `web/`.

## Desenvolvimento local no Windows

São necessários Node.js 24.x, pnpm 10.18.0 e um MySQL local de teste. Inicie a API em um terminal PowerShell, dentro de `web/`, definindo `DATABASE_URL` para o seu banco local e `TIDB_ENABLE_SSL=false`; instale as dependências, aplique as migrations e execute `corepack pnpm@10.18.0 dev`. A API fica em `http://localhost:3000`.

Em outro PowerShell, entre em `mobile/`, configure `EXPO_PUBLIC_API_BASE_URL` para a API. No computador, use `http://127.0.0.1:3000`; em um aparelho físico, use o IPv4 do computador na rede local. Instale as dependências e execute `corepack pnpm@10.18.0 start`. O Expo Web fica normalmente em `http://localhost:8081`.

Os comandos completos, variáveis e limitações estão nos READMEs de cada aplicação. Não use credenciais reais em exemplos, commits ou mensagens.

## Segurança

Arquivos `.env`, segredos, chaves de assinatura, dependências e artefatos de build não devem ser versionados. Use os arquivos `.env.example` como referência e configure valores reais somente no ambiente local ou no painel seguro do serviço correspondente. Não existe senha administrativa padrão para produção.
