<<<<<<< HEAD
# QuadraPass Mobile — Fatec Franca

Aplicativo React Native/Expo para alunos da Fatec Franca. Ele usa a mesma API da versão web e oferece escolha de hoje, amanhã ou depois; agenda compacta em grade de blocos de 30 minutos, com estados visíveis para horários livres e reservados; escolha do término; criação ou entrada em reserva; cadastro de participantes de qualquer curso, turma ou sala; e comprovante digital com QR Code.

## Executar no Windows (PowerShell)

Partindo da raiz do repositório:

```powershell
cd mobile
pnpm install --ignore-workspace --frozen-lockfile
$env:EXPO_PUBLIC_API_BASE_URL = "https://quadrapass-e88hck84.manus.space"
pnpm start
```

No celular, abra o QR Code no Expo Go. Abrir `http://localhost:8081` no navegador do computador exibe Expo Web; para verificar a tela no tamanho real do aparelho, use o QR Code no Expo Go. Para testar com uma API local, configure `EXPO_PUBLIC_API_BASE_URL` com o endereço de rede do computador, por exemplo `http://192.168.0.10:3000`; `localhost` no celular aponta para o próprio aparelho, não para o computador. O servidor/API local deve estar ativo e acessível na mesma rede.

### Teste local completo no Windows

São dois servidores diferentes. A API web/MySQL responde na porta `3000`; o Expo/Metro e a prévia Expo Web usam `8081`. Abra dois terminais PowerShell a partir da raiz do repositório.

No primeiro terminal, inicie a API depois de informar a senha real do usuário MySQL local:

```powershell
cd web
$env:DATABASE_URL = "mysql://quadrapass_local:SENHA_URL_ENCODED@127.0.0.1:3306/quadrapass_dev_20261113"
corepack pnpm@10.18.0 dev
```

Troque `SENHA_URL_ENCODED` pela senha MySQL; codifique caracteres especiais usados na URL. No PowerShell, não use `set "DATABASE_URL=..."`, que é sintaxe do CMD. Se o schema local for novo, execute `corepack pnpm@10.18.0 db:migrate` nesse terminal, antes de `dev`.

No segundo terminal, inicie o app apontando para a API. Para Expo Web aberto no mesmo computador:

```powershell
cd mobile
$env:EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000"
corepack pnpm@10.18.0 start
```

Abra `http://localhost:8081` no computador. Para usar Expo Go no celular, substitua o endereço da API pelo IPv4 do computador, por exemplo `http://192.168.0.10:3000`, e reinicie o Expo; `localhost` no telefone aponta para o próprio telefone. Mantenha os dois servidores ativos durante o teste.

## URL da API ao publicar o app

O app mobile não descobre automaticamente onde a API está hospedada. Configure `EXPO_PUBLIC_API_BASE_URL` com a origem HTTPS pública que serve a API antes de iniciar o processo de build. Se o site web e a API estiverem no mesmo domínio, use esse domínio; se forem serviços separados, use o domínio do backend/API. O app acrescenta `/api/trpc`, então informe somente a origem, sem esse caminho.

```powershell
$env:EXPO_PUBLIC_API_BASE_URL = "https://SEU-DOMINIO-PUBLICO-DA-API"
```

Esse valor é incorporado ao app distribuído e é público; não coloque `DATABASE_URL`, senhas ou outros segredos em variáveis `EXPO_PUBLIC_*`. Se o domínio da API mudar, atualize a configuração e gere uma nova build/atualização do app.

## GitHub e app instalável

O GitHub guarda o código-fonte; ele não converte a pasta em aplicativo nem executa sozinho a API Node/MySQL. Expo Go serve para desenvolvimento. Para gerar um app Android/iOS instalável, use Expo Application Services (EAS Build); depois distribua para teste interno ou publique nas lojas. A URL da API pública precisa estar configurada antes dessa build. Consulte o fluxo completo de repositório, hospedagem e distribuição em [`docs/operacao.md`](../docs/operacao.md).

## Executar no macOS/Linux

```bash
cd mobile
pnpm install --ignore-workspace --frozen-lockfile
EXPO_PUBLIC_API_BASE_URL=https://quadrapass-e88hck84.manus.space pnpm start
```

## Validar

```powershell
pnpm exec tsc --noEmit
pnpm exec expo export --platform web
```

O primeiro comando verifica os tipos mobile; o segundo verifica o empacotamento Expo Web. O Expo Go em aparelhos Android/iOS continua necessário para validar interação e QR no dispositivo.

O login continua restrito ao painel administrativo da Fatec na versão web. O fluxo de reserva dos alunos permanece aberto, sem login obrigatório.
=======
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

No PowerShell, use a sintaxe de ambiente própria dele, no mesmo terminal em que iniciará `pnpm dev`:

```powershell
$env:LOCAL_ADMIN_USERNAME = "admin"
$env:LOCAL_ADMIN_PASSWORD = "SENHA_LOCAL"
```

Também é possível salvar esses nomes em `web/.env`, que é lido por `dotenv/config` e está excluído pelo `.gitignore` do projeto. Em qualquer caso, reinicie o servidor depois de definir as variáveis.

The local session is signed with a random per-process key and expires after two hours. Keep the password out of source control and do not publish the app with a test password. For production, configure Manus OAuth and an approved administrative account.
>>>>>>> 397ac71f8fe0b47bdcea901e6ae41eeb38c0f262
