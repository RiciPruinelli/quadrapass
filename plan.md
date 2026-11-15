# QuadraPass — Plano de implementação e design

## Escopo

O QuadraPass será um sistema web responsivo, acompanhado de um app React Native/Expo, para organizar o uso da quadra da Fatec Franca. A entrega cobre a agenda visual, criação e entrada em reservas por grupo, cadastro obrigatório de todos os participantes, regra de no máximo dois dias de antecedência, intervalos variáveis em passos de 30 minutos e prevenção de sobreposição. A área administrativa fica protegida por login; alunos não precisam criar conta para reservar.

## Implementação

- **Frontend:** React + TypeScript + Vite, com rotas simples via Wouter e componentes acessíveis em Tailwind/CSS.
- **Backend:** Express + tRPC, mantendo as operações de agenda em procedimentos tipados.
- **Persistência:** MySQL gerenciado via Drizzle. As entidades principais serão `reservations` e `reservationParticipants`, com uma restrição lógica transacional para impedir sobreposição de reservas no mesmo horário.
- **Regra de negócio:** as datas permitidas vão de hoje até dois dias corridos à frente, com comparação feita no servidor; o cliente apenas antecipa a mensagem e desabilita datas inválidas. A quadra funciona das 07:00 às 22:00, com início e término em blocos de 30 minutos. Horários ocupados são retornados pela agenda e a mutação rejeita qualquer intervalo que se sobreponha a uma reserva ativa.
- **Grupo:** uma reserva possui um responsável e uma lista de participantes; cada participante registra nome, RA, semestre e curso.
- **Participação aberta:** qualquer aluno pode criar uma reserva ou entrar em uma reserva existente no mesmo horário, sem bloqueio por curso, turma ou sala. O curso e o semestre servem para identificação e relatório interno.
- **Comprovante:** cada reserva possui um código e um QR Code digital para o aluno guardar no celular. Não há fluxo de validação por portaria, pois o acesso físico é liberado pelo vigilante mediante o controle interno.
- **Visões:** a agenda pública mostra ocupação e indicadores simples; a rota `/interno` exige conta administrativa e mostra todos os alunos do dia e relatórios mensais completos.
- **Cursos:** valores mantidos em uma constante compartilhada para garantir que formulário e servidor aceitem exatamente a mesma lista.
- **Mobile:** `mobile/` contém o app Expo/React Native em orientação portrait, conectado aos mesmos procedimentos tRPC da web por `EXPO_PUBLIC_API_BASE_URL`, com agenda, criação/entrada em reserva, participantes e QR Code.

## Estrutura do projeto

- `client/src/pages/Home.tsx`: painel principal com agenda, resumo e formulário de reserva.
- `client/src/index.css`: tokens visuais, responsividade e identidade institucional.
- `client/src/App.tsx`: composição de tema e rota principal.
- `shared/const.ts`: opções de curso e constantes de negócio compartilháveis.
- `drizzle/schema.ts`: tabelas de usuários, reservas e participantes.
- `server/db.ts`: consultas e escrita transacional da agenda.
- `server/routers.ts`: procedimentos tRPC de agenda e criação de reservas.
- `public/manus-routes.json`: manifesto das rotas da aplicação.
- `mobile/App.tsx`: experiência mobile Expo para alunos.
- `mobile/app.json`: identidade nativa, esquema e configuração de plataformas.
- `mobile/README.md`: execução com Expo Go e configuração da API.

## Design

### Alternativas consideradas

1. **Placar editorial esportivo** (probabilidade 0,07): tipografia forte, blocos assimétricos e sinais de jogo ao vivo.
2. **Campus quieto** (probabilidade 0,06): superfície clara, ritmo calmo e foco em leitura administrativa.
3. **Noite de campeonato** (probabilidade 0,05): fundo escuro, neon e linguagem de transmissão esportiva.

### Direção escolhida: Placar editorial esportivo

- **Movimento de design:** editorial esportivo contemporâneo, como um placar de ginásio traduzido para uma ferramenta acadêmica.
- **Princípios:** informação em primeiro plano; contraste alto para horários; ações curtas e confiáveis; sensação de operação em tempo real.
- **Filosofia de cor:** azul-marinho quase preto ancora a confiança institucional; creme aquece a superfície e evita aparência de sistema genérico; laranja queimado funciona como cor própria para disponibilidade e ação, lembrando a quadra sem parecer infantil.
- **Paradigma de layout:** cabeçalho compacto e uma composição assimétrica com agenda ampla à esquerda e painel de ação contextual à direita; em telas pequenas, o painel de ação vem antes da agenda.
- **Elementos de assinatura:** faixa vertical de status “quadra aberta”; horários como cartões de placar; pequenos marcadores de linha que remetem às marcações da quadra.
- **Interação:** escolher um horário deve parecer reservar um intervalo no placar: feedback imediato, estados cheios/abertos explícitos e erros explicados no contexto.
- **Animação:** entradas suaves de 180–240 ms; cartões de agenda deslizam poucos pixels ao trocar o dia; sucesso usa expansão discreta do resumo, sem confete ou movimento decorativo.
- **Tipografia:** Space Grotesk para títulos e números, DM Sans para leitura e formulários; hierarquia por peso e espaçamento, não por excesso de tamanhos.
- **Essência da marca:** “A quadra no ritmo certo para toda a comunidade Fatec.” Personalidade: direta, acolhedora, operacional.
- **Voz:** títulos objetivos e microcopy que orienta sem burocracia. Exemplos: “Escolha o intervalo. O resto a gente organiza.” e “Todos que vão jogar entram nesta reserva.”
- **Wordmark/marca:** “QP” como duas linhas paralelas formando uma meia quadra, seguido de QuadraPass em caixa mista.
- **Cor proprietária:** laranja queimado `#E56B3F`, usado apenas para ação, disponibilidade e destaque operacional.
