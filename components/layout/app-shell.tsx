"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  ChevronRight,
  Compass,
  CreditCard,
  Gift,
  LayoutDashboard,
  Menu,
  MessagesSquare,
  PieChart,
  PiggyBank,
  Settings,
  ShieldAlert,
  TrendingUp,
  Trophy,
  Wallet,
  X,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { getUpcomingPayments } from "@/lib/finance/aggregate";
import { computeHealthScore } from "@/lib/finance/score";
import { formatCurrency, formatDate } from "@/lib/finance/format";
import { cn } from "@/lib/utils";
import { Badge, Progress } from "@/components/ui/primitives";
import { Poyo } from "@/components/shared/poyo";
import { PoyoChat } from "@/components/shared/poyo-chat";
import { BackgroundRippleEffect } from "@/components/ui/background-ripple-effect";
import { getMissionControl } from "@/lib/finance/gamification";

const NAV_SECTIONS = [
  {
    label: "Overview",
    items: [
      { href: "/", label: "Home", icon: LayoutDashboard },
      { href: "/progress", label: "Mission control", icon: Trophy, badge: "XP" },
    ],
  },
  {
    label: "Money",
    items: [
      { href: "/accounts", label: "My accounts", icon: Wallet },
      { href: "/spending", label: "Spending", icon: PieChart },
      { href: "/debt", label: "Debt manager", icon: CreditCard },
      { href: "/savings", label: "Savings goals", icon: PiggyBank },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { href: "/advisor", label: "Advisor", icon: MessagesSquare },
      { href: "/forecast", label: "Forecast", icon: TrendingUp },
      { href: "/what-if", label: "What if", icon: Compass },
    ],
  },
  {
    label: "Protection",
    items: [
      { href: "/scam-protection", label: "Scam protection", icon: ShieldAlert },
    ],
  },
  {
    label: "Perks",
    items: [{ href: "/rewards", label: "Rewards", icon: Gift }],
  },
];

const PAGE_META: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Good to see you",
    description: "Your complete financial picture, and what to do next.",
  },
  "/accounts": {
    title: "My accounts",
    description: "Every balance across your connected banks and lenders.",
  },
  "/spending": {
    title: "Spending",
    description: "Where your money goes, and where it could go further.",
  },
  "/debt": {
    title: "Debt manager",
    description: "Understand the cost of your debt and the fastest way out.",
  },
  "/savings": {
    title: "Savings goals",
    description: "A cushion, a trip, a plan — with progress you can see.",
  },
  "/advisor": {
    title: "Financial advisor",
    description: "Answers built from your accounts, not generic advice.",
  },
  "/forecast": {
    title: "Financial forecast",
    description: "What today's habits imply for the months ahead.",
  },
  "/what-if": {
    title: "What if",
    description: "Try a trip, a big purchase or a move before you commit.",
  },
  "/scam-protection": {
    title: "Scam protection",
    description: "Check a suspicious call against your accounts before you act.",
  },
  "/rewards": {
    title: "Rewards",
    description: "Partner benefits matched to spending you already have.",
  },
  "/progress": {
    title: "Mission control",
    description: "Poyo tracks your milestones, missions and momentum.",
  },
  "/settings": {
    title: "Profile & settings",
    description: "Connections, privacy controls and how your data is used.",
  },
};

function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 items-center justify-center rounded-md border border-violet-300/20 bg-violet-500/10">
        <Poyo size={24} variant="mark" animated={false} glow={false} />
      </div>
      <div>
        <p className="font-display text-[15px] font-semibold leading-none tracking-tight text-white">
          PoyoVault
        </p>
        <p className="mt-1 text-[8.5px] uppercase tracking-[0.18em] text-white/30">
          Personal finance
        </p>
      </div>
    </Link>
  );
}

