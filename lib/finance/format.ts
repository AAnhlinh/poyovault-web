import type { AccountType } from "../types";

export function formatCurrency(
  value: number,
  options: { compact?: boolean; cents?: boolean; sign?: boolean } = {},
) {
  const { compact = false, cents = false, sign = false } = options;
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: compact ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : cents ? 2 : 0,
    minimumFractionDigits: compact ? 0 : cents ? 2 : 0,
  }).format(Math.abs(value));
  if (sign && value !== 0) return `${value > 0 ? "+" : "−"}${formatted}`;
  return value < 0 ? `−${formatted}` : formatted;
}

export function formatPercent(value: number, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

export function formatMonths(months: number) {
  if (!Number.isFinite(months)) return "—";
  const rounded = Math.max(0, Math.round(months));
  const years = Math.floor(rounded / 12);
  const rest = rounded % 12;
  if (years === 0) return `${rest} mo`;
  if (rest === 0) return `${years} yr`;
  return `${years} yr ${rest} mo`;
}

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function monthKey(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: string, style: "short" | "long" = "short") {
  const [year, month] = key.split("-").map(Number);
  const name = MONTHS[(month ?? 1) - 1] ?? "";
  return style === "long" ? `${name} ${year}` : name.slice(0, 3);
}

export function formatDate(date: string, style: "short" | "medium" = "medium") {
  const d = new Date(date);
  if (style === "short") {
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeSync(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.round(hours / 24);
  return `${days}d ago`;
}

export function daysUntil(date: string) {
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

export function titleCase(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

export function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

export function addMonths(date: Date, months: number) {
  const next = new Date(date);
  const day = next.getDate();
  next.setMonth(next.getMonth() + months);
  if (next.getDate() < day) next.setDate(0);
  return next;
}

export function isoMonthAdd(key: string, months: number) {
  const [year, month] = key.split("-").map(Number);
  return monthKey(new Date(year, month - 1 + months, 1));
}

export interface PaymentDue {
  accountId: string;
  name: string;
  institution: string;
  amount: number;
  dueDate: string;
  type: AccountType;
}

/** Next occurrence of a monthly due day, relative to `from`. */
export function nextDueDate(dueDay: number, from = new Date()): string {
  const candidate = new Date(from.getFullYear(), from.getMonth(), Math.min(dueDay, 28));
  if (candidate < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
    candidate.setMonth(candidate.getMonth() + 1);
  }
  return candidate.toISOString();
}
