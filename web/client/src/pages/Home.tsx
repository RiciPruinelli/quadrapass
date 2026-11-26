import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FATEC_COURSES, SEMESTER_OPTIONS, TIME_SLOTS } from "@shared/const";
import { availableEndTimes } from "@/lib/reservation-time";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Info,
  Loader2,
  Minus,
  Plus,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type Participant = {
  name: string;
  ra: string;
  semester: (typeof SEMESTER_OPTIONS)[number] | "";
  course: (typeof FATEC_COURSES)[number] | "";
};

type Reservation = {
  id: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  participantCount: number;
};

const emptyParticipant = (): Participant => ({
  name: "",
  ra: "",
  semester: "",
  course: "",
});

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function plusDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

function formatLongDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(date);
}

function formatShortDate(dateString: string) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  })
    .format(date)
    .replace(".", "");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join("")
    .toUpperCase();
}

export default function Home() {
  const today = localDateString(new Date());
  const agendaQuery = trpc.agenda.window.useQuery(undefined, { staleTime: 10_000 });
  const analyticsQuery = trpc.agenda.analytics.useQuery(undefined, { staleTime: 30_000 });
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedEndTime, setSelectedEndTime] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([emptyParticipant()]);
  const [submittedCode, setSubmittedCode] = useState("");

  const windowData = agendaQuery.data;
  const reservations = (windowData?.reservations ?? []) as Reservation[];
  const slots = windowData?.slots ?? TIME_SLOTS;
  const todayFromServer = windowData?.today ?? today;
  const maxDate = windowData?.maxDate ?? plusDays(todayFromServer, 2);

  useEffect(() => {
    if (!windowData) return;
    if (selectedDate < windowData.today || selectedDate > windowData.maxDate) {
      setSelectedDate(windowData.today);
    }
  }, [windowData, selectedDate]);

  const availableDates = useMemo(
    () => [0, 1, 2].map(offset => plusDays(todayFromServer, offset)),
    [todayFromServer],
  );

  const selectedReservations = useMemo(
    () => reservations.filter(reservation => reservation.reservationDate === selectedDate),
    [reservations, selectedDate],
  );

  const reservationAtTime = (time: string) => selectedReservations.find(
    reservation => reservation.startTime <= time && reservation.endTime > time,
  );

  const handleConfirmed = (result: { confirmationCode: string }, message: string) => {
    setSubmittedCode(result.confirmationCode);
    setSelectedReservationId(null);
    setSelectedTime("");
    setParticipants([emptyParticipant()]);
    void agendaQuery.refetch();
    void analyticsQuery.refetch();
    toast.success(message, {
      description: `Código ${result.confirmationCode} · guarde o comprovante no celular.`,
    });
  };

  const createReservation = trpc.agenda.create.useMutation({
    onSuccess: result => {
      handleConfirmed(result, "Reserva criada");
    },
    onError: error => {
      toast.error("Não foi possível reservar", { description: error.message });
    },
  });

  const joinReservation = trpc.agenda.join.useMutation({
    onSuccess: result => {
      handleConfirmed(result, "Você entrou na reserva");
    },
    onError: error => {
      toast.error("Não foi possível entrar", { description: error.message });
    },
  });

  const isJoining = Boolean(selectedReservationId);
  const joiningReservation = selectedReservationId
    ? reservations.find(reservation => reservation.id === selectedReservationId)
    : undefined;
  const remainingParticipantCapacity = isJoining
    ? Math.max(0, 20 - (joiningReservation?.participantCount ?? 0))
    : 20;

  function updateParticipant(index: number, field: keyof Participant, value: string) {
    setParticipants(current =>
      current.map((participant, participantIndex) =>
        participantIndex === index ? { ...participant, [field]: value } : participant,
      ),
    );
  }

  function selectSlot(date: string, startTime: string, reservationId?: number) {
    setSelectedDate(date);
    setSelectedTime(startTime);
    setSelectedReservationId(reservationId ?? null);
    const reservation = reservationId ? reservations.find(item => item.id === reservationId) : undefined;
    setSelectedEndTime(reservation?.endTime ?? TIME_SLOTS.find(slot => slot.start === startTime)?.end ?? "");
    setSubmittedCode("");
    document.getElementById("reserve-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const startSlot = slots.find(item => item.start === selectedTime);
    if (!selectedTime || !startSlot || !selectedEndTime || selectedTime >= selectedEndTime) {
      toast.error("Escolha o início e o término do intervalo.");
      return;
    }
    if (participants.some(participant => participant.name.trim().length < 3 || participant.ra.trim().length < 3 || !participant.semester || !participant.course)) {
      toast.error("Complete os dados de todos os participantes.");
      return;
    }
    const payload = participants as Array<{
        name: string;
        ra: string;
        semester: (typeof SEMESTER_OPTIONS)[number];
        course: (typeof FATEC_COURSES)[number];
      }>;
    if (selectedReservationId) {
      joinReservation.mutate({ reservationId: selectedReservationId, participants: payload });
    } else {
      createReservation.mutate({ reservationDate: selectedDate, startTime: selectedTime, endTime: selectedEndTime, participants: payload });
    }
  }

  async function copyCode() {
    if (!submittedCode) return;
    if (!navigator.clipboard?.writeText) {
      toast.error("A cópia automática não está disponível. Selecione o código para copiá-lo.");
      return;
    }
    try {
      await navigator.clipboard.writeText(submittedCode);
      toast.success("Comprovante copiado");
    } catch {
      toast.error("Não foi possível copiar. Selecione o código e copie manualmente.");
    }
  }

  const nextReservation = reservations[0];
  const analytics = analyticsQuery.data;

  return (
    <div className="qp-shell">
      <header className="qp-header">
        <div className="qp-brand">
          <div className="qp-mark" aria-hidden="true">
            <span />
            <span />
          </div>
          <div>
            <div className="qp-wordmark">Quadra<span>Pass</span></div>
            <div className="qp-brand-subtitle">Fatec Franca · Dr. Thomaz Novelino</div>
          </div>
        </div>
        <div className="qp-header-meta">
          <div className="qp-live-dot"><span /> quadra aberta</div>
          <div className="qp-header-divider" />
          <a className="qp-header-note qp-header-link" href="/interno">Acesso da faculdade</a>
        </div>
      </header>

      <main className="qp-container">
        <section className="qp-hero">
          <div>
            <div className="qp-kicker"><span className="qp-kicker-line" /> controle de uso da quadra</div>
            <h1>A quadra da Fatec<br /><em>no ritmo certo.</em></h1>
            <p>Escolha o dia, o início e o término do intervalo em blocos de 30 minutos. Ou entre em uma reserva já criada, mesmo sendo de outro curso, turma ou sala.</p>
          </div>
          <div className="qp-hero-stamp">
            <ShieldCheck size={18} />
            <span>Uso organizado<br /><strong>para toda a comunidade</strong></span>
          </div>
        </section>

        <section className="qp-metrics" aria-label="Resumo da agenda">
          <div className="qp-metric-card qp-metric-featured">
            <div className="qp-metric-label"><span className="qp-metric-dot" /> próxima reserva</div>
            <div className="qp-metric-value">{nextReservation ? nextReservation.startTime : "—"}</div>
            <div className="qp-metric-detail">{nextReservation ? `${formatShortDate(nextReservation.reservationDate)} · reserva confirmada` : "Nenhum horário ocupado"}</div>
          </div>
          <div className="qp-metric-card">
            <div className="qp-metric-label"><Users size={14} /> participantes cadastrados</div>
            <div className="qp-metric-value">{analytics?.participants ?? "—"}</div>
            <div className="qp-metric-detail">histórico de reservas ativas</div>
          </div>
          <div className="qp-metric-card">
            <div className="qp-metric-label"><Clock3 size={14} /> faixa mais procurada</div>
            <div className="qp-metric-value">{analytics?.peakTime ?? "—"}</div>
            <div className="qp-metric-detail">baseado no histórico registrado</div>
          </div>
          <div className="qp-metric-card qp-metric-rule">
            <div className="qp-metric-label"><Info size={14} /> regra rápida</div>
            <div className="qp-rule-copy"><strong>Hoje + 2 dias</strong><span>é o limite de antecedência</span></div>
          </div>
        </section>

        <div className="qp-main-grid">
          <section className="qp-schedule-card">
            <div className="qp-section-heading">
              <div>
                <div className="qp-kicker">placar de ocupação</div>
                <h2>Agenda da quadra</h2>
              </div>
              <div className="qp-heading-status"><span className="qp-status-dot available" /> livre <span className="qp-status-dot busy" /> reservado</div>
            </div>

            <div className="qp-date-strip" aria-label="Dias disponíveis para reserva">
              {availableDates.map((date, index) => (
                <button
                  type="button"
                  key={date}
                  className={`qp-date-button ${selectedDate === date ? "active" : ""}`}
                  onClick={() => { setSelectedDate(date); setSelectedTime(""); setSelectedEndTime(""); setSelectedReservationId(null); setSubmittedCode(""); }}
                >
                  <span>{index === 0 ? "Hoje" : index === 1 ? "Amanhã" : "Depois"}</span>
                  <strong>{formatShortDate(date)}</strong>
                </button>
              ))}
            </div>

            <div className="qp-schedule-toolbar">
              <div><CalendarDays size={17} /><strong>{formatLongDate(selectedDate)}</strong></div>
              <span>{selectedReservations.length} de {slots.length} faixas ocupadas</span>
            </div>

            <div className="qp-slots">
              {slots.map(slot => {
                const reservation = reservationAtTime(slot.start);
                const selected = selectedTime === slot.start;
                return (
                  <button
                    type="button"
                    key={slot.start}
                    className={`qp-slot ${reservation ? "busy" : "available"} ${selected ? "selected" : ""}`}
                    onClick={() => selectSlot(selectedDate, slot.start, reservation?.id)}
                  >
                    <span className="qp-slot-time">{slot.start}<small>{slot.end}</small></span>
                    <span className="qp-slot-track"><span /></span>
                    <span className="qp-slot-info">
                      {reservation ? (
                        <><strong>Reserva confirmada</strong><small><Users size={12} /> {reservation.participantCount} participantes</small></>
                      ) : (
                        <><strong>Intervalo disponível</strong><small>Toque para selecionar</small></>
                      )}
                    </span>
                    {reservation ? <span className="qp-slot-badge reserved">entrar <ArrowRight size={13} /></span> : <span className="qp-slot-badge">reservar <ArrowRight size={13} /></span>}
                  </button>
                );
              })}
            </div>
            {agendaQuery.isLoading && <div className="qp-loading"><Loader2 className="spin" size={18} /> Carregando a agenda...</div>}
            {agendaQuery.isError && <div className="qp-error">Não foi possível carregar a agenda agora. Atualize a página para tentar novamente.</div>}
          </section>

          <aside className="qp-reserve-card" id="reserve-panel">
            <div className="qp-reserve-card-top">
              <div className="qp-kicker">{isJoining ? "entrar na reserva" : "nova reserva"}</div>
              <div className="qp-reserve-icon"><Plus size={20} /></div>
            </div>
            <h2>{isJoining ? "Entre no time." : "Monte seu time."}</h2>
            <p className="qp-reserve-intro">{isJoining ? "Essa faixa já está reservada. Adicione seu nome e o de quem vai com você, mesmo sendo de outro curso ou sala." : "Crie a reserva e inclua todos que vão utilizar a quadra."}</p>

            <div className="qp-selected-slot">
              <CalendarDays size={17} />
              <div><span>{isJoining ? "reserva compartilhada" : "intervalo escolhido"}</span><strong>{selectedTime ? `${formatLongDate(selectedDate)} · ${selectedTime}–${selectedEndTime}` : "Escolha um horário na agenda"}</strong></div>
              {selectedTime && <button type="button" aria-label="Limpar horário" onClick={() => { setSelectedTime(""); setSelectedEndTime(""); setSelectedReservationId(null); }}><X size={16} /></button>}
            </div>

            <form onSubmit={handleSubmit} className="qp-form">
              <div className="qp-form-heading"><span>01</span><div><strong>Participantes</strong><small>{isJoining ? "qualquer curso, turma ou sala pode entrar" : "comece pelo responsável pela reserva"}</small></div></div>
              {selectedTime && !isJoining && <label className="qp-interval-field">Intervalo da quadra<select value={selectedEndTime} onChange={event => setSelectedEndTime(event.target.value)}>{availableEndTimes(TIME_SLOTS, selectedTime).map(end => <option key={end} value={end}>{selectedTime} às {end}</option>)}</select><small>Escolha o término em blocos de 30 minutos.</small></label>}
              <div className="qp-participants">
                {participants.map((participant, index) => (
                  <div className="qp-participant" key={index}>
                    <div className="qp-participant-head"><span className="qp-avatar">{participant.name ? initials(participant.name) : String(index + 1).padStart(2, "0")}</span><div><strong>{index === 0 ? "Responsável" : `Participante ${index + 1}`}</strong><small>{index === 0 ? "primeiro nome da lista" : "aluno que vai utilizar a quadra"}</small></div>{index > 0 && <button type="button" className="qp-remove" onClick={() => setParticipants(current => current.filter((_, i) => i !== index))} aria-label="Remover participante"><Minus size={14} /></button>}</div>
                    <label>Nome completo<input value={participant.name} onChange={event => updateParticipant(index, "name", event.target.value)} placeholder="Ex.: Ana Souza" /></label>
                    <div className="qp-two-fields"><label>RA<input value={participant.ra} onChange={event => updateParticipant(index, "ra", event.target.value)} placeholder="Ex.: 20241234" /></label><label>Semestre / ano<select value={participant.semester} onChange={event => updateParticipant(index, "semester", event.target.value)}><option value="">Selecione</option>{SEMESTER_OPTIONS.map(option => <option key={option} value={option}>{option}</option>)}</select></label></div>
                    <label>Curso<select value={participant.course} onChange={event => updateParticipant(index, "course", event.target.value)}><option value="">Selecione o curso</option>{FATEC_COURSES.map(course => <option key={course} value={course}>{course}</option>)}</select></label>
                  </div>
                ))}
              </div>
              <button type="button" className="qp-add-person" disabled={participants.length >= remainingParticipantCapacity} onClick={() => setParticipants(current => [...current, emptyParticipant()])}><Plus size={15} /> adicionar outro aluno</button>
              <div className="qp-form-note"><Info size={14} /><span>{isJoining && joiningReservation ? `Esta reserva tem ${joiningReservation.participantCount} participante(s); restam ${remainingParticipantCapacity} vaga(s), até o limite de 20.` : "Você pode cadastrar até 20 participantes na mesma reserva."}</span></div>
              {isJoining && remainingParticipantCapacity === 0 && <div className="qp-error" role="status">Esta reserva já atingiu o limite de 20 participantes.</div>}
              <Button type="submit" className="qp-submit" disabled={createReservation.isPending || joinReservation.isPending || !selectedTime || remainingParticipantCapacity === 0}>{createReservation.isPending || joinReservation.isPending ? <><Loader2 className="spin" size={17} /> Salvando...</> : <>{isJoining ? "Entrar nesta reserva" : "Confirmar reserva"} <ArrowRight size={17} /></>}</Button>
            </form>

            {submittedCode && <div className="qp-success"><div className="qp-success-icon"><Check size={18} /></div><div><strong>Comprovante digital</strong><span>Guarde este QR Code no celular</span><div className="qp-qr-wrap"><QRCodeSVG value={`quadrapass:${submittedCode}`} size={92} bgColor="#eaf6f0" fgColor="#101b2d" level="M" /><div><button type="button" onClick={copyCode}>{submittedCode} <Copy size={13} /></button><small>Use como comprovante da reserva.</small></div></div></div></div>}
          </aside>
        </div>

        <footer className="qp-footer"><span>QuadraPass / Fatec Franca</span><span>Agendamento permitido até {formatShortDate(maxDate)} · QR Code como comprovante digital</span></footer>
      </main>
    </div>
  );
}
