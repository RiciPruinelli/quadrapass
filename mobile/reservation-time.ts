export type ReservationTimeSlot = { start: string; end: string };

export function availableEndTimes(
  slots: readonly ReservationTimeSlot[],
  selectedStart: string,
): string[] {
  const startIndex = slots.findIndex(slot => slot.start === selectedStart);
  if (startIndex < 0) return [];
  return slots.slice(startIndex).map(slot => slot.end);
}
