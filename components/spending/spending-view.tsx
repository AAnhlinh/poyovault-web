"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  CircleDollarSign,
  Plus,
  Repeat,
  Search,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Undo2,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  CATEGORY_META,
  average,
  getCompleteMonths,
  getMonthlyHistory,
  getSubscriptions,
  getTransactionsForMonth,
} from "@/lib/finance/aggregate";
import { generateInsights } from "@/lib/finance/insights";
import { formatCurrency, formatDate, formatPercent, monthLabel } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, EmptyState, InfoNote } from "@/components/ui/primitives";
import { SpendingDonut } from "@/components/charts/spending-donut";
import { MonthlyBars } from "@/components/charts/monthly-bars";
import { InsightCard } from "@/components/shared/insight-card";
import { AddTransactionDialog } from "@/components/shared/add-transaction-dialog";
import { CategoryAvatar } from "@/components/shared/category-icon";
import { cn } from "@/lib/utils";

export function SpendingView() {
  const { profile, cancelSubscription, reactivateSubscription } = useFinance();
  const history = getMonthlyHistory(profile);
  const complete = getCompleteMonths(history);
  const [selectedMonth, setSelectedMonth] = useState(complete[complete.length - 1]?.key ?? history[history.length - 1]?.key);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addNotice, setAddNotice] = useState<string | null>(null);

  const selectedPoint = history.find((month) => month.key === selectedMonth) ?? history[history.length - 1];
  const selectedIndex = history.findIndex((month) => month.key === selectedMonth);
  const previousPoint = selectedIndex > 0 ? history[selectedIndex - 1] : undefined;
  const transactions = getTransactionsForMonth(profile, selectedMonth);
  const subscriptions = getSubscriptions(profile);
  const activeSubscriptions = subscriptions.filter((subscription) => subscription.active);
  const subscriptionTotal = activeSubscriptions.reduce((sum, subscription) => sum + subscription.amount, 0);
  const accountMap = new Map(profile.accounts.map((account) => [account.id, account]));

  const priorComplete = complete.filter((month) => month.key < selectedMonth).slice(-3);
  const categoryRows = useMemo(() => {
    return Object.entries(selectedPoint?.byCategory ?? {})
      .map(([category, amount]) => {
        const usual = average(priorComplete.map((month) => month.byCategory[category] ?? 0));
        return {
          category,
          label: CATEGORY_META[category]?.label ?? category,
          color: CATEGORY_META[category]?.color ?? "#818CF8",
          amount,
          usual,
          change: usual > 0 ? (amount - usual) / usual : 0,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [priorComplete, selectedPoint]);

  const donutSlices = useMemo(() => {
    const top = categoryRows.slice(0, 6);
    const rest = categoryRows.slice(6).reduce((sum, row) => sum + row.amount, 0);
    return rest > 0
      ? [...top, { category: "other_group", label: "Everything else", color: "#64748B", amount: rest }]
      : top;
  }, [categoryRows]);

  const spendingChange = previousPoint ? (selectedPoint?.expenses ?? 0) - previousPoint.expenses : 0;
  const barData = history.slice(-6).map((month) => ({
    label: month.isPartial ? `${month.label} MTD` : month.label,
    income: month.income,
    expenses: month.expenses,
    debtPayments: month.debtPayments,
  }));
  const topCategory = categoryRows[0];
  const insights = generateInsights(profile).filter(
    (insight) => insight.category === "spending" || insight.category === "subscriptions",
  );

  const filteredTransactions = transactions.filter((tx) => {
    if (categoryFilter !== "all" && tx.category !== categoryFilter) return false;
    if (!query.trim()) return true;
    const haystack = `${tx.merchant} ${CATEGORY_META[tx.category]?.label ?? tx.category}`.toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
  });
  const visibleTransactions = showAll ? filteredTransactions : filteredTransactions.slice(0, 12);
  const availableCategories = Array.from(
    new Set(transactions.map((transaction) => transaction.category)),
  ).sort();

  return (
    <div className="space-y-4 sm:space-y-5">
      {addNotice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-mint/20 bg-mint/[0.06] px-4 py-2.5 text-[11.5px] text-mint">
          <span>{addNotice}</span>
          <button
            type="button"
            onClick={() => setAddNotice(null)}
            className="text-[10px] text-mint/60 hover:text-mint"
          >
            Dismiss
          </button>
        </div>
      ) : null}

      <AddTransactionDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onAdded={setAddNotice}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <Sparkles className="h-3.5 w-3.5 text-violet-300" />
          {profile.transactions.length} transactions analysed across {profile.accounts.length} accounts
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setAddOpen(true)}>
            <Plus className="h-3.5 w-3.5" /> Add transaction
          </Button>
          {selectedPoint?.isPartial ? <Badge tone="amber">Month to date</Badge> : null}
          <div className="relative">
            <select
              className="field min-w-[168px] appearance-none py-2 pr-9 text-[12px]"
              value={selectedMonth}
              onChange={(event) => {
                setSelectedMonth(event.target.value);
                setShowAll(false);
              }}
              aria-label="Select month"
            >
              {history.map((month) => (
                <option key={month.key} value={month.key}>
                  {monthLabel(month.key, "long")}{month.isPartial ? " (MTD)" : ""}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/35" />
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
            <CircleDollarSign className="h-4 w-4" />
          </div>
          <p className="label mt-3">Total spending</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(selectedPoint?.expenses ?? 0)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {monthLabel(selectedMonth, "long")}
          </p>
        </Card>

        <Card className="p-4">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              spendingChange > 0 ? "bg-coral/10 text-coral" : "bg-mint/10 text-mint",
            )}
          >
            {spendingChange > 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
          </div>
          <p className="label mt-3">Versus previous month</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(Math.abs(spendingChange))}
          </p>
          <p className={cn("mt-1 text-[10.5px]", spendingChange > 0 ? "text-coral" : "text-mint")}>
            {spendingChange > 0 ? "Higher" : "Lower"} by{" "}
            {previousPoint ? formatPercent(Math.abs(spendingChange) / Math.max(1, previousPoint.expenses), 0) : "—"}
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <UtensilsIcon />
          </div>
          <p className="label mt-3">Largest category</p>
          <p className="mt-1 truncate font-display text-[22px] font-semibold tracking-tight text-white">
            {topCategory?.label ?? "—"}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {formatCurrency(topCategory?.amount ?? 0)} ·{" "}
            {formatPercent((topCategory?.amount ?? 0) / Math.max(1, selectedPoint?.expenses ?? 1), 0)} of spending
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
            <Repeat className="h-4 w-4" />
          </div>
          <p className="label mt-3">Subscriptions</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {formatCurrency(subscriptionTotal)}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {activeSubscriptions.length} active · {formatCurrency(subscriptionTotal * 12)} a year
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader title="Where it went" description={`Category split for ${monthLabel(selectedMonth, "long")}.`} />
          <div className="mt-3">
            <SpendingDonut data={donutSlices} total={selectedPoint?.expenses ?? 0} height={224} />
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-7">
          <CardHeader
            title="Month by month"
            description="Income, spending and required debt payments over the last six months."
            action={<Badge tone="neutral">Income vs outflow</Badge>}
          />
          <div className="mt-4">
            <MonthlyBars data={barData} height={248} />
          </div>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-7">
          <CardHeader
            title="Category breakdown"
            description="Compared with your average over the prior three complete months."
            action={<Badge tone="neutral">{categoryRows.length} categories</Badge>}
          />
          <div className="mt-4 space-y-3.5">
            {categoryRows.map((row) => (
              <div key={row.category}>
                <div className="flex items-center gap-2.5">
                  <span className="h-2 w-2 shrink-0 rounded-[3px]" style={{ backgroundColor: row.color }} />
                  <span className="flex-1 text-[12px] text-white/65">{row.label}</span>
                  {row.usual > 0 && Math.abs(row.change) >= 0.12 ? (
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[9px]",
                        row.change > 0 ? "bg-coral/10 text-coral" : "bg-mint/10 text-mint",
                      )}
                    >
                      {row.change > 0 ? "+" : ""}
                      {formatPercent(row.change, 0)} vs usual
                    </span>
                  ) : null}
                  <span className="num w-16 text-right text-[12px] font-medium text-white/85">
                    {formatCurrency(row.amount)}
                  </span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(100, (row.amount / Math.max(1, categoryRows[0]?.amount ?? 1)) * 100)}%`,
                        backgroundColor: row.color,
                      }}
                    />
                  </div>
                  <span className="w-24 shrink-0 text-right text-[9.5px] text-white/25">
                    usual {formatCurrency(row.usual)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 sm:p-6 xl:col-span-5">
          <CardHeader
            title="Subscription tracker"
            description={`${formatCurrency(subscriptionTotal)} recurring each month.`}
            action={<Badge tone="brand">{activeSubscriptions.length} active</Badge>}
          />
          <div className="mt-2 divide-y divide-white/[0.045]">
            {subscriptions.map((subscription) => (
              <div key={subscription.merchant} className="flex items-center gap-3 py-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[10px] font-semibold text-white/60">
                  {subscription.merchant.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-[12px] font-medium", subscription.active ? "text-white/85" : "text-white/35 line-through")}>
                    {subscription.merchant}
                  </p>
                  <p className="text-[10px] text-white/30">
                    {subscription.category} · {subscription.active ? `next ${formatDate(subscription.nextCharge, "short")}` : "Cancelled"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="num text-[11.5px] font-medium text-white/80">
                    {formatCurrency(subscription.amount, { cents: true })}
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      subscription.active
                        ? cancelSubscription(subscription.merchant)
                        : reactivateSubscription(subscription.merchant)
                    }
                    className={cn(
                      "mt-0.5 text-[9.5px] transition",
                      subscription.active
                        ? "text-white/25 hover:text-coral"
                        : "inline-flex items-center gap-1 text-mint hover:text-mint/80",
                    )}
                  >
                    {subscription.active ? "Cancel" : <><Undo2 className="h-2.5 w-2.5" /> Restore</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <InfoNote className="mt-3">
            Cancelling here only updates this tracker. Cancel with the provider to stop the charge. Annual cost:{" "}
            {formatCurrency(subscriptionTotal * 12)}.
          </InfoNote>
        </Card>
      </div>

      {profile.preferences.aiAnalysis ? (
        <div className="grid gap-4 md:grid-cols-2">
          {insights.slice(0, 2).map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      ) : (
        <InfoNote icon={<Sparkles className="h-4 w-4" />}>
          AI spending analysis is paused in your privacy settings. Re-enable it in Settings to see matched recommendations.
        </InfoNote>
      )}

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Transactions"
          description={`${filteredTransactions.length} transactions in ${monthLabel(selectedMonth, "long")}.`}
          action={
            <div className="flex items-center gap-2">
              <div className="relative hidden sm:block">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/30" />
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setShowAll(false);
                  }}
                  placeholder="Search merchants"
                  className="field w-44 py-2 pl-8 text-[11.5px]"
                  aria-label="Search transactions"
                />
              </div>
              <div className="relative">
                <select
                  value={categoryFilter}
                  onChange={(event) => {
                    setCategoryFilter(event.target.value);
                    setShowAll(false);
                  }}
                  className="field w-36 appearance-none py-2 pr-7 text-[11px] capitalize"
                  aria-label="Filter by category"
                >
                  <option value="all">All categories</option>
                  {availableCategories.map((category) => (
                    <option key={category} value={category}>
                      {CATEGORY_META[category]?.label ?? category}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-white/35" />
              </div>
            </div>
          }
        />
        <div className="mt-4 overflow-x-auto">
          {visibleTransactions.length === 0 ? (
            <EmptyState
              icon={<Search className="h-5 w-5" />}
              title="No matching transactions"
              description="Try a different search term, category or month."
              action={
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setQuery("");
                    setCategoryFilter("all");
                  }}
                >
                  Clear filters
                </Button>
              }
            />
          ) : (
            <table className="w-full min-w-[620px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.06] text-[9.5px] uppercase tracking-[0.14em] text-white/30">
                  <th className="pb-2.5 font-medium">Merchant</th>
                  <th className="pb-2.5 font-medium">Category</th>
                  <th className="pb-2.5 font-medium">Account</th>
                  <th className="pb-2.5 font-medium">Date</th>
                  <th className="pb-2.5 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {visibleTransactions.map((tx) => {
                  const account = accountMap.get(tx.accountId);
                  const isIncome = tx.type === "income";
                  return (
                    <tr key={tx.id} className="group transition hover:bg-white/[0.02]">
                      <td className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <CategoryAvatar category={tx.category} className="h-8 w-8" />
                          <div className="min-w-0">
                            <p className="max-w-[200px] truncate text-[12px] font-medium text-white/85">{tx.merchant}</p>
                            {tx.subscription ? (
                              <span className="rounded bg-white/[0.05] px-1 py-0.5 text-[8.5px] text-white/35">Recurring</span>
                            ) : null}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5">
                        <span className="rounded-full border border-white/[0.06] px-2 py-1 text-[9.5px] text-white/40">
                          {CATEGORY_META[tx.category]?.label ?? tx.category}
                        </span>
                      </td>
                      <td className="py-2.5 text-[10.5px] text-white/35">{account?.institution ?? "—"}</td>
                      <td className="py-2.5 text-[10.5px] text-white/35">{formatDate(tx.date, "short")}</td>
                      <td className={cn("num py-2.5 text-right text-[12px] font-semibold", isIncome ? "text-mint" : "text-white/85")}>
                        {isIncome ? "+" : "−"}{formatCurrency(tx.amount, { cents: true })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        {!showAll && filteredTransactions.length > 12 ? (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-3 w-full rounded-xl border border-white/[0.07] py-2 text-[11px] font-medium text-white/50 transition hover:border-white/15 hover:text-white"
          >
            Show all {filteredTransactions.length} transactions
          </button>
        ) : null}
      </Card>
    </div>
  );
}

function UtensilsIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M6 3v8a2 2 0 0 0 2 2h0a2 2 0 0 0 2-2V3M8 13v8M16 3c-1.5 1.5-2 3.5-2 6 0 1.5.5 2.5 2 2.5V21" />
    </svg>
  );
}
