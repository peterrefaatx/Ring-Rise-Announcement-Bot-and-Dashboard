export const EST_OFFSET_HOURS = -5;
export const EST_OFFSET_MS = EST_OFFSET_HOURS * 60 * 60 * 1000;
export const EST_TIMEZONE_LABEL = "EST (UTC-5 Fixed)";

/**
 * Shifts a UTC instant by -5 hours so its UTC getters represent fixed EST wall clock.
 * Never uses DST (EDT).
 */
export function toEstWallClock(date: Date = new Date()): Date {
  return new Date(date.getTime() + EST_OFFSET_MS);
}

/**
 * Returns YYYY-MM-DD for the business day in fixed EST (UTC-5).
 */
export function getBusinessDateEst(date: Date = new Date()): string {
  const est = toEstWallClock(date);
  return est.toISOString().slice(0, 10);
}

/**
 * Returns YYYY-MM for the business month in fixed EST (UTC-5).
 */
export function getBusinessMonthEst(date: Date = new Date()): string {
  const est = toEstWallClock(date);
  return est.toISOString().slice(0, 7);
}

/**
 * Converts a YYYY-MM-DD EST business date into exact [startUtc, endUtc) instants.
 */
export function getEstDayRangeUtc(businessDateEst: string): { startUtc: Date; endUtc: Date } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(businessDateEst);
  if (!match) {
    throw new Error(`Invalid EST business date: ${businessDateEst}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  // 00:00:00 EST is always 05:00:00 UTC
  const startMs = Date.UTC(year, month - 1, day, 5, 0, 0, 0);
  const startUtc = new Date(startMs);
  if (getBusinessDateEst(startUtc) !== businessDateEst) {
    throw new Error(`Non-existent EST calendar date: ${businessDateEst}`);
  }
  const endUtc = new Date(startMs + 24 * 60 * 60 * 1000);
  return { startUtc, endUtc };
}

/**
 * Converts a YYYY-MM EST business month into exact [startUtc, endUtc) instants.
 */
export function getEstMonthRangeUtc(businessMonthEst: string): { startUtc: Date; endUtc: Date } {
  const match = /^(\d{4})-(\d{2})$/.exec(businessMonthEst);
  if (!match) {
    throw new Error(`Invalid EST business month: ${businessMonthEst}`);
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) {
    throw new Error(`Invalid month in EST business month: ${businessMonthEst}`);
  }
  const startUtc = new Date(Date.UTC(year, month - 1, 1, 5, 0, 0, 0));
  const endUtc = new Date(Date.UTC(year, month, 1, 5, 0, 0, 0));
  return { startUtc, endUtc };
}

/**
 * Returns milliseconds remaining until the next midnight in fixed EST (UTC-5).
 */
export function msUntilNextEstMidnight(now: Date = new Date()): number {
  const currentDay = getBusinessDateEst(now);
  const { endUtc } = getEstDayRangeUtc(currentDay);
  return Math.max(1000, endUtc.getTime() - now.getTime());
}

/**
 * Formats an instant as HH:mm in fixed EST (UTC-5).
 */
export function formatEstTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const est = toEstWallClock(date);
  const hours = String(est.getUTCHours()).padStart(2, "0");
  const minutes = String(est.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

/**
 * Formats an instant as YYYY-MM-DD HH:mm EST.
 */
export function formatEstDateTime(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const est = toEstWallClock(date);
  return `${est.toISOString().slice(0, 10)} ${formatEstTime(date)} EST`;
}

/**
 * Formats relative time like "just now", "2m ago", "1h ago".
 */
export function formatRelativeTime(input: Date | string, now: Date = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const diffSec = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));
  if (diffSec < 10) return "just now";
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}
