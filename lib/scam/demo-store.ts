"use client";

import type { BlockedAreaCode, CallLog } from "./types";

const CALLS_KEY = "finsight.callLogs.v1";
const BLOCKED_KEY = "finsight.blockedAreaCodes.v1";
const MAX_CALLS = 50;

function readArray<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, value: T[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

export function loadDemoCallLogs(): CallLog[] {
  return readArray<CallLog>(CALLS_KEY)
    .filter((log): log is CallLog => Boolean(log && typeof log.id === "string" && typeof log.transcript === "string"))
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, MAX_CALLS);
}

export function saveDemoCallLog(log: CallLog): CallLog[] {
  const next = [log, ...loadDemoCallLogs().filter((item) => item.id !== log.id)].slice(0, MAX_CALLS);
  writeArray(CALLS_KEY, next);
  return next;
}

export function loadDemoBlockedAreaCodes(): BlockedAreaCode[] {
  return readArray<BlockedAreaCode>(BLOCKED_KEY)
    .filter((item): item is BlockedAreaCode => Boolean(item && /^[2-9]\d{2}$/.test(item.areaCode)))
    .sort((a, b) => a.areaCode.localeCompare(b.areaCode));
}

export function addDemoBlockedAreaCode(areaCode: string, reason = ""): BlockedAreaCode[] {
  const clean = areaCode.replace(/\D/g, "").slice(0, 3);
  const next = [
    {
      id: `demo_${clean}`,
      areaCode: clean,
      reason: reason.trim().slice(0, 160),
      createdAt: new Date().toISOString(),
    },
    ...loadDemoBlockedAreaCodes().filter((item) => item.areaCode !== clean),
  ].sort((a, b) => a.areaCode.localeCompare(b.areaCode));
  writeArray(BLOCKED_KEY, next);
  return next;
}

export function removeDemoBlockedAreaCode(areaCode: string): BlockedAreaCode[] {
  const next = loadDemoBlockedAreaCodes().filter((item) => item.areaCode !== areaCode);
  writeArray(BLOCKED_KEY, next);
  return next;
}

export function isDemoAreaCodeBlocked(areaCode: string): boolean {
  return loadDemoBlockedAreaCodes().some((item) => item.areaCode === areaCode);
}
