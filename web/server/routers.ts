import { COOKIE_NAME, COURT_CLOSE_TIME, COURT_OPEN_TIME, FATEC_COURSES, SEMESTER_OPTIONS, TIME_SLOTS } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { isValidCalendarDate, isValidCalendarMonth } from "../shared/reservation-rules";
import {
  addDays,
  addParticipantsToReservation,
  createReservation,
  getAdminDayReservations,
  getMonthlyReport,
  getRecentAnalytics,
  getTodayInBrazil,
  listAgenda,
} from "./db";

const courseSchema = z.enum(FATEC_COURSES);
const semesterSchema = z.enum(SEMESTER_OPTIONS);
const slotSchema = z.enum(TIME_SLOTS.map(slot => slot.start) as [string, ...string[]]);
const dateSchema = z.string().refine(isValidCalendarDate, "Informe uma data válida no formato AAAA-MM-DD.");
const monthSchema = z.string().refine(isValidCalendarMonth, "Informe um mês válido no formato AAAA-MM.");
const timeSchema = z.string().regex(/^\d{2}:\d{2}$/);
const participantSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(120, "O nome deve ter no máximo 120 caracteres."),
  ra: z.string().trim().min(3, "Informe o RA.").max(24, "O RA deve ter no máximo 24 caracteres."),
  semester: semesterSchema,
  course: courseSchema,
});

const reservationParticipantsSchema = z
  .array(participantSchema)
  .min(1, "Adicione pelo menos um participante.")
  .max(20, "Cada reserva aceita no máximo 20 participantes.");

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  agenda: router({
    window: publicProcedure.query(async () => {
      const today = getTodayInBrazil();
      return {
        today,
        maxDate: addDays(today, 2),
        slots: TIME_SLOTS,
        reservations: await listAgenda(today, addDays(today, 2)),
      };
    }),
    analytics: publicProcedure.query(() => getRecentAnalytics()),
    join: publicProcedure
      .input(z.object({ reservationId: z.number().int().positive(), participants: reservationParticipantsSchema }))
      .mutation(async ({ input }) => {
        try {
          return await addParticipantsToReservation(input.reservationId, input.participants);
        } catch (error) {
          if (error instanceof Error && error.message === "RESERVATION_NOT_FOUND") {
            throw new TRPCError({ code: "NOT_FOUND", message: "Esta reserva não está mais disponível." });
          }
          if (error instanceof Error && error.message === "RESERVATION_FULL") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Esta reserva já atingiu o limite de 20 participantes." });
          }
          if (error instanceof Error && error.message === "RESERVATION_NOT_AVAILABLE") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Só é possível entrar em reservas de hoje ou dos próximos 2 dias." });
          }
          throw error;
        }
      }),
    create: publicProcedure
      .input(
        z.object({
          reservationDate: dateSchema,
          startTime: slotSchema,
          endTime: timeSchema,
          participants: reservationParticipantsSchema,
        }),
      )
      .mutation(async ({ input }) => {
        const today = getTodayInBrazil();
        const maxDate = addDays(today, 2);
        if (input.reservationDate < today || input.reservationDate > maxDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "A quadra só pode ser reservada para hoje ou até 2 dias à frente.",
          });
        }
        const startsOnGrid = TIME_SLOTS.some(slot => slot.start === input.startTime);
        const endsOnGrid = TIME_SLOTS.some(slot => slot.end === input.endTime) || input.endTime === COURT_CLOSE_TIME;
        if (!startsOnGrid || !endsOnGrid || input.startTime >= input.endTime || input.startTime < COURT_OPEN_TIME || input.endTime > COURT_CLOSE_TIME) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Escolha um intervalo entre 07:00 e 22:00, em blocos de 30 minutos." });
        }
        try {
          return await createReservation(input);
        } catch (error) {
          if (error instanceof Error && error.message === "SLOT_ALREADY_BOOKED") {
            throw new TRPCError({
              code: "CONFLICT",
              message: "Este horário acabou de ser reservado. Entre na reserva existente para adicionar seu nome.",
            });
          }
          throw error;
        }
      }),
  }),
  internal: router({
    day: adminProcedure
      .input(z.object({ date: dateSchema }))
      .query(({ input }) => getAdminDayReservations(input.date)),
    monthly: adminProcedure
      .input(z.object({ month: monthSchema }))
      .query(({ input }) => getMonthlyReport(input.month)),
  }),
});

export type AppRouter = typeof appRouter;
