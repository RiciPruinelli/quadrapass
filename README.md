# QuadraPass — Controle da Quadra Fatec Franca

React / Express / tRPC / Drizzle starter, adapted from the Sandbox web-db-user template.

- `pnpm dev`: development server; honors `PORT` (default 3000).
- `pnpm build` / `pnpm start`: build and serve `dist/index.js` and `dist/public/`.
- `pnpm db:migrate`: apply checked-in migrations. `pnpm db:push`: generate and apply new schema changes.
- `pnpm check` / `pnpm test`: types and application tests.

Start with the Webdev skill's default-template guide. Platform login, storage, payments and service contracts live in its shared references; read the relevant capability before extending its helper.

`server/_core/publicConfig.ts` exposes only named public runtime values. Private keys stay server-side. The platform serves managed `/manus-storage/` assets; the application does not register a second proxy.

Platform configuration is readable and editable through `webdev.config`. Default settings are initial values, not enforced constraints. The agent may modify the files, commands and configuration or follow the flexible guide for another stack.

## Local administrator test login

The local username/password flow exists only when `NODE_ENV=development` and both `LOCAL_ADMIN_USERNAME` and `LOCAL_ADMIN_PASSWORD` are set. It is also restricted to requests over loopback (`localhost`, `127.0.0.1` or `::1`); production keeps the configured Manus OAuth flow and has no default password.

For a disposable local test in Windows CMD, set these values in the same terminal before starting `pnpm dev`:

```cmd
set LOCAL_ADMIN_USERNAME=admin
set LOCAL_ADMIN_PASSWORD=ESCOLHA_UMA_SENHA_LOCAL
```

The local session is signed with a random per-process key and expires after two hours. Keep the password out of source control and do not publish the app with a test password. For production, configure Manus OAuth and an approved administrative account.
