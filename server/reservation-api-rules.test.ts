import { describe, expect, it } from "vitest";
import { FATEC_COURSES, SEMESTER_OPTIONS } from "@shared/const";
import { appRouter } from "./routers";
import { addDays, getTodayInBrazil } from "./db";
import type { TrpcContext } from "./_core/context";

function context(user: TrpcContext["user"] = null): TrpcContext {
  return {
    user,
    req: { protocol: "http", headers: {} } as TrpcContext["req"],
    res: { clearCookie() {} } as TrpcContext["res"],
  };
}

const participant = {
  name: "Ana Souza",
  ra: "20241234",
  semester: SEMESTER_OPTIONS[0],
  course: FATEC_COURSES[0],
};

const validReservation = {
  reservationDate: getTodayInBrazil(),
  startTime: "19:00" as const,
  endTime: "20:00" as const,
  participants: [participant],
};

describe("regras públicas de reserva", () => {
  const caller = appRouter.createCaller(context());

  it("rejeita datas além de dois dias antes de acessar o banco", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, reservationDate: addDays(getTodayInBrazil(), 3) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita uma data impossível no calendário", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, reservationDate: "2026-02-31" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita início fora da grade de 30 minutos", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, startTime: "19:15" } as never),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita términos anteriores ao início", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, startTime: "19:00", endTime: "18:30" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita términos depois das 22:00", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, startTime: "21:30", endTime: "22:30" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejeita 21 participantes no mesmo pedido", async () => {
    await expect(
      caller.agenda.create({ ...validReservation, participants: Array.from({ length: 21 }, () => participant) }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("autorização do painel interno", () => {
  it("nega consultas sem sessão", async () => {
    const caller = appRouter.createCaller(context());
    const day = getTodayInBrazil();
    await expect(caller.internal.day({ date: day })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(caller.internal.monthly({ month: day.slice(0, 7) })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nega consultas a um usuário autenticado sem papel admin", async () => {
    const now = new Date();
    const caller = appRouter.createCaller(context({
      id: 1,
      openId: "test-user",
      email: "student@example.com",
      name: "Aluno de teste",
      loginMethod: "test",
      role: "user",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    }));
    const day = getTodayInBrazil();
    await expect(caller.internal.day({ date: day })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.internal.monthly({ month: day.slice(0, 7) })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
