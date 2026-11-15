import { describe, expect, it } from "vitest";
import { availableEndTimes as webEndTimes } from "../client/src/lib/reservation-time";
import { availableEndTimes as mobileEndTimes } from "../../mobile/reservation-time";

const formatTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

const slots = Array.from({ length: 30 }, (_, index) => {
  const startMinutes = 7 * 60 + index * 30;
  return { start: formatTime(startMinutes), end: formatTime(startMinutes + 30) };
});

const implementations = [
  { version: "web", getEndTimes: webEndTimes },
  { version: "mobile", getEndTimes: mobileEndTimes },
] as const;

describe.each(implementations)("opções de término na versão $version", ({ getEndTimes }) => {
  it("permite o primeiro bloco de 30 minutos", () => {
    expect(getEndTimes(slots, "07:00")[0]).toBe("07:30");
  });

  it("permite intervalos longos em incrementos de 30 minutos", () => {
    expect(getEndTimes(slots, "20:30")).toEqual(["21:00", "21:30", "22:00"]);
  });

  it("permite encerrar às 22:00 quando o início é 21:30", () => {
    expect(getEndTimes(slots, "21:30")).toEqual(["22:00"]);
  });

  it("não oferece términos para um início fora da grade", () => {
    expect(getEndTimes(slots, "19:15")).toEqual([]);
  });
});