function PoyoBar() {
  const { profile } = useFinance();
  const state = getMissionControl(profile);

  return (
    <Link
      href="/progress"
      className="group mt-4 block rounded-md border border-white/[0.08] bg-white/[0.025] px-2.5 py-2.5 transition hover:border-violet-300/25 hover:bg-white/[0.04]"
    >
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-violet-300/20 bg-violet-500/10">
          <Poyo size={22} variant="mark" animated={false} glow={false} />
          <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-mint ring-2 ring-ink-950" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[9px] font-semibold uppercase tracking-[0.14em] text-violet-200/70">
              Poyo · Lv {state.rankIndex + 1}
            </p>
            <ChevronRight className="h-3 w-3 shrink-0 text-white/25 transition group-hover:text-white/55" />
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-[10px] text-white/40">{state.codename}</p>
            <p className="num shrink-0 text-[9.5px] font-semibold text-amber">
              {state.points} XP
            </p>
          </div>
          <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-violet-300"
              style={{ width: `${Math.max(4, state.levelProgress)}%` }}
            />
          </div>
        </div>
      </div>
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="flex-1 space-y-5 overflow-y-auto pr-1">
      {NAV_SECTIONS.map((section) => (
        <div key={section.label}>
          <p className="mb-1.5 px-2.5 text-[8.5px] font-semibold uppercase tracking-[0.18em] text-white/25">
            {section.label}
          </p>
          <div className="space-y-0.5">
            {section.items.map((item) => {
              const active =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[12.5px] font-medium transition",
                    active
                      ? "bg-violet-500/[0.09] text-white"
                      : "text-white/50 hover:bg-white/[0.035] hover:text-white/90",
                  )}
                >
                  {active ? (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-violet-300" />
                  ) : null}
                  <Icon
                    className={cn(
                      "h-4 w-4 shrink-0 transition",
                      active ? "text-violet-300" : "text-white/35 group-hover:text-white/65",
                    )}
                    strokeWidth={1.8}
                  />
                  <span className="flex-1">{item.label}</span>
                  {"badge" in item && item.badge ? (
                    <span className="rounded-md border border-violet-400/25 bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-wide text-violet-300">
                      {item.badge}
                    </span>
                  ) : null}
                  {active ? <span className="h-1 w-1 rounded-full bg-violet-300" /> : null}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

function SidebarFooter() {
  const { profile, mode } = useFinance();
  const score = computeHealthScore(profile);

  return (
    <div className="mt-5 space-y-3 border-t border-white/[0.06] pt-4">
      <Link
        href="/advisor"
        className="block rounded-md border border-white/[0.07] bg-white/[0.02] p-3 transition hover:border-white/[0.15] hover:bg-white/[0.035]"
      >
        <div className="flex items-center justify-between">
          <p className="label">Health score</p>
          <ChevronRight className="h-3.5 w-3.5 text-white/30" />
        </div>
        <div className="mt-2 flex items-end justify-between">
          <p className="font-display text-2xl font-semibold leading-none text-white">
            {score.score}
            <span className="ml-0.5 text-xs font-medium text-white/35">/100</span>
          </p>
          <Badge tone={score.tone === "mint" ? "mint" : score.tone === "blue" ? "blue" : score.tone === "amber" ? "amber" : "coral"}>
            {score.band}
          </Badge>
        </div>
        <Progress
          value={score.score}
          tone={score.tone === "amber" ? "amber" : score.tone === "coral" ? "coral" : score.tone === "mint" ? "mint" : "brand"}
          className="mt-3"
          size="sm"
          label="Financial health score"
        />
      </Link>

      <Link
        href="/settings"
        className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.05]"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/30 to-brand-500/20 text-[11px] font-semibold text-white ring-1 ring-white/10">
          {profile.customer.avatarInitials}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium text-white/90">
            {profile.customer.name}
          </p>
          <p className="truncate text-[10.5px] text-white/35">
            {mode === "demo" ? "Demo workspace" : profile.customer.plan}
          </p>
        </div>
        <Settings className="h-4 w-4 text-white/25" />
      </Link>
    </div>
  );
}

function NotificationsMenu({ onClose }: { onClose: () => void }) {
  const { profile } = useFinance();
  const payments = getUpcomingPayments(profile).slice(0, 3);

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default"
        aria-label="Close notifications"
        onClick={onClose}
      />
      <div className="absolute right-0 top-11 z-50 w-[320px] overflow-hidden rounded-lg border border-white/10 bg-ink-850/95 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <p className="text-[12.5px] font-semibold text-white">Upcoming payments</p>
          <span className="text-[10px] text-white/30">{payments.length} due</span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {payments.map((payment) => (
            <Link
              key={payment.accountId}
              href="/accounts"
              onClick={onClose}
              className="flex items-start gap-3 px-4 py-3 transition hover:bg-white/[0.04]"
            >
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                <CreditCard className="h-3.5 w-3.5 text-white/55" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium text-white/85">{payment.name}</p>
                <p className="mt-0.5 text-[10.5px] text-white/40">
                  {formatCurrency(payment.amount)} · due {formatDate(payment.dueDate, "short")}
                </p>
              </div>
              <span className="text-[10px] text-amber">
                {payment.daysAway === 0 ? "Today" : `${payment.daysAway}d`}
              </span>
            </Link>
          ))}
        </div>
        <Link
          href="/settings"
          onClick={onClose}
          className="block border-t border-white/[0.06] px-4 py-2.5 text-center text-[11px] text-violet-300 transition hover:bg-white/[0.04]"
        >
          Notification settings
        </Link>
      </div>
    </>
  );
}

function MobileDock() {
  const pathname = usePathname();
  const items = [
    { href: "/", label: "Home", icon: LayoutDashboard },
    { href: "/accounts", label: "Accounts", icon: Wallet },
    { href: "/spending", label: "Spending", icon: PieChart },
    { href: "/advisor", label: "Poyo", icon: MessagesSquare },
  ];

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-white/[0.08] bg-ink-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
    >
      <div className="mx-auto grid h-[58px] max-w-md grid-cols-4 px-2">
        {items.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex flex-col items-center justify-center gap-1 text-[9.5px] font-medium transition",
                active ? "text-violet-300" : "text-white/35 hover:text-white/70",
              )}
            >
              {active ? (
                <span className="absolute top-0 h-[2px] w-7 rounded-full bg-violet-300" />
              ) : null}
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.8} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-8 w-64 rounded-md bg-white/[0.05]" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-64 rounded-lg bg-white/[0.04] lg:col-span-2" />
        <div className="h-64 rounded-lg bg-white/[0.04]" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <div key={index} className="h-32 rounded-lg bg-white/[0.04]" />
        ))}
      </div>
    </div>
  );
}

