import { int, index, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const reservations = mysqlTable(
  "reservations",
  {
    id: int("id").autoincrement().primaryKey(),
    reservationDate: varchar("reservationDate", { length: 10 }).notNull(),
    startTime: varchar("startTime", { length: 5 }).notNull(),
    endTime: varchar("endTime", { length: 5 }).notNull(),
    responsibleName: varchar("responsibleName", { length: 120 }).notNull(),
    responsibleRa: varchar("responsibleRa", { length: 24 }).notNull(),
    status: mysqlEnum("status", ["active", "cancelled"]).default("active").notNull(),
    confirmationCode: varchar("confirmationCode", { length: 16 }).notNull().unique(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    dateIndex: index("reservations_date_idx").on(table.reservationDate),
    slotUnique: uniqueIndex("reservations_slot_unique").on(
      table.reservationDate,
      table.startTime,
      table.status,
    ),
  }),
);

export const reservationParticipants = mysqlTable(
  "reservation_participants",
  {
    id: int("id").autoincrement().primaryKey(),
    reservationId: int("reservationId")
      .notNull()
      .references(() => reservations.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    ra: varchar("ra", { length: 24 }).notNull(),
    semester: varchar("semester", { length: 40 }).notNull(),
    course: varchar("course", { length: 100 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    reservationIndex: index("participants_reservation_idx").on(table.reservationId),
  }),
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Reservation = typeof reservations.$inferSelect;
export type ReservationParticipant = typeof reservationParticipants.$inferSelect;
