# QuadraPass — Fatec Franca

Sistema de reservas da quadra com agenda pública, cadastro de participantes e painel interno. A web usa React/Vite, Express, tRPC e Drizzle ORM sobre MySQL; o app mobile Expo está na pasta `mobile/` e consome a mesma API.

## Rodar localmente no Windows

Inicie o MySQL local e, no PowerShell, use um terminal na pasta `web`:

```powershell
$env:DATABASE_URL = "mysql://quadrapass_local:SENHA_URL_ENCODED@127.0.0.1:3306/quadrapass_dev_20261113"
$env:TIDB_ENABLE_SSL = "false"
corepack pnpm@10.18.0 install --frozen-lockfile
corepack pnpm@10.18.0 db:migrate
corepack pnpm@10.18.0 dev
```

Substitua a senha pelo valor local e codifique caracteres especiais próprios de URL. O servidor web/API fica em `http://localhost:3000`. Para testar o app Expo, consulte [`../mobile/README.md`](../mobile/README.md); ele usa uma segunda porta, normalmente `8081`.

O fluxo de administrador local só funciona com `NODE_ENV=development`, credenciais locais definidas e requisições por loopback. As variáveis `LOCAL_ADMIN_USERNAME` e `LOCAL_ADMIN_PASSWORD` ficam em `.env` ou na sessão local e não devem ser usadas em produção. O login de produção depende de Manus OAuth configurado e de uma conta administrativa aprovada.

## Estrutura principal

- `client/`: interface React e páginas web.
- `server/`: API Express/tRPC, autenticação e acesso Drizzle ao banco.
- `drizzle/`: schema MySQL e migrations versionadas.
- `shared/`: regras e tipos compartilhados.
- `mobile/`: aplicação React Native/Expo, mantida e executada separadamente.

## Vercel + TiDB

A preparação de build e os valores de ambiente necessários estão em [`DEPLOY-VERCEL-TIDB.md`](DEPLOY-VERCEL-TIDB.md). A configuração não efetua deploy nem cria contas ou bancos. Para testar localmente, mantenha o `.env` local; ele é ignorado pelo Git. O manifesto `.env.example` contém apenas placeholders.
