import { and, asc, desc, eq, gte, inArray, lt, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { hasTimeOverlap } from "../shared/reservation-rules";
import {
  InsertUser,
  reservationParticipants,
  reservations,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

function normalizeDate(value: string) {
  return value.slice(0, 10);
}

export function getTodayInBrazil() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function addDays(dateString: string, days: number) {
  const date = new Date(`${dateString}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export async function listAgenda(fromDate: string, toDate: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  const reservationRows = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "active"),
        gte(reservations.reservationDate, normalizeDate(fromDate)),
        lte(reservations.reservationDate, normalizeDate(toDate)),
      ),
    )
    .orderBy(asc(reservations.reservationDate), asc(reservations.startTime));

  if (reservationRows.length === 0) return [];

  const participants = await db
    .select()
    .from(reservationParticipants)
    .where(inArray(reservationParticipants.reservationId, reservationRows.map(row => row.id)))
    .orderBy(asc(reservationParticipants.id));

  return reservationRows.map(reservation => ({
    id: reservation.id,
    reservationDate: reservation.reservationDate,
    startTime: reservation.startTime,
    endTime: reservation.endTime,
    participantCount: participants.filter(
      participant => participant.reservationId === reservation.id,
    ).length,
  }));
}

export async function getRecentAnalytics() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(reservations)
    .where(eq(reservations.status, "active"))
    .orderBy(desc(reservations.reservationDate), desc(reservations.startTime));
  if (!rows.length) return { reservations: 0, participants: 0, peakTime: null };

  const people = await db
    .select()
    .from(reservationParticipants)
    .where(inArray(reservationParticipants.reservationId, rows.map(row => row.id)));
  const counts = new Map<string, number>();
  rows.forEach(row => counts.set(row.startTime, (counts.get(row.startTime) ?? 0) + 1));
  const peakTime = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
  return { reservations: rows.length, participants: people.length, peakTime };
}

export type ReservationInput = {
  reservationDate: string;
  startTime: string;
  endTime: string;
  participants: Array<{
    name: string;
    ra: string;
    semester: string;
    course: string;
  }>;
};

export async function createReservation(input: ReservationInput) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const confirmationCode = `QP-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  return db.transaction(async tx => {
    const existing = await tx
      .select({ id: reservations.id, startTime: reservations.startTime, endTime: reservations.endTime })
      .from(reservations)
      .where(
        and(
          eq(reservations.reservationDate, input.reservationDate),
          eq(reservations.status, "active"),
        ),
      )
      .limit(100);

    if (hasTimeOverlap(existing, input.startTime, input.endTime)) {
      const conflict = new Error("SLOT_ALREADY_BOOKED");
      throw conflict;
    }

    const inserted = await tx
      .insert(reservations)
      .values({
        reservationDate: input.reservationDate,
        startTime: input.startTime,
        endTime: input.endTime,
        responsibleName: input.participants[0].name,
        responsibleRa: input.participants[0].ra,
        confirmationCode,
      });
    const reservationId = Number(inserted[0].insertId);

    await tx.insert(reservationParticipants).values(
      input.participants.map(participant => ({
        reservationId,
        ...participant,
      })),
    );

    return { id: reservationId, confirmationCode };
  });
}

export async function addParticipantsToReservation(
  reservationId: number,
  participants: ReservationInput["participants"],
) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");

  return db.transaction(async tx => {
    const reservationRows = await tx
      .select()
      .from(reservations)
      .where(and(eq(reservations.id, reservationId), eq(reservations.status, "active")))
      .limit(1);
    const reservation = reservationRows[0];
    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
    const today = getTodayInBrazil();
    if (reservation.reservationDate < today || reservation.reservationDate > addDays(today, 2)) {
      throw new Error("RESERVATION_NOT_AVAILABLE");
    }

    const existingParticipants = await tx
      .select()
      .from(reservationParticipants)
      .where(eq(reservationParticipants.reservationId, reservationId));
    if (existingParticipants.length + participants.length > 20) {
      throw new Error("RESERVATION_FULL");
    }

    await tx.insert(reservationParticipants).values(
      participants.map(participant => ({ reservationId, ...participant })),
    );
    return {
      id: reservation.id,
      confirmationCode: reservation.confirmationCode,
      participantCount: existingParticipants.length + participants.length,
    };
  });
}

async function participantsForReservations(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, ids: number[]) {
  if (!ids.length) return [];
  return db
    .select()
    .from(reservationParticipants)
    .where(inArray(reservationParticipants.reservationId, ids))
    .orderBy(asc(reservationParticipants.id));
}

export async function getAdminDayReservations(date: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db
    .select()
    .from(reservations)
    .where(and(eq(reservations.reservationDate, date), eq(reservations.status, "active")))
    .orderBy(asc(reservations.startTime));
  const people = await participantsForReservations(db, rows.map(row => row.id));
  return rows.map(row => ({
    ...row,
    participants: people.filter(person => person.reservationId === row.id),
  }));
}

export async function getMonthlyReport(month: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber - 1, 1));
  nextMonth.setUTCMonth(nextMonth.getUTCMonth() + 1);
  const nextMonthString = nextMonth.toISOString().slice(0, 10);
  const rows = await db
    .select()
    .from(reservations)
    .where(
      and(
        eq(reservations.status, "active"),
        gte(reservations.reservationDate, `${month}-01`),
        lt(reservations.reservationDate, nextMonthString),
      ),
    )
    .orderBy(asc(reservations.reservationDate), asc(reservations.startTime));
  const people = await participantsForReservations(db, rows.map(row => row.id));
  const byDay = new Map<string, number>();
  const byTime = new Map<string, number>();
  const byCourse = new Map<string, number>();
  rows.forEach(row => {
    byDay.set(row.reservationDate, (byDay.get(row.reservationDate) ?? 0) + 1);
    byTime.set(row.startTime, (byTime.get(row.startTime) ?? 0) + 1);
  });
  people.forEach(person => byCourse.set(person.course, (byCourse.get(person.course) ?? 0) + 1));
  const top = (entries: Map<string, number>) =>
    [...entries.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));

  return {
    month,
    reservations: rows.length,
    participants: people.length,
    peakTime: top(byTime)[0]?.label ?? null,
    busiestDays: top(byDay),
    busiestTimes: top(byTime),
    courses: top(byCourse),
    reservationsByDay: rows.map(row => ({
      id: row.id,
      reservationDate: row.reservationDate,
      startTime: row.startTime,
      endTime: row.endTime,
      responsibleName: row.responsibleName,
      responsibleRa: row.responsibleRa,
      confirmationCode: row.confirmationCode,
      participants: people.filter(person => person.reservationId === row.id),
    })),
  };
}
