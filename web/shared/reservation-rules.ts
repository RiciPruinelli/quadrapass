export type ReservationInterval = { startTime: string; endTime: string };

export function isValidCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

export function isValidCalendarMonth(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function hasTimeOverlap(
  existing: readonly ReservationInterval[],
  startTime: string,
  endTime: string,
): boolean {
  return existing.some(
    reservation => reservation.startTime < endTime && reservation.endTime > startTime,
  );
}
