# Guia operacional — QuadraPass na Vercel com TiDB Cloud

**Atualizado em 26/11/2026.** Este guia explica o que precisa ser feito pelo responsável pelas contas GitHub, Vercel, TiDB Cloud e OAuth. A preparação e os testes locais foram realizados, mas **não houve criação de contas, configuração de credenciais, migration remota, push ou deploy**. Nenhum valor fictício deve ser usado como credencial.

## Situação atual e arquitetura

O repositório contém duas aplicações separadas: `web/` é o servidor Express, a interface web e a API; `mobile/` é o cliente Expo/React Native que consome a API web. A implantação Vercel deste guia é somente para `web/`. O app mobile não é publicado automaticamente junto com a API; sua variável pública `EXPO_PUBLIC_API_BASE_URL` precisa apontar para a URL HTTPS da API depois que ela existir.

A pasta de trabalho atual contém `web/` e `mobile/`, mas não está inicializada como repositório Git (`git rev-parse` não encontrou um repositório). Portanto, ainda é necessário criar/conectar um repositório GitHub e enviar o código por uma ação autorizada. Se o repositório no GitHub mantiver a estrutura atual, a **Root Directory da Vercel deve ser `web`**. Use `.` somente se o repositório enviado tiver os arquivos da aplicação web diretamente na raiz.

O Express é servido como uma Vercel Function. `web/vercel.json` já define `pnpm install --frozen-lockfile`, `pnpm run build:vercel` e inclui `dist/public/**`; não configure o projeto como site estático nem force `dist` como diretório de saída. A Vercel documenta o deploy de Express como Function e os requisitos de exportação do app [1].

## 1. Pré-requisitos

Antes de iniciar, tenha acesso às contas que realmente serão usadas: GitHub, Vercel, TiDB Cloud e ao provedor OAuth Manus usado pela aplicação. Instale localmente Node.js `24.x` e use pnpm `10.18.0`, que estão fixados no projeto.

Escolha primeiro um ambiente de teste/Preview e um ambiente de produção. Sempre que a conta e o plano permitirem, mantenha bancos e credenciais distintos para não misturar reservas de teste com dados reais. Antes de criar qualquer recurso, confirme no painel do provedor a região, os limites e possíveis cobranças; disponibilidade de plano gratuito não é garantida.

## 2. Criar ou selecionar o banco TiDB

1. Entre no console TiDB Cloud e crie ou selecione a instância compatível com MySQL que pretende usar. Para reduzir latência, compare as regiões disponíveis com a região pretendida da Function Vercel. Confirme preço, limites, política de suspensão e backups no console antes de provisionar.
2. Abra a instância e selecione **Connect**. Escolha o método de conexão que corresponde ao uso do servidor Node.js. Para Starter/Essential com endpoint público, a documentação orienta conexão TCP com TLS; o painel apresenta o host, porta, usuário e demais parâmetros. Use exatamente os valores exibidos, sem copiar as credenciais locais do MySQL [2] [3].
3. Se ainda não houver senha, gere uma no painel e guarde-a em um gerenciador seguro. Para essas instâncias, o nome de usuário pode incluir um prefixo específico da instância; copie o usuário completo que o painel exibir. A senha gerada pode não ser exibida novamente [2].
4. Crie/selecione o banco lógico de destino e confirme que o usuário tem permissão para criar/alterar as tabelas necessárias às migrations. Separe o banco de Preview do banco de produção quando possível.
5. Configure a rede para permitir somente conexões necessárias. Se usar endpoint público, confira as regras de firewall/allowlist do TiDB e como a Vercel sairá para a rede. Não abra o banco para qualquer origem sem uma decisão explícita de segurança. Se o seu plano exigir CA, use o certificado obtido do próprio painel.
6. Monte `DATABASE_URL` no formato `mysql://USUARIO:SENHA_CODIFICADA@HOST:PORTA/NOME_DO_BANCO`. Codifique caracteres reservados da senha para URL. A porta deve ser a fornecida pelo painel; não presuma que será sempre a mesma.

Para Starter/Essential, a documentação atual informa que o endpoint público exige TLS e que, em geral, não é necessário baixar um certificado de servidor separado porque o certificado é emitido por uma autoridade pública confiável. Para outros tiers ou políticas, siga os dados do painel e forneça a CA se necessário [2]. O código do QuadraPass valida TLS com `rejectUnauthorized` e aceita `TIDB_CA_CERT_BASE64` em Base64.

