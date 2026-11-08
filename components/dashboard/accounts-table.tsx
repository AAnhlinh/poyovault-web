"use client";

import Link from "next/link";
import { useState } from "react";
import { Plus } from "lucide-react";
import type { FinancialProfile } from "@/lib/types";
import { accountTypeLabel } from "@/lib/finance/aggregate";
import { formatCurrency, formatPercent } from "@/lib/finance/format";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "all", label: "All" },
  { id: "cash", label: "Cash" },
  { id: "cards", label: "Cards" },
  { id: "loans", label: "Loans" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function AccountsTable({ profile }: { profile: FinancialProfile }) {
  const [tab, setTab] = useState<TabId>("all");

  const accounts = profile.accounts.filter((account) => {
    if (tab === "cash") return account.type === "checking" || account.type === "savings";
    if (tab === "cards") return account.type === "credit_card";
    if (tab === "loans") return account.type === "loan";
    return true;
  });
  const total = accounts.reduce(
    (sum, account) => sum + (account.type === "checking" || account.type === "savings" ? account.balance : -account.balance),
    0,
  );

  return (
    <section className="surface overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-2.5 sm:px-5">
        <div>
          <p className="label">Accounts</p>
          <p className="mt-0.5 text-[10px] text-white/30">
            {profile.accounts.length} connected · balances update with the demo ledger
          </p>
        </div>
        <Link
          href="/accounts"
          className="inline-flex items-center gap-1 text-[10px] font-medium text-violet-300 hover:text-violet-200"
        >
          <Plus className="h-3 w-3" /> Add account
        </Link>
      </div>

      <div className="flex items-center gap-5 border-b border-white/[0.06] px-4 sm:px-5">
        {TABS.map((entry) => {
          const active = tab === entry.id;
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => setTab(entry.id)}
              className={cn(
                "relative py-2.5 font-mono text-[9px] uppercase tracking-[0.14em] transition",
                active ? "text-white" : "text-white/30 hover:text-white/60",
              )}
            >
              {entry.label}
              {active ? (
                <span className="absolute inset-x-0 -bottom-px h-px bg-violet-300" />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="hidden grid-cols-[1.7fr_0.8fr_0.6fr_0.8fr] gap-3 border-b border-white/[0.05] px-4 py-1.5 font-mono text-[8px] uppercase tracking-[0.14em] text-white/25 sm:grid sm:px-5">
        <span>Account</span>
        <span>Type</span>
        <span>APR</span>
        <span className="text-right">Balance</span>
      </div>

      <div>
        {accounts.map((account) => {
          const isDebt = account.type === "credit_card" || account.type === "loan";
          return (
            <Link
              key={account.id}
              href="/accounts"
              className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-white/[0.04] px-4 py-2.5 transition last:border-b-0 hover:bg-white/[0.03] sm:grid-cols-[1.7fr_0.8fr_0.6fr_0.8fr] sm:px-5"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-white/[0.07] text-[8.5px] font-semibold"
                  style={{
                    backgroundColor: `${account.accent}14`,
                    color: account.accent,
                  }}
                >
                  {account.logo}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[11.5px] font-medium text-white/85">
                    {account.name}
                  </p>
                  <p className="truncate text-[9px] text-white/30">
                    {account.institution} ····{account.mask}
                  </p>
                </div>
              </div>
              <span className="hidden text-[10px] text-white/40 sm:block">
                {accountTypeLabel(account)}
              </span>
              <span className="num hidden text-[10px] text-white/40 sm:block">
                {account.apr !== undefined ? formatPercent(account.apr, 2) : "—"}
              </span>
              <span className="text-right">
                <span
                  className={cn(
                    "num text-[11.5px] font-semibold",
                    isDebt ? "text-white/85" : "text-mint",
                  )}
                >
                  {formatCurrency(account.balance)}
                </span>
                <span className="block font-mono text-[8px] uppercase tracking-[0.12em] text-white/25 sm:hidden">
                  {isDebt ? "owed" : accountTypeLabel(account)}
                </span>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-2 sm:px-5">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-white/25">
          {accounts.length} {accounts.length === 1 ? "account" : "accounts"} shown
        </span>
        <span className="text-[10px] text-white/40">
          Net{" "}
          <span className={cn("num font-semibold", total >= 0 ? "text-white/80" : "text-coral")}>
            {formatCurrency(total)}
          </span>
        </span>
      </div>
    </section>
  );
}
