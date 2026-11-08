"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  ChevronRight,
  Delete,
  Globe2,
  Loader2,
  MapPin,
  Mic,
  MicOff,
  Phone,
  PhoneIncoming,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Badge, Button, Card, InfoNote } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import {
  formatPhoneNumber,
  isValidUsPhone,
  phoneDigits,
} from "@/lib/scam/location";
import {
  loadDemoBlockedAreaCodes,
  saveDemoCallLog,
} from "@/lib/scam/demo-store";
import type { HandleTranscriptResponse } from "@/lib/scam/types";

type CallStatus = "idle" | "preparing" | "calling" | "analyzing" | "done" | "error";

type SpeechAlternative = { transcript: string };
type SpeechResult = { isFinal: boolean; 0: SpeechAlternative };
type SpeechResultList = { length: number; [index: number]: SpeechResult };
type SpeechEvent = { resultIndex: number; results: SpeechResultList };
type SpeechErrorEvent = { error?: string };
type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "IN", name: "India" },
  { code: "NG", name: "Nigeria" },
  { code: "PH", name: "Philippines" },
  { code: "RU", name: "Russia" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "AU", name: "Australia" },
] as const;

const KEYPAD = [
  { key: "1", letters: "" },
  { key: "2", letters: "ABC" },
  { key: "3", letters: "DEF" },
  { key: "4", letters: "GHI" },
  { key: "5", letters: "JKL" },
  { key: "6", letters: "MNO" },
  { key: "7", letters: "PQRS" },
  { key: "8", letters: "TUV" },
  { key: "9", letters: "WXYZ" },
  { key: "*", letters: "" },
  { key: "0", letters: "+" },
  { key: "#", letters: "" },
];

function scriptFor(callerName: string) {
  return [
    `Caller: Hi, this is ${callerName || "account security"}. We detected a suspicious $1,850 charge on your card ending in 2049.`,
    "Caller: I can stop the payment, but I need you to read back the six-digit verification code we just sent to your phone.",
    "Caller: Please stay on the line and do not open your banking app, or the transfer will go through.",
  ];
}

function speechCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null;
}

function scoreTone(score: number) {
  return score >= 60 ? "coral" : score >= 25 ? "amber" : "mint";
}

function scoreRing(score: number) {
  return score >= 60
    ? "border-coral/40 bg-coral/[0.08] text-coral"
    : score >= 25
      ? "border-amber/40 bg-amber/[0.08] text-amber"
      : "border-mint/40 bg-mint/[0.08] text-mint";
}

