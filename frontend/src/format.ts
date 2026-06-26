import { STROOPS } from "./config";

/** stroop (bigint) → "12.50" gibi XLM string. */
export function formatXLM(stroops: bigint, decimals = 2): string {
  const whole = stroops / STROOPS;
  const frac = stroops % STROOPS;
  const fracStr = (frac * BigInt(10 ** decimals) / STROOPS)
    .toString()
    .padStart(decimals, "0");
  return `${whole.toString()}.${fracStr}`;
}

/** XLM string/number → stroop bigint. */
export function toStroops(xlm: string): bigint {
  const trimmed = xlm.trim();
  if (!trimmed) return 0n;
  const [whole, frac = ""] = trimmed.split(".");
  const fracPadded = (frac + "0000000").slice(0, 7);
  return BigInt(whole || "0") * STROOPS + BigInt(fracPadded || "0");
}

export function shortAddr(addr: string, n = 4): string {
  if (!addr || addr.length < n * 2 + 2) return addr;
  return `${addr.slice(0, n + 1)}…${addr.slice(-n)}`;
}

export function pct(raised: bigint, goal: bigint): number {
  if (goal <= 0n) return 0;
  const p = Number((raised * 10000n) / goal) / 100;
  return Math.min(p, 100);
}

export function timeLeft(deadline: bigint): string {
  const now = BigInt(Math.floor(Date.now() / 1000));
  if (deadline <= now) return "Süre doldu";
  let secs = Number(deadline - now);
  const d = Math.floor(secs / 86400);
  secs -= d * 86400;
  const h = Math.floor(secs / 3600);
  secs -= h * 3600;
  const m = Math.floor(secs / 60);
  if (d > 0) return `${d}g ${h}s kaldı`;
  if (h > 0) return `${h}s ${m}d kaldı`;
  return `${m}d kaldı`;
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  const diff = Math.floor((Date.now() - t) / 1000);
  if (diff < 60) return `${diff}sn önce`;
  if (diff < 3600) return `${Math.floor(diff / 60)}dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}sa önce`;
  return `${Math.floor(diff / 86400)}g önce`;
}
