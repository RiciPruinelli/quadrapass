# QuadraPass Mobile — Fatec Franca

Aplicativo React Native/Expo para os alunos da Fatec Franca. Usa a mesma API da versão web e oferece agenda compacta em blocos de 30 minutos, estados visíveis para horários livres e reservados, seleção de início e término, criação ou entrada em reservas, cadastro de participantes e comprovante com QR Code.

## Teste local no Windows

Mantenha dois terminais PowerShell abertos, partindo da pasta que contém `web` e `mobile`.

No primeiro terminal, inicie o MySQL e a API web:

```powershell
Set-Location .\web
$env:DATABASE_URL = "mysql://quadrapass_local:SENHA_URL_ENCODED@127.0.0.1:3306/quadrapass_dev_20261113"
$env:TIDB_ENABLE_SSL = "false"
corepack pnpm@10.18.0 install --frozen-lockfile
corepack pnpm@10.18.0 db:migrate
corepack pnpm@10.18.0 dev
```

Troque a senha pelo valor do MySQL local, codificando caracteres especiais usados na URL. Deixe esse processo ativo; a API responde em `http://localhost:3000`.

No segundo terminal, inicie o Expo:

```powershell
Set-Location .\mobile
$env:EXPO_PUBLIC_API_BASE_URL = "http://127.0.0.1:3000"
corepack pnpm@10.18.0 install --frozen-lockfile
corepack pnpm@10.18.0 start
```

Abra `http://localhost:8081` para Expo Web no computador ou leia o QR Code no Expo Go. Em um celular físico, `localhost` aponta para o próprio celular: use no `EXPO_PUBLIC_API_BASE_URL` o IPv4 do computador na rede local, por exemplo `http://192.168.0.10:3000`, e reinicie o Expo. Computador e celular devem estar na mesma rede e a porta 3000 acessível.

## Verificações mobile

Na pasta `mobile`:

```powershell
corepack pnpm@10.18.0 exec tsc --noEmit
corepack pnpm@10.18.0 exec expo export --platform web
```

O primeiro comando verifica os tipos do app; o segundo tenta gerar a saída Expo Web. Expo Go no aparelho é necessário para validar recursos nativos e dimensões reais do celular.

## API em hospedagem futura

Antes de gerar uma build mobile que use uma API publicada, defina `EXPO_PUBLIC_API_BASE_URL` com a origem HTTPS do serviço, sem `/api/trpc` no final. Esse valor é incorporado ao app e é público. Nunca coloque `DATABASE_URL`, senha de banco, chave OAuth ou outro segredo em variável `EXPO_PUBLIC_*`.

A versão atual de desenvolvimento continua apontando para a API local. Nenhuma publicação, build de loja ou deploy foi executado nesta preparação.
