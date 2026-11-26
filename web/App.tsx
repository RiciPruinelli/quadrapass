import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import QRCode from "react-native-qrcode-svg";
import { availableEndTimes } from "./reservation-time";

type Slot = { start: string; end: string };
type Reservation = {
  id: number;
  reservationDate: string;
  startTime: string;
  endTime: string;
  participantCount: number;
};
type Agenda = { today: string; maxDate: string; slots: Slot[]; reservations: Reservation[] };
type Participant = { name: string; ra: string; semester: string; course: string };
type ApiError = Error & { code?: string };
type PickerField = "semester" | "course";
type ActivePicker = { participantIndex: number; field: PickerField } | { field: "endTime" } | null;

const COURSES = [
  "Análise e Desenvolvimento de Sistemas",
  "Desenvolvimento de Software Multiplataforma",
  "Gestão da Produção Industrial",
  "Gestão de Recursos Humanos",
  "Ensino Médio",
];
const SEMESTERS = [
  "1º semestre", "2º semestre", "3º semestre", "4º semestre", "5º semestre", "6º semestre",
  "1º ano — Ensino Médio", "2º ano — Ensino Médio", "3º ano — Ensino Médio",
];
const EMPTY_PARTICIPANT: Participant = { name: "", ra: "", semester: "", course: "" };
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");

function formatDate(dateString: string, options: Intl.DateTimeFormatOptions = { weekday: "short", day: "2-digit", month: "2-digit" }) {
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...options }).format(new Date(`${dateString}T12:00:00Z`)).replace(".", "");
}
function addDays(dateString: string, amount: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}
function trpcPayload(input: unknown) {
  return JSON.stringify({ 0: { json: input } });
}
async function apiRequest<T>(path: string, input: unknown, method: "GET" | "POST" = "GET") {
  const query = method === "GET" ? `?batch=1&input=${encodeURIComponent(trpcPayload(input))}` : "?batch=1";
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/trpc/${path}${query}`, {
      method,
      headers: method === "POST" ? { "Content-Type": "application/json" } : undefined,
      body: method === "POST" ? trpcPayload(input) : undefined,
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${API_BASE_URL}. Verifique se o servidor web está ligado e se EXPO_PUBLIC_API_BASE_URL aponta para o computador.`);
  }
  type TrpcResponse = {
    error?: { json?: { message?: string; data?: { code?: string } } };
    result?: { data?: { json?: unknown } };
  };
  let result: TrpcResponse | undefined;
  try {
    const body = await response.json() as TrpcResponse[];
    result = Array.isArray(body) ? body[0] : undefined;
  } catch {
    throw new Error(response.ok
      ? "A API retornou uma resposta inválida. Tente novamente."
      : `A API respondeu com erro HTTP ${response.status}.`);
  }
  if (!response.ok || result?.error) {
    const message = result?.error?.json?.message || "Não foi possível concluir a operação.";
    throw Object.assign(new Error(message), { code: result?.error?.json?.data?.code }) as ApiError;
  }
  const data = result?.result?.data?.json;
  if (data === undefined) throw new Error("A API retornou uma resposta inesperada.");
  return data as T;
}