## 3. Preparar o repositório GitHub

1. Revise o código e os arquivos de configuração no diretório do projeto.
2. Crie ou selecione um repositório GitHub privado/público conforme sua política. Não coloque `.env`, senhas, tokens ou arquivos de conexão no repositório.
3. Envie a estrutura preservando as pastas `web/` e `mobile/`. Esta etapa não foi feita por esta tarefa.
4. Antes de conectar a Vercel, confirme que `web/vercel.json`, `web/package.json`, `web/pnpm-lock.yaml` e `web/index.ts` estão na pasta `web` do repositório.

## 4. Importar na Vercel

1. No painel da Vercel, selecione **Add New → Project** e importe o repositório GitHub.
2. Em **Root Directory**, selecione `web` se o repositório contém a estrutura atual com `web/` e `mobile/` na raiz. Se o repositório contiver somente o conteúdo da pasta `web` na raiz, selecione `.`.
3. Use Node.js `24.x`. Mantenha os comandos de instalação e build definidos por `web/vercel.json`: `pnpm install --frozen-lockfile` e `pnpm run build:vercel`. Não defina `dist` como saída estática: o build inclui assets para a Function Express, e não é um site Vite estático. A Vercel permite personalizar Root Directory e comandos de build nas configurações do projeto; neste projeto esses comandos já estão declarados no arquivo [4].
4. Configure as variáveis de ambiente antes do primeiro deploy Preview, conforme a seção seguinte. Se alterar qualquer variável depois, faça uma nova implantação: mudanças em variáveis não alteram deployments existentes [5].
5. Para o primeiro teste, use Preview e o banco de teste. Não selecione Production até que a validação do Preview e o processo de OAuth estejam aprovados.

## 5. Variáveis de ambiente

Cadastre-as em **Project → Settings → Environment Variables**, marcando os ambientes apropriados. Não envie estes valores por mensagem, não os coloque em commits e não os cole em screenshots. A Vercel aplica as variáveis a novas implantações; mantenha valores diferentes entre Preview e Production [5].

**Banco/TiDB**

- `DATABASE_URL`: URL privada do banco e do usuário correto para aquele ambiente.
- `TIDB_ENABLE_SSL=true`: habilita TLS no TiDB. Não desative TLS em produção.
- `TIDB_CA_CERT_BASE64`: opcional; use somente quando o tier/configuração do cluster exigir uma CA que não esteja coberta pelo trust store padrão.
- `DB_CONNECTION_LIMIT`, `DB_MAX_IDLE` e `DB_IDLE_TIMEOUT_MS`: opcionais; deixe os padrões do código salvo motivo operacional para ajustá-los. Na Vercel, o pool reduz o limite por instância para evitar excesso de conexões.

**OAuth e sessão administrativa**

- `MANUS_PROJECT_ID`: ID real do projeto Manus/OAuth usado pela aplicação.
- `MANUS_OAUTH_API_URL`: URL real do serviço OAuth correspondente a esse projeto.
- `MANUS_JWT_SECRET`: segredo forte, exclusivo e privado para assinatura das sessões.
- `OWNER_OPEN_ID`: OpenID real da conta que deve receber o papel de proprietário/admin. Não é login, senha ou nome de usuário.
- `MANUS_OAUTH_PORTAL_URL`: configure se o provedor OAuth da aplicação fornecer um portal de login separado e esse fluxo for utilizado.

**Integrações Manus condicionais**

- `MANUS_API_URL` e `MANUS_API_KEY`: somente se as funções integradas que chamam serviços Manus forem usadas. O código usa essas variáveis em recursos de API, LLM, imagem, mapas e serviços relacionados. Se esses recursos fizerem parte do escopo da implantação, obtenha os valores reais do provedor; não invente endpoints nem chaves.
- `MANUS_API_BROWSER_KEY`: somente se o cliente web usar o recurso de navegador/integrador correspondente. O código o expõe como configuração pública do browser; não o trate como segredo equivalente a `MANUS_API_KEY`.
- `ALLOWED_ORIGINS`: somente para uma origem HTTPS externa, por exemplo uma versão Expo Web hospedada separadamente que precise chamar a API. Use a origem exata, sem caminho e sem curingas; origens múltiplas são separadas por vírgula. O app Expo nativo não depende de CORS de navegador.

