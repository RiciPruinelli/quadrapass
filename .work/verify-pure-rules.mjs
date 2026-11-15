import assert from "node:assert/strict";
import { availableEndTimes as webEndTimes } from "../client/src/lib/reservation-time.ts";
import { availableEndTimes as mobileEndTimes } from "../../mobile/reservation-time.ts";
import {
  hasTimeOverlap,
  isValidCalendarDate,
  isValidCalendarMonth,
} from "../shared/reservation-rules.ts";

const slots = Array.from({ length: 30 }, (_, index) => {
  const startMinutes = 7 * 60 + index * 30;
  const format = (minutes) =>
    `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  return { start: format(startMinutes), end: format(startMinutes + 30) };
});

let assertions = 0;
function check(actual, expected, message) {
  assert.deepEqual(actual, expected, message);
  assertions += 1;
}

for (const [platform, endTimes] of [["web", webEndTimes], ["mobile", mobileEndTimes]]) {
  check(endTimes(slots, "07:00")[0], "07:30", `${platform}: primeiro término válido`);
  check(endTimes(slots, "20:30"), ["21:00", "21:30", "22:00"], `${platform}: opções até o fechamento`);
  check(endTimes(slots, "21:30"), ["22:00"], `${platform}: último início válido`);
  check(endTimes(slots, "19:15"), [], `${platform}: início fora da grade`);
}

check(hasTimeOverlap([{ startTime: "19:00", endTime: "20:00" }], "19:30", "20:30"), true, "sobreposição parcial");
check(hasTimeOverlap([{ startTime: "19:00", endTime: "20:00" }], "20:00", "21:00"), false, "intervalos adjacentes");
check(isValidCalendarDate("2024-02-29"), true, "dia bissexto válido");
check(isValidCalendarDate("2026-02-31"), false, "data impossível");
check(isValidCalendarMonth("2026-12"), true, "último mês válido");
check(isValidCalendarMonth("2026-13"), false, "mês acima de 12");

console.log(`PASS: ${assertions} verificações de horário web/mobile, sobreposição e calendário.`);