export function AppShell({ children, mode }: { children: ReactNode; mode: "demo" | "cloud" }) {
  const pathname = usePathname();
  const { hydrated, profile, syncError, pendingSync } = useFinance();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const meta = PAGE_META[pathname] ?? {
    title: "PoyoVault",
    description: "Your financial picture, in one place.",
  };
  const payments = getUpcomingPayments(profile);
  const hasUrgent = payments.some((payment) => payment.daysAway <= 7);
  const mission = getMissionControl(profile);

  useEffect(() => {
    setMobileOpen(false);
    setNotificationsOpen(false);
  }, [pathname]);

  return (
    <div className="relative min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[236px] flex-col border-r border-white/[0.07] bg-ink-950/95 px-3 py-4 backdrop-blur-md lg:flex">
        <div className="px-2">
          <Logo />
        </div>
        <PoyoBar />
        <div className="mt-4 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-ink-950/80 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="relative flex h-full w-[280px] flex-col border-r border-white/10 bg-ink-900 px-3 py-4">
            <div className="flex items-center justify-between px-2">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-2 text-white/40 hover:bg-white/[0.06] hover:text-white"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <PoyoBar />
            <div className="mt-4 flex-1 overflow-y-auto">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <SidebarFooter />
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-[236px]">
        <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-[linear-gradient(100deg,#211847_0%,#15132A_48%,#090A12_100%)] backdrop-blur-md">
          <div className="flex h-[62px] items-center gap-3 px-4 sm:px-6 lg:px-7">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="rounded-md border border-white/10 p-2 text-white/60 transition hover:text-white lg:hidden"
              aria-label="Open navigation"
            >
              <Menu className="h-4.5 w-4.5" />
            </button>

            <Link
              href="/"
              aria-label="PoyoVault home"
              className="flex shrink-0 items-center gap-2 lg:hidden"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-violet-300/20 bg-violet-500/10">
                <Poyo size={21} variant="mark" animated={false} glow={false} />
              </span>
              <span className="hidden text-[12.5px] font-semibold tracking-tight text-white sm:block">
                PoyoVault
              </span>
            </Link>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-semibold tracking-tight text-white">
                {meta.title}
                {pathname === "/" ? `, ${profile.customer.name.split(" ")[0]}` : ""}
              </h1>
              <p className="hidden truncate text-[11px] text-white/40 sm:block">
                {meta.description}
              </p>
            </div>

            <Link
              href="/progress"
              title={`${mission.points} XP · ${mission.codename}. Open mission control.`}
              className="hidden items-center gap-2 rounded-md border border-violet-400/20 bg-violet-500/[0.08] px-2.5 py-1.5 text-[10px] font-semibold text-violet-200 transition hover:border-violet-300/35 hover:bg-violet-500/[0.14] md:inline-flex"
            >
              <Poyo size={18} variant="mark" animated={false} glow={false} />
              <span className="uppercase tracking-[0.12em]">Lv {mission.rankIndex + 1}</span>
              <span className="h-3 w-px bg-white/15" />
              <span className="num text-amber">{mission.points} XP</span>
            </Link>

            {pendingSync > 0 ? (
              <span className="hidden items-center gap-1.5 text-[10px] text-white/35 sm:flex">
                <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-amber" />
                Saving
              </span>
            ) : null}

            <Link
              href="/settings"
              className={cn(
                "hidden items-center gap-2 rounded-md border px-3 py-1.5 text-[10.5px] font-medium transition sm:inline-flex",
                mode === "demo"
                  ? "border-amber/20 bg-amber/[0.08] text-amber hover:bg-amber/[0.14]"
                  : "border-mint/20 bg-mint/[0.08] text-mint hover:bg-mint/[0.14]",
              )}
              title={
                mode === "demo"
                  ? "Running on the sample customer. Add Supabase keys to persist to your own database."
                  : "Signed in and storing data in Supabase."
              }
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current" />
              {mode === "demo" ? "Demo data" : "Supabase live"}
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setNotificationsOpen((open) => !open)}
                className="relative rounded-md border border-white/[0.08] p-2 text-white/55 transition hover:border-white/15 hover:text-white"
                aria-label="Upcoming payments"
              >
                <Bell className="h-4 w-4" />
                {hasUrgent ? (
                  <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-coral ring-2 ring-ink-950" />
                ) : null}
              </button>
              {notificationsOpen ? (
                <NotificationsMenu onClose={() => setNotificationsOpen(false)} />
              ) : null}
            </div>

            <Link
              href="/settings"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500/35 to-brand-500/25 text-[11px] font-semibold text-white ring-1 ring-white/10 transition hover:ring-white/20"
              aria-label="Profile and settings"
            >
              {profile.customer.avatarInitials}
            </Link>
          </div>
          {syncError ? (
            <div className="border-t border-coral/20 bg-coral/[0.07] px-4 py-2 text-[11px] text-coral sm:px-6 lg:px-8">
              {syncError}
            </div>
          ) : null}
        </header>

        <main className="relative isolate mx-auto w-full max-w-[1560px] px-4 pb-[92px] pt-5 sm:px-6 lg:px-7 lg:py-7">
          <div
            aria-hidden="true"
            className="dark absolute inset-x-0 top-0 z-0 h-[430px] overflow-hidden opacity-[0.55] [mask-image:linear-gradient(to_bottom,black_0%,black_38%,transparent_94%)]"
          >
            <BackgroundRippleEffect rows={8} cols={27} cellSize={56} />
          </div>
          <div className="relative z-10">
            {hydrated ? (
              <div key={pathname} className="animate-fade-up">
                {children}
              </div>
            ) : (
              <PageSkeleton />
            )}
            <footer className="mt-10 flex flex-col gap-2 border-t border-white/[0.05] pb-2 pt-4 text-[10px] text-white/25 sm:flex-row sm:items-center sm:justify-between">
              <p>PoyoVault is a prototype using simulated financial data.</p>
              <p>Educational guidance only — not financial advice or a guarantee of outcomes.</p>
            </footer>
          </div>
        </main>
      </div>
      <PoyoChat />
      <MobileDock />
    </div>
  );
}