export function TestDialer() {
  const [callerName, setCallerName] = useState("Amazon Support");
  const [digits, setDigits] = useState("4155550132");
  const [networkCountry, setNetworkCountry] = useState("US");
  const [networkRegion, setNetworkRegion] = useState("CA");
  const [captureMode, setCaptureMode] = useState<"mic" | "script">("mic");
  const [status, setStatus] = useState<CallStatus>("idle");
  const [secondsLeft, setSecondsLeft] = useState(5);
  const [liveText, setLiveText] = useState("");
  const [interimText, setInterimText] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);
  const [result, setResult] = useState<HandleTranscriptResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [micSupported, setMicSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const timerRef = useRef<number[]>([]);
  const countdownRef = useRef<number | null>(null);
  const transcriptRef = useRef("");
  const finalRef = useRef("");
  const interimRef = useRef("");
  const callActiveRef = useRef(false);

  const busy = status === "preparing" || status === "calling" || status === "analyzing";
  const cleanDigits = phoneDigits(digits);
  const formatted = formatPhoneNumber(cleanDigits);

  useEffect(() => {
    setMicSupported(Boolean(speechCtor() && navigator.mediaDevices?.getUserMedia));
    return () => {
      callActiveRef.current = false;
      timerRef.current.forEach((timer) => window.clearTimeout(timer));
      if (countdownRef.current) window.clearInterval(countdownRef.current);
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  function appendKey(key: string) {
    if (!/^\d$/.test(key) || busy || cleanDigits.length >= 10) return;
    setDigits(`${cleanDigits}${key}`);
    setError(null);
    setResult(null);
    setStatus("idle");
  }

  function backspace() {
    if (busy) return;
    setDigits(cleanDigits.slice(0, -1));
    setResult(null);
    setStatus("idle");
  }

  function clearNumber() {
    if (busy) return;
    setDigits("");
    setResult(null);
    setStatus("idle");
    setError(null);
  }

  function useSample(mismatch = false) {
    if (busy) return;
    setCallerName("Amazon Support");
    setDigits("4155550132");
    setNetworkCountry(mismatch ? "IN" : "US");
    setNetworkRegion(mismatch ? "Maharashtra" : "CA");
    setCaptureMode("script");
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  function stopRecognition() {
    try {
      recognitionRef.current?.stop();
    } catch {
      // Already stopped.
    }
    recognitionRef.current = null;
  }

  async function beginMicrophone(): Promise<boolean> {
    const Ctor = speechCtor();
    if (!Ctor || !navigator.mediaDevices?.getUserMedia) {
      setNotice(
        "Speech recognition is not available in this browser. The scripted demo transcript will be used instead.",
      );
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch {
      setNotice(
        "Microphone permission was not granted. The scripted demo transcript will be used instead.",
      );
      return false;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      let finalText = finalRef.current;
      let interim = "";
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const text = event.results[index][0]?.transcript ?? "";
        if (event.results[index].isFinal) finalText += `${text} `;
        else interim += text;
      }
      finalRef.current = finalText;
      interimRef.current = interim;
      transcriptRef.current = `${finalText} ${interim}`.trim();
      setLiveText(finalText.trim());
      setInterimText(interim);
    };
    recognition.onerror = (event) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setNotice("Microphone access was blocked. The scripted demo will be used instead.");
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      return true;
    } catch {
      setNotice("The microphone could not start. The scripted demo will be used instead.");
      return false;
    }
  }

  function scheduleScript() {
    const lines = scriptFor(callerName);
    lines.forEach((line, index) => {
      const timer = window.setTimeout(() => {
        transcriptRef.current = `${transcriptRef.current} ${line}`.trim();
        setLiveText(transcriptRef.current);
      }, 350 + index * 1400);
      timerRef.current.push(timer);
    });
  }

  async function postTranscript(transcript: string) {
    const response = await fetch("/handle-transcript", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        callerName,
        phoneNumber: cleanDigits,
        transcript,
        durationSeconds: 5,
        simulated: true,
        source: "test_dialer",
        network: {
          country: networkCountry,
          region: networkRegion,
        },
        blockedAreaCodes: loadDemoBlockedAreaCodes().map((item) => item.areaCode),
      }),
    });
    const data = (await response.json().catch(() => ({}))) as
      | HandleTranscriptResponse
      | { error?: string };
    if (!response.ok) {
      throw new Error(("error" in data && data.error) || "The call could not be logged.");
    }
    const payload = data as HandleTranscriptResponse;
    if (!payload.persisted && payload.log) saveDemoCallLog(payload.log);
    setResult(payload);
    setStatus("done");
  }

  async function startCall() {
    if (busy) return;
    if (!callerName.trim()) {
      setError("Give the caller a name, like Amazon Support.");
      return;
    }
    if (!isValidUsPhone(cleanDigits)) {
      setError("Enter a valid 10-digit US number, for example 415 555 0132.");
      return;
    }

    setError(null);
    setNotice(captureMode === "script" ? "Scripted demo transcript will be used." : null);
    setResult(null);
    setUsedFallback(false);
    setLiveText("");
    setInterimText("");
    transcriptRef.current = "";
    finalRef.current = "";
    interimRef.current = "";
    setSecondsLeft(5);
    setStatus("preparing");

    let micStarted = false;
    if (captureMode === "mic") {
      micStarted = await beginMicrophone();
    }
    if (!micStarted) scheduleScript();

    callActiveRef.current = true;
    setStatus("calling");
    setSecondsLeft(5);

    countdownRef.current = window.setInterval(() => {
      setSecondsLeft((current) => Math.max(0, current - 1));
    }, 1000);

    const finishTimer = window.setTimeout(() => {
      void finishCall();
    }, 5000);
    timerRef.current.push(finishTimer);
  }

  async function finishCall() {
    if (!callActiveRef.current) return;
    callActiveRef.current = false;
    timerRef.current.forEach((timer) => window.clearTimeout(timer));
    timerRef.current = [];
    if (countdownRef.current) {
      window.clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    stopRecognition();
    setSecondsLeft(0);

    const spoken = transcriptRef.current.trim();
    const script = scriptFor(callerName).join("\n");
    const finalTranscript = spoken.length >= 10 ? spoken : script;
    const fellBack = spoken.length < 10;
    setUsedFallback(fellBack);
    setLiveText(finalTranscript);
    setInterimText("");
    setStatus("analyzing");

    try {
      await postTranscript(finalTranscript);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The call could not be logged.");
      setStatus("error");
    }
  }

  function resetCall() {
    if (busy) return;
    setStatus("idle");
    setResult(null);
    setError(null);
    setNotice(null);
    setUsedFallback(false);
    setLiveText("");
    setInterimText("");
    setSecondsLeft(5);
    transcriptRef.current = "";
    finalRef.current = "";
    interimRef.current = "";
  }

  const report = result;
  const tone = report ? scoreTone(report.log.scamScore) : "mint";
  const callerInitials = callerName
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <main className="min-h-screen bg-ink-950 px-3 py-4 text-white sm:px-6 sm:py-6">
      <div className="mx-auto w-full max-w-6xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/55 transition hover:border-white/20 hover:text-white"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-display text-[15px] font-semibold tracking-tight">Test dialer</p>
                <Badge tone="violet">Hidden page</Badge>
              </div>
              <p className="mt-0.5 text-[10px] text-white/30">
                Simulates an incoming call. No real call is placed.
              </p>
            </div>
          </div>
          <Link
            href="/scam-protection"
            className="inline-flex items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-violet-300 transition hover:border-violet-300/30 hover:text-violet-200"
          >
            Open call log <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,390px)_minmax(0,1fr)] lg:items-start">
          <Card className="p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
                <PhoneIncoming className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[12px] font-medium text-white/85">Incoming caller</p>
                <p className="text-[9.5px] text-white/30">Name and number are fictional.</p>
              </div>
            </div>

            <div className="mt-3 grid gap-2.5">
              <div>
                <label htmlFor="test-caller" className="label">
                  Caller name
                </label>
                <input
                  id="test-caller"
                  value={callerName}
                  onChange={(event) => {
                    setCallerName(event.target.value);
                    setResult(null);
                    setStatus("idle");
                  }}
                  disabled={busy}
                  maxLength={80}
                  placeholder="Amazon Support"
                  className="field mt-1.5"
                />
              </div>
              <div>
                <div className="flex items-end justify-between gap-2">
                  <label htmlFor="test-number" className="label">
                    Phone number
                  </label>
                  <span className="num text-[9px] text-white/30">{cleanDigits.length}/10</span>
                </div>
                <input
                  id="test-number"
                  value={digits}
                  onChange={(event) => {
                    setDigits(phoneDigits(event.target.value).slice(0, 10));
                    setResult(null);
                    setStatus("idle");
                    setError(null);
                  }}
                  disabled={busy}
                  inputMode="tel"
                  autoComplete="off"
                  placeholder="4155550132"
                  className="field mt-1.5 font-mono tracking-[0.08em]"
                />
                <p className="num mt-0.5 min-h-[15px] text-[10.5px] text-white/35">
                  {formatted ? `+1 ${formatted}` : "+1 —"}
                </p>
              </div>
            </div>

            <div className="mx-auto mt-3 grid w-full max-w-[290px] grid-cols-3 gap-2">
              {KEYPAD.map((item) => {
                const disabledKey = item.key === "*" || item.key === "#";
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => appendKey(item.key)}
                    disabled={busy || disabledKey || cleanDigits.length >= 10}
                    aria-label={`Key ${item.key}`}
                    className={cn(
                      "flex h-12 flex-col items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] transition active:scale-[0.97]",
                      "hover:border-white/15 hover:bg-white/[0.06] disabled:opacity-35",
                    )}
                  >
                    <span className="text-[17px] font-medium leading-none">{item.key}</span>
                    {item.letters ? (
                      <span className="mt-0.5 font-mono text-[7px] tracking-[0.12em] text-white/30">
                        {item.letters}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={backspace}
                disabled={busy || !cleanDigits}
                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[10px] text-white/40 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-25"
              >
                <Delete className="h-3.5 w-3.5" /> Backspace
              </button>
              <button
                type="button"
                onClick={clearNumber}
                disabled={busy || !cleanDigits}
                className="rounded-lg px-2.5 py-1.5 text-[10px] text-white/40 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-25"
              >
                Clear
              </button>
            </div>

            <div className="mt-4 border-t border-white/[0.06] pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="label">Simulated network origin</p>
                <Globe2 className="h-3.5 w-3.5 text-white/25" />
              </div>
              <p className="mt-1 text-[9.5px] leading-relaxed text-white/30">
                This is the routing location compared with the area code.
              </p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <select
                  value={networkCountry}
                  onChange={(event) => {
                    setNetworkCountry(event.target.value);
                    setResult(null);
                    setStatus("idle");
                  }}
                  disabled={busy}
                  aria-label="Network country"
                  className="field h-9 py-1.5 text-[11px]"
                >
                  {COUNTRIES.map((country) => (
                    <option key={country.code} value={country.code} className="bg-ink-900">
                      {country.name}
                    </option>
                  ))}
                </select>
                <input
                  value={networkRegion}
                  onChange={(event) => {
                    setNetworkRegion(event.target.value);
                    setResult(null);
                    setStatus("idle");
                  }}
                  disabled={busy}
                  maxLength={40}
                  aria-label="Network region"
                  placeholder="State / region"
                  className="field h-9 py-1.5 text-[11px]"
                />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => useSample(false)}
                  disabled={busy}
                  className="rounded-md border border-mint/20 bg-mint/[0.06] px-2 py-1 text-[9px] text-mint transition hover:bg-mint/[0.1] disabled:opacity-40"
                >
                  Matching sample
                </button>
                <button
                  type="button"
                  onClick={() => useSample(true)}
                  disabled={busy}
                  className="rounded-md border border-amber/20 bg-amber/[0.06] px-2 py-1 text-[9px] text-amber transition hover:bg-amber/[0.1] disabled:opacity-40"
                >
                  Mismatch sample
                </button>
              </div>
            </div>

            <div className="mt-3.5 rounded-xl border border-white/[0.06] bg-black/20 p-2.5">
              <p className="label">Transcript source</p>
              <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setCaptureMode("mic")}
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition disabled:opacity-40",
                    captureMode === "mic"
                      ? "border-violet-400/35 bg-violet-500/[0.12] text-violet-200"
                      : "border-white/[0.07] text-white/35 hover:text-white/65",
                  )}
                >
                  <Mic className="h-3 w-3" /> Phone mic
                </button>
                <button
                  type="button"
                  onClick={() => setCaptureMode("script")}
                  disabled={busy}
                  className={cn(
                    "inline-flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-[10px] transition disabled:opacity-40",
                    captureMode === "script"
                      ? "border-violet-400/35 bg-violet-500/[0.12] text-violet-200"
                      : "border-white/[0.07] text-white/35 hover:text-white/65",
                  )}
                >
                  <Sparkles className="h-3 w-3" /> Scripted demo
                </button>
              </div>
              <p className="mt-1.5 flex items-start gap-1.5 text-[9px] leading-relaxed text-white/25">
                {captureMode === "mic" ? (
                  <>
                    <Mic className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    Mic needs HTTPS on a phone. If speech is not detected, the scripted demo is used.
                    {!micSupported ? " This browser does not expose speech recognition." : ""}
                  </>
                ) : (
                  <>
                    <Sparkles className="mt-0.5 h-2.5 w-2.5 shrink-0" />
                    A fictional scam script is typed live over 5 seconds. Useful for testing without
                    a microphone.
                  </>
                )}
              </p>
            </div>

            <Button
              type="button"
              size="lg"
              onClick={() => void startCall()}
              disabled={busy || !callerName.trim() || !isValidUsPhone(cleanDigits)}
              className="mt-3.5 w-full"
            >
              {status === "preparing" || status === "analyzing" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Phone className="h-4 w-4" />
              )}
              {status === "preparing"
                ? "Connecting mic…"
                : status === "calling"
                  ? "Call in progress…"
                  : status === "analyzing"
                    ? "Analyzing call…"
                    : "Initiate call"}
            </Button>
            {error ? <p className="mt-2 text-[10.5px] leading-relaxed text-coral">{error}</p> : null}
            <p className="mt-2 text-center text-[9px] text-white/20">
              Simulates a 5-second call, then sends it to /handle-transcript.
            </p>
          </Card>

          <Card className="min-h-[520px] p-4 sm:p-5">
            {!report && (status === "idle" || status === "error") ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center px-4 text-center">
                <div className="relative flex h-20 w-20 items-center justify-center rounded-full border border-violet-400/20 bg-violet-500/[0.08] text-violet-300">
                  <Phone className="h-8 w-8" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border border-ink-950 bg-mint text-ink-950">
                    <CheckCircle2 className="h-3 w-3" />
                  </span>
                </div>
                <p className="mt-4 font-display text-[18px] font-semibold tracking-tight">
                  Ready to simulate a call
                </p>
                <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/35">
                  Enter a caller and number, choose the network origin, then initiate a 5-second
                  call. The transcript is transcribed, scored for scam signals and saved to the call
                  log.
                </p>
                <div className="mt-4 grid w-full max-w-sm grid-cols-2 gap-2 text-left">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <Mic className="h-3.5 w-3.5 text-violet-300" />
                    <p className="mt-1 text-[10px] font-medium text-white/70">Phone microphone</p>
                    <p className="text-[9px] text-white/25">Live browser transcription</p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <Sparkles className="h-3.5 w-3.5 text-amber" />
                    <p className="mt-1 text-[10px] font-medium text-white/70">Scripted demo</p>
                    <p className="text-[9px] text-white/25">No microphone needed</p>
                  </div>
                </div>
              </div>
            ) : null}

            {(status === "preparing" || status === "calling") && !report ? (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge tone="mint" dot>
                    {status === "preparing" ? "Connecting" : "Call live"}
                  </Badge>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[9.5px] text-white/35">
                      {captureMode === "mic" ? (
                        <>
                          <Mic className="h-3 w-3 text-mint" /> Microphone
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3 w-3 text-amber" /> Script
                        </>
                      )}
                    </span>
                    <span className="num rounded-lg border border-white/10 px-2 py-1 text-[12px] text-white/80">
                      0:0{Math.max(0, secondsLeft)}
                    </span>
                  </div>
                </div>

                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-brand-500/15 text-[13px] font-semibold ring-1 ring-white/10">
                    {callerInitials || "??"}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-display text-[16px] font-semibold tracking-tight">
                      {callerName || "Unknown caller"}
                    </p>
                    <p className="num text-[10.5px] text-white/35">
                      {formatted ? `+1 ${formatted}` : "No number"}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/[0.07] bg-black/25 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="label">Live transcription</p>
                    <span className="flex items-center gap-1 text-[9px] text-mint">
                      <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mint" />
                      Listening
                    </span>
                  </div>
                  <div className="mt-2 min-h-[180px] max-h-[300px] overflow-y-auto whitespace-pre-wrap text-[11.5px] leading-relaxed text-white/65">
                    {liveText ? (
                      liveText
                    ) : (
                      <span className="text-white/25">
                        {status === "preparing"
                          ? "Waiting for microphone permission…"
                          : captureMode === "mic"
                            ? "Start speaking — your words will appear here."
                            : "The scripted caller is about to speak…"}
                      </span>
                    )}
                    {interimText ? (
                      <span className="text-white/35"> {interimText}</span>
                    ) : null}
                  </div>
                </div>

                {notice ? (
                  <InfoNote className="mt-3" icon={<MicOff className="h-4 w-4" />}>
                    {notice}
                  </InfoNote>
                ) : null}
                <p className="mt-3 text-[9.5px] text-white/25">
                  The call ends automatically after five seconds. Nothing is dialed.
                </p>
              </div>
            ) : null}

            {status === "analyzing" && !report ? (
              <div className="flex min-h-[480px] flex-col items-center justify-center text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-400/20 bg-violet-500/[0.08] text-violet-300">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
                <p className="mt-4 font-display text-[18px] font-semibold tracking-tight">
                  Scoring the call…
                </p>
                <p className="mt-1.5 max-w-sm text-[11px] leading-relaxed text-white/35">
                  {usedFallback
                    ? "No speech was captured, so the scripted transcript is being analyzed. "
                    : "Your transcript is "}
                  {usedFallback ? "" : "being analyzed. "}
                  Checking scam language, caller location and your blocked area codes.
                </p>
              </div>
            ) : null}

            {report ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl border",
                        scoreRing(report.log.scamScore),
                      )}
                    >
                      <span className="num text-[21px] font-semibold leading-none">
                        {report.log.scamScore}
                      </span>
                      <span className="mt-0.5 text-[7.5px] uppercase tracking-[0.12em] opacity-60">
                        / 100
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={tone}>
                          {report.log.riskLevel === "high"
                            ? "High risk"
                            : report.log.riskLevel === "medium"
                              ? "Medium risk"
                              : "Low risk"}
                        </Badge>
                        {report.log.blocked ? <Badge tone="coral">Blocked</Badge> : null}
                        {report.log.locationMismatch ? (
                          <Badge tone="amber">Location mismatch</Badge>
                        ) : null}
                      </div>
                      <h2 className="mt-2 font-display text-[18px] font-semibold leading-tight tracking-tight">
                        {report.log.headline}
                      </h2>
                      <p className="mt-1 text-[10.5px] leading-relaxed text-white/40">
                        {report.log.callerName} · +1 {formatPhoneNumber(report.log.phoneNumber)} ·{" "}
                        {report.log.durationSeconds}s
                      </p>
                    </div>
                  </div>
                  <Badge tone={report.persisted ? "mint" : "amber"}>
                    {report.persisted ? "Saved to call_logs" : "Saved locally"}
                  </Badge>
                </div>

                {report.log.locationMismatch ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-amber/20 bg-amber/[0.06] px-3 py-2.5">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber" />
                    <p className="text-[10.5px] leading-relaxed text-amber/90">
                      {report.location.reason}
                    </p>
                  </div>
                ) : null}

                {report.log.blocked ? (
                  <div className="mt-3 flex items-start gap-2 rounded-xl border border-coral/25 bg-coral/[0.07] px-3 py-2.5">
                    <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0 text-coral" />
                    <p className="text-[10.5px] leading-relaxed text-coral/90">
                      {report.log.blockReason}
                    </p>
                  </div>
                ) : null}

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="label">Caller ID location</p>
                    <p className="mt-1 text-[10.5px] text-white/65">
                      {report.log.callerLocation ?? "Unknown area code"}
                    </p>
                    <p className="text-[9px] text-white/25">
                      Area code {report.log.callerAreaCode ?? "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
                    <p className="label">Network location</p>
                    <p className="mt-1 text-[10.5px] text-white/65">
                      {report.log.networkLocation ?? "Not available"}
                    </p>
                    <p className="text-[9px] text-white/25">
                      {report.log.networkSource === "simulated"
                        ? "Simulated test origin"
                        : report.log.networkSource === "geoip"
                          ? "GeoIP lookup"
                          : report.log.networkSource === "headers"
                            ? "Edge headers"
                            : "Unknown source"}
                    </p>
                  </div>
                </div>

                {usedFallback ? (
                  <InfoNote className="mt-3" icon={<MicOff className="h-4 w-4" />}>
                    No speech was captured, so the scripted demo transcript was analyzed and saved.
                  </InfoNote>
                ) : null}

                <div className="mt-3 rounded-xl border border-white/[0.07] bg-black/20 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="label">Transcript</p>
                    <span className="text-[9px] text-white/25">
                      {report.log.transcript.split(/\s+/).length} words
                    </span>
                  </div>
                  <div className="mt-2 max-h-[190px] overflow-y-auto whitespace-pre-wrap text-[11px] leading-relaxed text-white/55">
                    {report.log.transcript}
                  </div>
                </div>

                {report.log.findings.length ? (
                  <div className="mt-3 space-y-1.5">
                    {report.log.findings.slice(0, 4).map((finding) => (
                      <div
                        key={finding.id}
                        className="flex items-start justify-between gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-2"
                      >
                        <span className="text-[10px] text-white/65">{finding.label}</span>
                        <span className="shrink-0 font-mono text-[8.5px] uppercase tracking-[0.08em] text-white/25">
                          {finding.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <p className="mt-3 text-[10.5px] leading-relaxed text-white/35">
                  {report.log.summary}
                </p>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button type="button" size="sm" onClick={resetCall}>
                    <RotateCcw className="h-3.5 w-3.5" /> Run another call
                  </Button>
                  <Link
                    href="/scam-protection"
                    className="inline-flex h-8 items-center gap-1 rounded-xl border border-white/12 px-3 text-[11px] text-violet-300 transition hover:border-violet-300/30 hover:text-violet-200"
                  >
                    View in call log <ChevronRight className="h-3.5 w-3.5" />
                  </Link>
                  {!report.persisted ? (
                    <span className="text-[9px] text-amber/80">
                      Demo mode — saved in this browser. Add Supabase keys to write to call_logs.
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {status === "error" && !report ? (
              <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-coral/20 bg-coral/[0.06] px-3 py-2.5">
                <p className="flex items-center gap-2 text-[10.5px] text-coral">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" /> {error ?? "The call failed."}
                </p>
                <button
                  type="button"
                  onClick={resetCall}
                  className="shrink-0 text-[10px] text-coral/80 underline-offset-2 hover:underline"
                >
                  Reset
                </button>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <InfoNote icon={<ShieldCheck className="h-4 w-4" />}>
            Calls are analyzed for scam language, then location-boosted: a mismatch adds 50 points,
            and a blocked area code forces 100. Saved calls appear in Scam protection → Call log.
          </InfoNote>
          <InfoNote icon={<MicOff className="h-4 w-4" />}>
            Microphone transcription uses your browser&apos;s Web Speech API. On a phone it requires
            an HTTPS origin and a browser that supports speech recognition; otherwise use the
            scripted demo.
          </InfoNote>
        </div>
      </div>
    </main>
  );
}