export default function App() {
  const [agenda, setAgenda] = useState<Agenda | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedStart, setSelectedStart] = useState("");
  const [selectedEnd, setSelectedEnd] = useState("");
  const [joiningReservationId, setJoiningReservationId] = useState<number | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([{ ...EMPTY_PARTICIPANT }]);
  const [submittedCode, setSubmittedCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [agendaError, setAgendaError] = useState("");
  const [activePicker, setActivePicker] = useState<ActivePicker>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAgenda() {
    setLoading(true);
    setAgendaError("");
    try {
      setError("");
      const result = await apiRequest<Agenda>("agenda.window", null);
      setAgenda(result);
      setSelectedDate(current => current || result.today);
    } catch (requestError) {
      setAgendaError((requestError as Error).message || "Não foi possível carregar a agenda.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadAgenda(); }, []);

  const dates = useMemo(() => agenda ? [0, 1, 2].map(offset => addDays(agenda.today, offset)) : [], [agenda]);
  const selectedReservations = useMemo(
    () => agenda?.reservations.filter(reservation => reservation.reservationDate === selectedDate) || [],
    [agenda, selectedDate],
  );
  const joiningReservation = agenda?.reservations.find(reservation => reservation.id === joiningReservationId);
  const remainingParticipantCapacity = joiningReservationId
    ? Math.max(0, 20 - (joiningReservation?.participantCount ?? 0))
    : 20;
  const endOptions = useMemo(
    () => availableEndTimes(agenda?.slots ?? [], selectedStart),
    [agenda, selectedStart],
  );
  const pickerOptions = activePicker?.field === "semester" ? SEMESTERS : activePicker?.field === "course" ? COURSES : endOptions;

  function reservationAtTime(time: string) {
    return selectedReservations.find(reservation => reservation.startTime <= time && reservation.endTime > time);
  }
  const displaySlots = agenda?.slots ?? [];
  const reservedSlotCount = displaySlots.filter(slot => Boolean(reservationAtTime(slot.start))).length;
  const availableSlotCount = displaySlots.length - reservedSlotCount;
  function selectSlot(slot: Slot) {
    const reservation = reservationAtTime(slot.start);
    setSelectedStart(slot.start);
    setSelectedEnd(reservation?.endTime || slot.end);
    setJoiningReservationId(reservation?.id || null);
    setSubmittedCode("");
    setMessage("");
    setError("");
  }
  function updateParticipant(index: number, field: keyof Participant, value: string) {
    setParticipants(current => current.map((person, personIndex) => personIndex === index ? { ...person, [field]: value } : person));
  }
  function resetSelection() {
    setSelectedStart("");
    setSelectedEnd("");
    setJoiningReservationId(null);
    setParticipants([{ ...EMPTY_PARTICIPANT }]);
  }
  async function submit() {
    if (!selectedStart || !selectedEnd || selectedStart >= selectedEnd) {
      setError("Escolha o início e o término do intervalo.");
      return;
    }
    if (participants.some(person => !person.name.trim() || !person.ra.trim() || !person.course || !person.semester)) {
      setError("Complete nome, RA, semestre e curso de todos os participantes.");
      return;
    }
    try {
      setSaving(true);
      setError("");
      const result = joiningReservationId
        ? await apiRequest<{ confirmationCode: string }>("agenda.join", { reservationId: joiningReservationId, participants }, "POST")
        : await apiRequest<{ confirmationCode: string }>("agenda.create", { reservationDate: selectedDate, startTime: selectedStart, endTime: selectedEnd, participants }, "POST");
      setSubmittedCode(result.confirmationCode);
      setMessage(joiningReservationId ? "Você entrou na reserva." : "Reserva criada com sucesso.");
      resetSelection();
      await loadAgenda();
    } catch (requestError) {
      setError((requestError as Error).message || "Não foi possível salvar a reserva.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View><Text style={styles.eyebrow}>FATEC FRANCA</Text><Text style={styles.brand}>Quadra<Text style={styles.brandAccent}>Pass</Text></Text></View>
          <Text style={styles.headerHint}>AGENDA DA QUADRA</Text>
        </View>

        <View style={styles.hero}>
          <Text style={styles.eyebrowDark}>CONTROLE DE USO</Text>
          <Text style={styles.title}>A quadra no{`\n`}ritmo certo.</Text>
          <Text style={styles.description}>Escolha o dia, o início e o término em blocos de 30 minutos. Qualquer aluno pode participar da mesma reserva.</Text>
        </View>

        <Text style={styles.sectionLabel}>Escolha o dia</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateList}>
          {dates.map((date, index) => <Pressable key={date} style={[styles.dateCard, selectedDate === date && styles.dateCardActive]} onPress={() => { setSelectedDate(date); resetSelection(); }}><Text style={[styles.dateLabel, selectedDate === date && styles.textLight]}>{index === 0 ? "HOJE" : index === 1 ? "AMANHÃ" : "DEPOIS"}</Text><Text style={[styles.dateValue, selectedDate === date && styles.textLight]}>{formatDate(date)}</Text></Pressable>)}
        </ScrollView>

        <View style={styles.scheduleHeader}><View style={styles.scheduleHeaderText}><Text style={styles.sectionLabel}>Agenda de {selectedDate ? formatDate(selectedDate, { weekday: "long", day: "2-digit", month: "long" }) : ""}</Text><Text style={styles.muted}>Toque em um horário livre para reservar ou reservado para entrar.</Text></View><Pressable style={styles.refreshButton} accessibilityRole="button" accessibilityLabel="Atualizar agenda" onPress={() => void loadAgenda()}><Text style={styles.refresh}>ATUALIZAR</Text></Pressable></View>
        {loading ? (
          <View style={styles.agendaState}><ActivityIndicator color="#e56b3f" /><Text style={styles.muted}>Carregando os horários...</Text></View>
        ) : agendaError ? (
          <View style={styles.agendaError} accessibilityLiveRegion="polite">
            <Text style={styles.error}>{agendaError}</Text>
            <Pressable style={styles.retryButton} onPress={() => void loadAgenda()}><Text style={styles.retryText}>TENTAR NOVAMENTE</Text></Pressable>
          </View>
        ) : (
          <>
            <View style={styles.slotSummary}>
              <Text style={styles.summaryCaption}>BLOCOS DE 30 MIN</Text>
              <View style={styles.summaryBadges}>
                <View style={[styles.summaryBadge, styles.summaryBadgeFree]}>
                  <View style={[styles.summaryDot, styles.summaryDotFree]} />
                  <Text style={styles.summaryBadgeText}>{availableSlotCount} livres</Text>
                </View>
                <View style={[styles.summaryBadge, styles.summaryBadgeReserved]}>
                  <View style={[styles.summaryDot, styles.summaryDotReserved]} />
                  <Text style={styles.summaryBadgeText}>{reservedSlotCount} reservados</Text>
                </View>
              </View>
            </View>
            <View style={styles.slotGrid}>
              {displaySlots.map(slot => {
                const reservation = reservationAtTime(slot.start);
                const selected = selectedStart === slot.start;
                return (
                  <Pressable
                    key={slot.start}
                    style={[styles.slotTile, reservation ? styles.slotTileReserved : styles.slotTileFree, selected && styles.slotTileSelected]}
                    accessibilityRole="button"
                    accessibilityLabel={reservation
                      ? `${slot.start}, reservado com ${reservation.participantCount} participante(s). Toque para entrar na reserva.`
                      : `${slot.start}, horário livre. Toque para reservar.`}
                    accessibilityState={{ selected }}
                    onPress={() => selectSlot(slot)}
                  >
                    <Text style={[styles.slotTileTime, selected && styles.slotTileSelectedText]}>{slot.start}</Text>
                    <View style={styles.slotTileStatusRow}>
                      <View style={[styles.slotTileDot, reservation ? styles.slotTileDotReserved : styles.slotTileDotFree, selected && styles.slotTileDotSelected]} />
                      <Text style={[styles.slotTileStatus, reservation ? styles.slotTileStatusReserved : styles.slotTileStatusFree, selected && styles.slotTileSelectedText]}>
                        {reservation ? "RESERVADO" : "LIVRE"}
                      </Text>
                    </View>
                    {reservation ? <Text style={[styles.slotTileCount, selected && styles.slotTileSelectedText]}>{reservation.participantCount} {reservation.participantCount === 1 ? "aluno" : "alunos"}</Text> : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        <View style={styles.formCard}>
          <Text style={styles.eyebrowDark}>{joiningReservationId ? "ENTRAR NA RESERVA" : "NOVA RESERVA"}</Text>
          <Text style={styles.formTitle}>{joiningReservationId ? "Entre no time." : "Monte seu time."}</Text>
          <Text style={styles.muted}>{selectedStart ? `${formatDate(selectedDate, { day: "2-digit", month: "long" })} · ${selectedStart} às ${selectedEnd}` : "Selecione um horário acima."}</Text>
          {selectedStart.length > 0 && !joiningReservationId && (
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>TÉRMINO DO INTERVALO</Text>
              <Pressable style={styles.selectField} accessibilityRole="button" accessibilityLabel="Selecionar horário de término" onPress={() => setActivePicker({ field: "endTime" })}>
                <Text style={selectedEnd ? styles.selectValue : styles.selectPlaceholder}>{selectedEnd ? `${selectedStart} até ${selectedEnd}` : "Selecione o horário de término"}</Text>
                <Text style={styles.selectChevron}>⌄</Text>
              </Pressable>
              <Text style={styles.help}>Blocos de 30 minutos · funcionamento das 07:00 às 22:00.</Text>
            </View>
          )}

          {participants.map((person, index) => (
            <View key={index} style={styles.personCard}>
              <View style={styles.personHeader}>
                <Text style={styles.personNumber}>{String(index + 1).padStart(2, "0")}</Text>
                <Text style={styles.personTitle}>{index === 0 ? "Responsável" : `Participante ${index + 1}`}</Text>
                {index > 0 && <Pressable onPress={() => setParticipants(current => current.filter((_, personIndex) => personIndex !== index))}><Text style={styles.remove}>REMOVER</Text></Pressable>}
              </View>
              <TextInput style={styles.input} placeholder="Nome completo" placeholderTextColor="#9a978e" value={person.name} onChangeText={value => updateParticipant(index, "name", value)} />
              <TextInput style={styles.input} placeholder="RA" placeholderTextColor="#9a978e" value={person.ra} onChangeText={value => updateParticipant(index, "ra", value)} keyboardType="number-pad" />
              <View style={styles.selectGroup}>
                <Text style={styles.fieldLabel}>SEMESTRE / ANO</Text>
                <Pressable style={styles.selectField} accessibilityRole="button" accessibilityLabel="Selecionar semestre ou ano" onPress={() => setActivePicker({ participantIndex: index, field: "semester" })}>
                  <Text numberOfLines={1} style={person.semester ? styles.selectValue : styles.selectPlaceholder}>{person.semester || "Selecione o semestre / ano"}</Text>
                  <Text style={styles.selectChevron}>⌄</Text>
                </Pressable>
              </View>
              <View style={styles.selectGroup}>
                <Text style={styles.fieldLabel}>CURSO</Text>
                <Pressable style={styles.selectField} accessibilityRole="button" accessibilityLabel="Selecionar curso" onPress={() => setActivePicker({ participantIndex: index, field: "course" })}>
                  <Text numberOfLines={1} style={person.course ? styles.selectValue : styles.selectPlaceholder}>{person.course || "Selecione o curso"}</Text>
                  <Text style={styles.selectChevron}>⌄</Text>
                </Pressable>
              </View>
            </View>
          ))}

          <Pressable style={[styles.addButton, participants.length >= remainingParticipantCapacity && styles.disabled]} disabled={participants.length >= remainingParticipantCapacity} onPress={() => setParticipants(current => [...current, { ...EMPTY_PARTICIPANT }])}><Text style={styles.addButtonText}>＋ ADICIONAR OUTRO ALUNO ({participants.length}/{remainingParticipantCapacity})</Text></Pressable>
          {joiningReservationId && remainingParticipantCapacity === 0 ? <Text style={styles.error}>Esta reserva já atingiu o limite de 20 participantes.</Text> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
          <Pressable style={[styles.submitButton, (!selectedStart || saving || remainingParticipantCapacity === 0) && styles.submitDisabled]} disabled={!selectedStart || saving || remainingParticipantCapacity === 0} onPress={() => void submit()}>{saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>{joiningReservationId ? "ENTRAR NESTA RESERVA" : "CONFIRMAR RESERVA"}</Text>}</Pressable>
        </View>

        <Modal visible={activePicker !== null} transparent animationType="slide" onRequestClose={() => setActivePicker(null)}>
          <View style={styles.modalOverlay}>
            <Pressable style={StyleSheet.absoluteFill} accessibilityRole="button" accessibilityLabel="Fechar seletor" onPress={() => setActivePicker(null)} />
            <View style={styles.modalSheet}>
              <View style={styles.modalHeader}>
                <View style={styles.modalHeading}>
                  <Text style={styles.modalTitle}>{activePicker?.field === "semester" ? "Semestre / ano" : activePicker?.field === "course" ? "Curso" : "Término do intervalo"}</Text>
                  <Text style={styles.modalSubtitle}>Escolha uma opção da lista</Text>
                </View>
                <Pressable style={styles.modalClose} accessibilityRole="button" accessibilityLabel="Fechar" onPress={() => setActivePicker(null)}><Text style={styles.modalCloseText}>FECHAR</Text></Pressable>
              </View>
              <ScrollView style={styles.modalOptions} keyboardShouldPersistTaps="handled">
                {pickerOptions.map(option => {
                  const selected = activePicker?.field === "endTime"
                    ? selectedEnd === option
                    : activePicker ? participants[activePicker.participantIndex]?.[activePicker.field] === option : false;
                  return <Pressable key={option} style={[styles.modalOption, selected && styles.modalOptionSelected]} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => {
                    if (activePicker?.field === "endTime") setSelectedEnd(option);
                    else if (activePicker) updateParticipant(activePicker.participantIndex, activePicker.field, option);
                    setActivePicker(null);
                  }}>
                    <Text style={[styles.modalOptionText, selected && styles.modalOptionSelectedText]}>{option}</Text>
                    {selected ? <Text style={styles.modalCheck}>✓</Text> : null}
                  </Pressable>;
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {submittedCode ? <View style={styles.proof}><Text style={styles.eyebrowDark}>COMPROVANTE DIGITAL</Text><Text style={styles.proofTitle}>Guarde este QR Code</Text><QRCode value={`quadrapass:${submittedCode}`} size={148} backgroundColor="#eaf6f0" color="#101b2d" /><Text style={styles.code}>{submittedCode}</Text><Text style={styles.muted}>Apresente o comprovante quando precisar acessar a quadra.</Text></View> : null}
        <Text style={styles.footer}>Agendamento permitido até {agenda?.maxDate || ""} · qualquer curso, turma ou sala pode participar.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, width: "100%", backgroundColor: "#101b2d" },
  container: { width: "100%", maxWidth: 560, alignSelf: "center", paddingBottom: 44, backgroundColor: "#f5f1e8" },
  header: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#101b2d" },
  eyebrow: { color: "#f6a47e", fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  eyebrowDark: { color: "#e56b3f", fontSize: 10, letterSpacing: 2, fontWeight: "800" },
  brand: { color: "#fffaf0", fontSize: 27, fontWeight: "800", letterSpacing: -1.5 },
  brandAccent: { color: "#e56b3f" },
  headerHint: { color: "#aeb6c4", fontSize: 9, letterSpacing: 1.5, fontWeight: "700" },
  hero: { paddingHorizontal: 22, paddingTop: 34, paddingBottom: 28, backgroundColor: "#f5f1e8" },
  title: { color: "#101b2d", fontSize: 43, lineHeight: 43, fontWeight: "800", letterSpacing: -2.5, marginTop: 10 },
  description: { color: "#6d716f", fontSize: 14, lineHeight: 21, marginTop: 15 },
  sectionLabel: { color: "#101b2d", fontSize: 12, fontWeight: "800", letterSpacing: .5, marginBottom: 9 },
  dateList: { paddingHorizontal: 22, gap: 9, paddingBottom: 25 },
  dateCard: { width: 105, padding: 13, borderWidth: 1, borderColor: "#dad5c9", backgroundColor: "#fffaf0" },
  dateCardActive: { backgroundColor: "#101b2d", borderColor: "#101b2d" },
  dateLabel: { color: "#8a877f", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  dateValue: { color: "#101b2d", fontSize: 14, fontWeight: "700", marginTop: 8 },
  textLight: { color: "#fffaf0" },
  scheduleHeader: { paddingHorizontal: 22, marginBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  scheduleHeaderText: { flex: 1 },
  muted: { color: "#777870", fontSize: 11, lineHeight: 17, marginTop: 4 },
  refreshButton: { minHeight: 40, paddingHorizontal: 8, justifyContent: "center" },
  refresh: { color: "#e56b3f", fontSize: 9, fontWeight: "800", letterSpacing: .8 },
  loader: { marginVertical: 30 },
  agendaState: { paddingHorizontal: 22, paddingVertical: 28, alignItems: "center", gap: 10 },
  agendaError: { marginHorizontal: 22, padding: 14, borderWidth: 1, borderColor: "#e5b8aa", backgroundColor: "#fff8f3", gap: 10 },
  retryButton: { minHeight: 42, borderWidth: 1, borderColor: "#e56b3f", alignItems: "center", justifyContent: "center", paddingHorizontal: 14 },
  retryText: { color: "#e56b3f", fontSize: 10, fontWeight: "800", letterSpacing: .7 },
  slotSummary: { paddingHorizontal: 22, marginBottom: 10, flexDirection: "row", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 8 },
  summaryCaption: { color: "#777870", fontSize: 9, fontWeight: "800", letterSpacing: .8 },
  summaryBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  summaryBadge: { minHeight: 28, flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 9, borderRadius: 20 },
  summaryBadgeFree: { backgroundColor: "#eaf6f0" },
  summaryBadgeReserved: { backgroundColor: "#fff1e9" },
  summaryDot: { width: 7, height: 7, borderRadius: 4 },
  summaryDotFree: { backgroundColor: "#347355" },
  summaryDotReserved: { backgroundColor: "#e56b3f" },
  summaryBadgeText: { color: "#303b4b", fontSize: 9, fontWeight: "700" },
  slotGrid: { paddingHorizontal: 22, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 8 },
  slotTile: { flexBasis: "30%", flexGrow: 1, minWidth: 84, minHeight: 66, alignItems: "center", justifyContent: "center", gap: 3, paddingHorizontal: 5, paddingVertical: 8, borderWidth: 1, borderRadius: 12 },
  slotTileFree: { backgroundColor: "#fffaf0", borderColor: "#d8e4dc" },
  slotTileReserved: { backgroundColor: "#fff5ef", borderColor: "#efc5b2" },
  slotTileSelected: { backgroundColor: "#101b2d", borderColor: "#e56b3f", borderWidth: 2 },
  slotTileTime: { color: "#101b2d", fontSize: 15, fontWeight: "800" },
  slotTileStatusRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  slotTileDot: { width: 6, height: 6, borderRadius: 3 },
  slotTileDotFree: { backgroundColor: "#347355" },
  slotTileDotReserved: { backgroundColor: "#e56b3f" },
  slotTileDotSelected: { backgroundColor: "#fffaf0" },
  slotTileStatus: { fontSize: 8, fontWeight: "800", letterSpacing: .35 },
  slotTileStatusFree: { color: "#347355" },
  slotTileStatusReserved: { color: "#bd542d" },
  slotTileCount: { color: "#777870", fontSize: 8, lineHeight: 10 },
  slotTileSelectedText: { color: "#fffaf0" },
  formCard: { margin: 22, marginTop: 30, padding: 18, backgroundColor: "#fffaf0", borderWidth: 1, borderColor: "#ddd8cc" },
  formTitle: { color: "#101b2d", fontSize: 29, fontWeight: "800", letterSpacing: -1.3, marginTop: 8 },
  field: { marginTop: 20, paddingTop: 14, borderTopWidth: 1, borderTopColor: "#e5e0d6" },
  fieldLabel: { color: "#777870", fontSize: 9, fontWeight: "800", letterSpacing: 1, marginTop: 13, marginBottom: 8 },
  chipList: { gap: 7, paddingBottom: 4 },
  chip: { paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, borderColor: "#d8d3c8", backgroundColor: "#fbf8f1" },
  chipActive: { backgroundColor: "#e56b3f", borderColor: "#e56b3f" },
  chipText: { color: "#4d514f", fontSize: 10, fontWeight: "600" },
  help: { color: "#8b8981", fontSize: 10, marginTop: 6 },
  selectGroup: { marginTop: 8 },
  selectField: { minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12, borderWidth: 1, borderColor: "#d8d3c8", backgroundColor: "#fbf8f1", paddingHorizontal: 12 },
  selectValue: { flex: 1, color: "#101b2d", fontSize: 12, fontWeight: "600" },
  selectPlaceholder: { flex: 1, color: "#8b8981", fontSize: 12 },
  selectChevron: { color: "#e56b3f", fontSize: 22, fontWeight: "700", marginTop: -7 },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(16,27,45,0.55)" },
  modalSheet: { maxHeight: "78%", minHeight: 250, backgroundColor: "#fffaf0", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  modalHeading: { flex: 1 },
  modalTitle: { color: "#101b2d", fontSize: 20, fontWeight: "800" },
  modalSubtitle: { color: "#777870", fontSize: 11, marginTop: 4 },
  modalClose: { minHeight: 42, justifyContent: "center", paddingHorizontal: 10 },
  modalCloseText: { color: "#e56b3f", fontSize: 10, fontWeight: "800", letterSpacing: .6 },
  modalOptions: { flexGrow: 0 },
  modalOption: { minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomWidth: 1, borderBottomColor: "#e5e0d6", paddingHorizontal: 10 },
  modalOptionSelected: { backgroundColor: "#fff1e9" },
  modalOptionText: { flex: 1, color: "#303b4b", fontSize: 13 },
  modalOptionSelectedText: { color: "#bd542d", fontWeight: "700" },
  modalCheck: { color: "#347355", fontSize: 16, fontWeight: "800", marginLeft: 10 },
  personCard: { marginTop: 17, paddingTop: 15, borderTopWidth: 1, borderTopColor: "#e5e0d6" },
  personHeader: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  personNumber: { color: "#e56b3f", fontSize: 11, fontWeight: "800", marginRight: 8 },
  personTitle: { color: "#101b2d", fontSize: 13, fontWeight: "800", flex: 1 },
  remove: { color: "#a35b48", fontSize: 9, fontWeight: "800" },
  input: { height: 45, borderWidth: 1, borderColor: "#d8d3c8", backgroundColor: "#fbf8f1", paddingHorizontal: 12, color: "#101b2d", fontSize: 13, marginBottom: 8 },
  addButton: { borderWidth: 1, borderColor: "#e56b3f", paddingVertical: 13, alignItems: "center", marginTop: 18 },
  disabled: { opacity: .45 },
  addButtonText: { color: "#e56b3f", fontSize: 10, fontWeight: "800", letterSpacing: .7 },
  submitButton: { minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: "#e56b3f", marginTop: 12 },
  submitDisabled: { opacity: .45 },
  submitText: { color: "#fffaf0", fontSize: 11, fontWeight: "800", letterSpacing: .8 },
  error: { color: "#a33e32", fontSize: 11, lineHeight: 16, marginTop: 14 },
  success: { color: "#347355", fontSize: 11, lineHeight: 16, marginTop: 14 },
  proof: { marginHorizontal: 22, padding: 24, alignItems: "center", backgroundColor: "#eaf6f0", borderWidth: 1, borderColor: "#b8d8c5" },
  proofTitle: { color: "#101b2d", fontSize: 24, fontWeight: "800", marginTop: 8, marginBottom: 17 },
  code: { color: "#101b2d", fontSize: 17, fontWeight: "800", letterSpacing: 2, marginTop: 14 },
  footer: { color: "#85847d", fontSize: 10, lineHeight: 16, textAlign: "center", paddingHorizontal: 30, paddingTop: 30 },
});
