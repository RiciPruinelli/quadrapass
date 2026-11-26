# Estado da preparação Vercel + TiDB Cloud

**Atualizado em 26/11/2026.** A validação isolada passou: web `check`, 41 testes em 8 arquivos e `build:vercel`; mobile `typecheck` e exports Expo para Android e Web. O detalhe está no [relatório atualizado de testes](./.work/relatorio-testes-2026-11-26.md).

O smoke test adicional no Expo Web exercitou datas/horários, seletores, adição/remoção de participante e entrada em reserva existente, sem enviar dados. A web foi conferida visualmente na tela inicial; o teste físico pelo Expo Go ainda não ocorreu.

O guia operacional foi revisto com passos de TiDB, GitHub, Root Directory `web`, configurações Vercel, variáveis privadas, callback OAuth, migrations, Preview e smoke checks: [DEPLOY-VERCEL-TIDB-GUIA.md](./DEPLOY-VERCEL-TIDB-GUIA.md).

Ainda não houve push, deploy, configuração de contas/credenciais, conexão ou migration remota. O workspace local não está dentro de um repositório Git. Os testes foram executados em cópia isolada para preservar servidores locais ativos; os `node_modules` originais não foram substituídos. Não declare o sistema pronto para produção até concluir a configuração externa e os testes em Preview.
