import { describe, expect, it } from "vitest";
import { hasTimeOverlap, isValidCalendarDate, isValidCalendarMonth } from "../shared/reservation-rules";

describe("detecção de sobreposição de intervalos", () => {
  it("detecta uma sobreposição parcial", () => {
    expect(hasTimeOverlap([{ startTime: "19:00", endTime: "20:00" }], "19:30", "20:30")).toBe(true);
  });

  it("detecta um intervalo que contém uma reserva existente", () => {
    expect(hasTimeOverlap([{ startTime: "19:30", endTime: "20:00" }], "19:00", "21:00")).toBe(true);
  });

  it("permite intervalos adjacentes sem minuto compartilhado", () => {
    expect(hasTimeOverlap([{ startTime: "19:00", endTime: "20:00" }], "20:00", "21:00")).toBe(false);
  });

  it("aceita uma data sem reservas ativas", () => {
    expect(hasTimeOverlap([], "19:00", "20:00")).toBe(false);
  });
});

describe("validação de calendário", () => {
  it("aceita 29 de fevereiro em um ano bissexto", () => {
    expect(isValidCalendarDate("2024-02-29")).toBe(true);
  });

  it("rejeita datas inexistentes e formatos inválidos", () => {
    expect(isValidCalendarDate("2026-02-31")).toBe(false);
    expect(isValidCalendarDate("13/11/2026")).toBe(false);
  });

  it("aceita apenas meses de 01 a 12", () => {
    expect(isValidCalendarMonth("2026-12")).toBe(true);
    expect(isValidCalendarMonth("2026-00")).toBe(false);
    expect(isValidCalendarMonth("2026-13")).toBe(false);
  });
});