Não configure `LOCAL_ADMIN_USERNAME` nem `LOCAL_ADMIN_PASSWORD` na Vercel. O bypass local é destinado ao modo de desenvolvimento e a requisições de loopback; não substitui OAuth em produção. Não há senha administrativa padrão segura a ser publicada neste guia.

## 6. Registrar os callbacks OAuth

Após escolher o domínio de Preview e o domínio de produção, cadastre no provedor OAuth o callback exato para cada ambiente:

```text
https://DOMINIO-DO-PREVIEW/api/oauth/callback
https://DOMINIO-DE-PRODUCAO/api/oauth/callback
```

A rota registrada no código é `/api/oauth/callback`. Não use um domínio de exemplo como valor real. Se o provedor não aceitar domínios Preview variáveis, use um domínio de Preview estável ou uma aplicação OAuth de teste, se o provedor oferecer essa opção. Confirme também que `MANUS_PROJECT_ID`, `MANUS_OAUTH_API_URL`, `MANUS_OAUTH_PORTAL_URL` quando necessário e `OWNER_OPEN_ID` pertencem ao mesmo ambiente/projeto OAuth.

## 7. Aplicar migrations no banco correto

As migrations revisadas ficam em `web/drizzle/`. Não execute `db:push` como substituto; use a sequência versionada de migrations.

Antes de migrar, confira três vezes que `DATABASE_URL` aponta para o banco de **Preview/teste** esperado. A migration altera o schema do banco escolhido. Faça backup e confirme que o banco não contém dados que possam ser afetados. A migração ainda não foi executada em TiDB remoto.

Em um PowerShell confiável, a partir de `web/`, defina temporariamente os valores reais do ambiente de Preview e execute:

```powershell
Set-Location "CAMINHO-DO-PROJETO\web"
$env:DATABASE_URL = "mysql://USUARIO:SENHA_CODIFICADA@HOST:PORTA/BANCO_PREVIEW"
$env:TIDB_ENABLE_SSL = "true"
# Defina TIDB_CA_CERT_BASE64 somente se a configuração do cluster exigir.
corepack pnpm@10.18.0 db:migrate
```

Não salve os valores substituídos no arquivo versionado. Depois da execução, valide o histórico de migrations no banco e remova as variáveis da sessão PowerShell ou feche-a. Repita para Production somente após aprovação do Preview e com a URL de produção cuidadosamente conferida. O endpoint `/api/health/ready` executa `SELECT 1`, mas não prova que todas as migrations foram aplicadas.

## 8. Fazer e validar um deployment Preview

Depois que o repositório estiver no GitHub, as variáveis de Preview estiverem completas e as migrations do banco de teste tiverem sido aplicadas, crie um deployment Preview pela Vercel. Esta etapa pode publicar um endpoint acessível; confirme o domínio e o escopo antes de realizá-la. Ela não foi executada nesta revisão.

No Preview, valide nesta ordem:

1. `https://DOMINIO-PREVIEW/api/health` deve responder como serviço vivo.
2. `https://DOMINIO-PREVIEW/api/health/ready` deve responder `200` com `{"status":"ready","database":"ok"}` quando a conexão estiver disponível. Um `503` indica que URL, credenciais, TLS, rede ou banco precisam de verificação.
3. Abra a página inicial e confirme a agenda, a disponibilidade dos três dias, os horários livres/ocupados e o formulário de reserva em desktop e viewport mobile.
4. Teste OAuth com uma conta autorizada e confirme que a rota `/interno` restringe o painel. Verifique o reconhecimento do proprietário/admin por `OWNER_OPEN_ID`.
5. Com dados descartáveis e consentimento para gravá-los no banco de Preview, teste criação de reserva, colisão de horário, entrada em reserva existente, QR Code e relatório mensal. Apague os dados de teste somente pelo fluxo administrativo suportado; não teste com dados pessoais reais.
6. Confira logs da Vercel e do TiDB após os testes. Não copie valores de variáveis de ambiente para logs, mensagens ou capturas.

O teste local de saúde não valida a configuração OAuth nem o conteúdo das migrations; cada parte deve ser conferida separadamente. A aplicação Express é executada como uma Vercel Function, então acompanhe limites de execução, concorrência e conexões do banco [1].

## 9. Configurar o cliente mobile depois do domínio web

Depois que a API estiver validada, configure a origem pública no app mobile antes de gerar uma build:

```powershell
Set-Location "CAMINHO-DO-PROJETO\mobile"
$env:EXPO_PUBLIC_API_BASE_URL = "https://DOMINIO-VALIDADO"
```

