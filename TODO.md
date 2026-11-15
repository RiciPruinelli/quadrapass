# QuadraPass — Entregas

## Agenda e regra de antecedência

- [x] A aplicação deve exibir uma agenda visual da quadra com horários reservados e disponíveis.
- [x] O usuário deve informar o dia e o intervalo de horário em que utilizará a quadra.
- [x] A quadra deve permitir início e término em blocos de 30 minutos, entre 07:00 e 22:00, incluindo exemplos como 19:00–20:00 e 20:00–22:00.
- [x] Não deve ser possível marcar com mais de 2 dias de antecedência.
- [x] O servidor deve validar novamente a regra de antecedência e impedir qualquer sobreposição de intervalos na mesma data.

## Reserva por grupo

- [x] Cada reserva deve aceitar mais de um aluno.
- [x] Todos os alunos que utilizarão a quadra devem ser cadastrados na mesma reserva.
- [x] Qualquer aluno pode entrar em uma reserva já existente no mesmo horário, mesmo sendo de outro curso, turma ou sala.
- [x] Cada participante deve informar nome, RA, semestre e curso.
- [x] O curso deve ser restrito aos quatro cursos presenciais usados pela unidade, além da opção Ensino Médio.

## Persistência e evolução

- [x] Reservas e participantes devem ser mantidos em banco de dados persistente.
- [x] A interface web deve ser responsiva e organizada para futura versão em dispositivos móveis usando React.
- [x] O sistema deve gerar QR Code como comprovante digital da reserva, sem exigir validação por portaria ou porteiro.
- [x] A área pública deve mostrar indicadores simples de horários de maior uso para os alunos.
- [x] A Fatec ou o responsável deve ter um painel interno restrito com a lista completa de reservas e alunos de um determinado dia.
- [x] O painel interno deve apresentar relatório mensal com total de reservas, alunos atendidos, horários de pico, dias mais concorridos e distribuição por curso.
- [x] Alunos não precisam fazer login para consultar a agenda, criar uma reserva ou entrar em uma reserva existente.
- [x] A Fatec/responsável deve acessar a lista completa e os relatórios por meio de login administrativo.
- [x] Deve existir uma versão mobile em React Native/Expo com o mesmo fluxo de agenda e reserva da versão web.

## Próximas evoluções previstas

- [ ] Adicionar exportação do relatório mensal em CSV/PDF, se a coordenação solicitar.

## Progresso

- [x] Projeto web gerenciado inicializado com servidor e banco de dados.
- [x] Direção visual e estrutura de implementação documentadas em `plan.md`.
- [x] Web atualizada para intervalos variáveis e app Expo criado em `mobile/`.
