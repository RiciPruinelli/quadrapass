import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { startLogin } from "@/const";
import { ArrowLeft, BarChart3, CalendarDays, FileText, Loader2, LogIn, RefreshCw, Users } from "lucide-react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function localMonthString(date: Date) {
  return localDateString(date).slice(0, 7);
}

function formatDate(dateString: string) {
  return new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "2-digit", month: "long" }).format(new Date(`${dateString}T12:00:00`));
}

export default function Internal() {
  const authQuery = trpc.auth.me.useQuery();
  const isAdmin = authQuery.data?.role === "admin";
  const config = window.__MANUS_CONFIG__ as unknown as { localAdminEnabled?: boolean } | undefined;
  const isLocalBrowser = ["localhost", "127.0.0.1", "::1", "[::1]"].includes(window.location.hostname.toLowerCase());
  const localAdminEnabled = isLocalBrowser && config?.localAdminEnabled === true;
  const [localUsername, setLocalUsername] = useState("admin");
  const [localPassword, setLocalPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(localMonthString(new Date()));
  const [selectedDate, setSelectedDate] = useState(localDateString(new Date()));
  const monthlyQuery = trpc.internal.monthly.useQuery(
    { month: selectedMonth },
    { enabled: isAdmin && Boolean(selectedMonth), staleTime: 30_000 },
  );
  const dayQuery = trpc.internal.day.useQuery(
    { date: selectedDate },
    { enabled: isAdmin && Boolean(selectedDate), staleTime: 10_000 },
  );
  const report = monthlyQuery.data;
  const dayReservations = dayQuery.data ?? [];
  const maxTimeValue = Math.max(...(report?.busiestTimes.map(item => item.value) ?? [1]));
  const maxDayValue = Math.max(...(report?.busiestDays.map(item => item.value) ?? [1]));
  const totalStudentsByCourse = useMemo(() => report?.courses.reduce((sum, item) => sum + item.value, 0) ?? 0, [report]);

  const handleOAuthLogin = () => {
    setLoginError(null);
    try {
      startLogin();
    } catch {
      setLoginError("O login Manus não está configurado neste servidor local. Configure OAuth para produção ou habilite o acesso local de teste.");
    }
  };

  const handleLocalAdminSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const response = await fetch("/api/local-admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ username: localUsername, password: localPassword }),
      });
      const result = await response.json().catch(() => ({})) as { message?: string };
      if (!response.ok) throw new Error(result.message ?? "Não foi possível entrar no painel.");
      setLocalPassword("");
      const refreshed = await authQuery.refetch();
      if (refreshed.data?.role !== "admin") throw new Error("A sessão foi criada, mas o acesso administrativo não foi confirmado. Atualize a página.");
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Não foi possível entrar no painel.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (authQuery.isLoading) {
    return <div className="internal-loading"><Loader2 className="spin" size={20} /> Verificando acesso...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="internal-gate">
        <div className="internal-gate-mark"><BarChart3 size={24} /></div>
        <div className="qp-kicker">área da Fatec / responsável</div>
        <h1>Painel de controle interno</h1>
        <p>Esta área reúne a lista completa de reservas, alunos e relatórios mensais. O acesso é restrito à conta administrativa da faculdade.</p>
        {authQuery.isError && <p className="qp-error" role="alert">Não foi possível verificar seu acesso. Tente novamente ou entre pela conta administrativa.</p>}
        {localAdminEnabled ? (
          <form className="internal-local-login-form" onSubmit={handleLocalAdminSubmit}>
            <label>Usuário<input autoComplete="username" required value={localUsername} onChange={event => setLocalUsername(event.target.value)} /></label>
            <label>Senha<input type="password" autoComplete="current-password" required value={localPassword} onChange={event => setLocalPassword(event.target.value)} /></label>
            <Button className="internal-login" type="submit" disabled={isLoggingIn}>{isLoggingIn ? <Loader2 className="spin" size={17} /> : <LogIn size={17} />} Entrar como responsável</Button>
            <small className="internal-local-notice">Acesso de teste local; disponível apenas pelo próprio computador.</small>
          </form>
        ) : (
          <Button className="internal-login" onClick={handleOAuthLogin}><LogIn size={17} /> Entrar com a conta administrativa</Button>
        )}
        {loginError && <p className="qp-error" role="alert">{loginError}</p>}
        {authQuery.data && <small>Sua conta está autenticada, mas ainda não possui permissão administrativa.</small>}
        <a className="internal-back" href="/"><ArrowLeft size={15} /> voltar para a agenda dos alunos</a>
      </div>
    );
  }

  return (
    <div className="internal-shell">
      <header className="internal-header">
        <div className="qp-brand">
          <div className="qp-mark" aria-hidden="true"><span /><span /></div>
          <div><div className="qp-wordmark">Quadra<span>Pass</span></div><div className="qp-brand-subtitle">Painel interno · Fatec Franca</div></div>
        </div>
        <a className="internal-back" href="/"><ArrowLeft size={15} /> agenda pública</a>
      </header>
      <main className="internal-container">
        <div className="internal-title-row">
          <div><div className="qp-kicker"><span className="qp-kicker-line" /> visão da faculdade</div><h1>Controle da quadra.</h1><p>Consulte quem agendou, acompanhe os participantes do dia e veja os horários de maior uso.</p></div>
          <div className="internal-user"><span className="internal-user-dot" /> acesso administrativo<strong>{authQuery.data?.name ?? authQuery.data?.email ?? "Responsável"}</strong></div>
        </div>

        <section className="internal-controls">
          <label>Relatório mensal<input type="month" value={selectedMonth} onChange={event => setSelectedMonth(event.target.value)} /></label>
          <label>Lista do dia<input type="date" value={selectedDate} onChange={event => setSelectedDate(event.target.value)} /></label>
          <Button className="internal-refresh" disabled={!selectedMonth || !selectedDate || monthlyQuery.isFetching || dayQuery.isFetching} onClick={() => { void monthlyQuery.refetch(); void dayQuery.refetch(); }}><RefreshCw size={16} /> atualizar dados</Button>
        </section>

        {!selectedMonth && <p className="qp-error" role="status">Selecione um mês para consultar o relatório.</p>}
        {!selectedDate && <p className="qp-error" role="status">Selecione uma data para consultar as reservas do dia.</p>}
        {monthlyQuery.isError && <p className="qp-error" role="alert">Não foi possível carregar o relatório mensal. Tente atualizar os dados.</p>}
        {monthlyQuery.isLoading ? <div className="internal-loading"><Loader2 className="spin" size={20} /> Carregando relatório...</div> : report && <>
          <section className="internal-metrics">
            <div><span><CalendarDays size={15} /> reservas no mês</span><strong>{report.reservations}</strong><small>{selectedMonth}</small></div>
            <div><span><Users size={15} /> alunos atendidos</span><strong>{report.participants}</strong><small>participações registradas</small></div>
            <div><span><BarChart3 size={15} /> pico de uso</span><strong>{report.peakTime ?? "—"}</strong><small>faixa com mais reservas</small></div>
          </section>
          <div className="internal-grid">
            <section className="internal-card">
              <div className="internal-card-heading"><div><div className="qp-kicker">demanda por faixa</div><h2>Horários mais usados</h2></div><BarChart3 size={18} /></div>
              <div className="internal-bars">{report.busiestTimes.length ? report.busiestTimes.map(item => <div className="internal-bar-row" key={item.label}><span>{item.label}</span><div><i style={{ width: `${Math.max(12, (item.value / maxTimeValue) * 100)}%` }} /></div><strong>{item.value}</strong></div>) : <p className="internal-empty">Ainda não há reservas neste mês.</p>}</div>
            </section>
            <section className="internal-card">
              <div className="internal-card-heading"><div><div className="qp-kicker">perfil das participações</div><h2>Alunos por curso</h2></div><Users size={18} /></div>
              <div className="internal-course-list">{report.courses.length ? report.courses.map(item => <div key={item.label}><span>{item.label}</span><strong>{item.value}<small> / {totalStudentsByCourse}</small></strong></div>) : <p className="internal-empty">Ainda não há participações neste mês.</p>}</div>
            </section>
            <section className="internal-card">
              <div className="internal-card-heading"><div><div className="qp-kicker">demanda por data</div><h2>Dias mais concorridos</h2></div><CalendarDays size={18} /></div>
              <div className="internal-bars">{report.busiestDays.length ? report.busiestDays.map(item => <div className="internal-bar-row" key={item.label}><span>{new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(new Date(`${item.label}T12:00:00`))}</span><div><i style={{ width: `${Math.max(12, (item.value / maxDayValue) * 100)}%` }} /></div><strong>{item.value}</strong></div>) : <p className="internal-empty">Ainda não há reservas neste mês.</p>}</div>
            </section>
          </div>
          <details className="internal-monthly-details">
            <summary>Ver reservas detalhadas do mês ({report.reservationsByDay.length})</summary>
            {report.reservationsByDay.length ? <div className="internal-reservations">{report.reservationsByDay.map(reservation => <article key={reservation.id} className="internal-reservation"><div className="internal-reservation-time"><strong>{reservation.startTime}</strong><span>{reservation.endTime}</span><small>{formatDate(reservation.reservationDate)}</small></div><div className="internal-reservation-main"><div className="internal-reservation-title"><strong>{reservation.responsibleName}</strong><span>{reservation.confirmationCode}</span></div><small>Responsável · RA {reservation.responsibleRa}</small><div className="internal-people">{reservation.participants.map(person => <div key={person.id}><strong>{person.name}</strong><span>{person.ra} · {person.course} · {person.semester}</span></div>)}</div></div><div className="internal-count"><Users size={14} /><strong>{reservation.participants.length}</strong><span>alunos</span></div></article>)}</div> : <p className="internal-empty">Ainda não há reservas neste mês.</p>}
          </details>
        </>}

        <section className="internal-day-card">
          <div className="internal-card-heading"><div><div className="qp-kicker">controle operacional</div><h2>Reservas de {selectedDate ? formatDate(selectedDate) : "uma data selecionada"}</h2></div><FileText size={18} /></div>
          {dayQuery.isError ? <p className="qp-error" role="alert">Não foi possível carregar as reservas deste dia. Tente atualizar os dados.</p> : dayQuery.isLoading ? <div className="internal-loading"><Loader2 className="spin" size={18} /> Carregando lista...</div> : dayReservations.length === 0 ? <p className="internal-empty">Nenhuma reserva encontrada para este dia.</p> : <div className="internal-reservations">{dayReservations.map(reservation => <article key={reservation.id} className="internal-reservation"><div className="internal-reservation-time"><strong>{reservation.startTime}</strong><span>{reservation.endTime}</span></div><div className="internal-reservation-main"><div className="internal-reservation-title"><strong>{reservation.responsibleName}</strong><span>{reservation.confirmationCode}</span></div><small>Responsável · RA {reservation.responsibleRa}</small><div className="internal-people">{reservation.participants.map(person => <div key={person.id}><strong>{person.name}</strong><span>{person.ra} · {person.course} · {person.semester}</span></div>)}</div></div><div className="internal-count"><Users size={14} /><strong>{reservation.participants.length}</strong><span>alunos</span></div></article>)}</div>}
        </section>
      </main>
    </div>
  );
}