`EXPO_PUBLIC_API_BASE_URL` é incorporada ao app e não é secreta. Nunca use prefixo `EXPO_PUBLIC_` para `DATABASE_URL`, senha de banco, chave de OAuth ou chave privada. Para Expo Web hospedado em origem separada, inclua a origem HTTPS exata em `ALLOWED_ORIGINS` na API e faça um novo deployment. Para o aplicativo nativo, teste a conexão no Expo Go e, depois, no build de distribuição escolhido. O bundle local Android/Web desta revisão foi gerado; não houve build de loja nem publicação mobile.

## 10. Manter o desenvolvimento local

Use banco local separado, desligue TLS somente no ambiente local e mantenha servidores e dependências na pasta correta. Exemplo de PowerShell, executado em um terminal separado:

```powershell
Set-Location "CAMINHO-DO-PROJETO\web"
$env:DATABASE_URL = "mysql://USUARIO_LOCAL:SENHA_URL_ENCODED@127.0.0.1:3306/BANCO_LOCAL"
$env:TIDB_ENABLE_SSL = "false"
corepack pnpm@10.18.0 db:migrate
corepack pnpm@10.18.0 dev
```

A web local usa `http://localhost:3000`. Para Expo, abra outro PowerShell:

```powershell
Set-Location "CAMINHO-DO-PROJETO\mobile"
$env:EXPO_PUBLIC_API_BASE_URL = "http://IP-DO-PC-NA-REDE:3000"
corepack pnpm@10.18.0 start
```

No celular físico, `localhost` aponta para o celular; use o IPv4 LAN do computador. Para Expo Web em desenvolvimento, a API permite origem local na porta `8081`. Os servidores web e Metro que estavam ativos não foram interrompidos para substituir `node_modules`; a instalação original ainda deve ser reparada depois de encerrar os processos que estiverem usando esses arquivos. Não faça essa reinstalação enquanto os servidores dependerem da pasta.

## 11. Testes desta revisão e avisos

Na cópia isolada de validação, a web passou em `check`, em **41 testes distribuídos por 8 arquivos** e em `build:vercel`. A suíte foi ajustada para incluir `shared/`; também foi corrigido o comportamento de autorização tRPC para distinguir sessão ausente (`UNAUTHORIZED`) de usuário autenticado sem papel admin (`FORBIDDEN`).

Na cópia isolada mobile, passaram `typecheck` e `expo export` para Android e Web. Isso valida tipos e geração de bundle, mas não substitui teste do Expo Go em aparelho físico.

Na web local, a página inicial carregou com os três dias, 30 faixas de meia hora e campos de participante/curso/semestre; o smoke test não enviou reserva nem completou interação de todos os botões. No Expo Web local, após atualizar uma aba antiga, a agenda mostrou as datas corretas. A seleção do dia seguinte carregou 29 horários livres e um reservado às 12:00; foram exercitados seleção de horário e término, listas de semestre/curso, adicionar/remover participante e abertura do fluxo de entrada em reserva existente. Tudo ficou em rascunho, sem confirmar reserva ou participação, e a página foi recarregada para limpar as seleções. Isso valida a navegação e leitura da agenda no cliente Expo Web contra a API local, mas **não** a gravação. Ainda não houve teste do app nativo em aparelho físico, nem teste real de TiDB, OAuth, Vercel ou domínio público.

O build da Vercel terminou com dois avisos não bloqueantes: script clássico `/api/platform/config.js` e chunk JavaScript acima de 500 kB. A publicação pode ser validada sem bloquear pelo aviso, mas convém acompanhar o carregamento e considerar divisão/lazy-load do bundle em uma revisão posterior.

## Referências oficiais

[1]: https://vercel.com/docs/frameworks/backend/express "Express on Vercel"
[2]: https://docs.pingcap.com/tidbcloud/secure-connections-to-serverless-clusters/ "TLS Connections to TiDB Cloud Starter or Essential"
[3]: https://docs.pingcap.com/tidbcloud/connect-to-tidb-cluster-serverless/ "Connect to TiDB Cloud Starter or Essential"
[4]: https://vercel.com/docs/builds/configure-a-build "Configuring a Vercel Build"
[5]: https://vercel.com/docs/environment-variables "Vercel Environment Variables"
[6]: https://docs.pingcap.com/developer/dev-guide-sample-application-nodejs-mysql2/ "TiDB Node.js mysql2 Sample Application"
