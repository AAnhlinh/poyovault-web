"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Building2,
  Check,
  CreditCard,
  Landmark,
  Link2,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Wallet,
  X,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import {
  accountTypeLabel,
  getCreditCards,
  getDashboardMetrics,
  getDebtAccounts,
  getDepositAccounts,
  getUpcomingPayments,
} from "@/lib/finance/aggregate";
import type { AccountType, LoanKind } from "@/lib/types";
import { formatCurrency, formatPercent, formatRelativeSync } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, EmptyState, InfoNote, Progress, Segmented } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

const INSTITUTIONS = [
  "Chase",
  "Bank of America",
  "Wells Fargo",
  "Ally Bank",
  "American Express",
  "Capital One",
  "Citi",
  "Rocket Mortgage",
  "SoFi",
  "Nelnet",
  "Other institution",
];

const TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: "checking", label: "Checking" },
  { value: "savings", label: "Savings" },
  { value: "credit_card", label: "Credit card" },
  { value: "loan", label: "Loan" },
];

function InstitutionMark({ account }: { account: { logo: string; accent: string } }) {
  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] text-[10px] font-bold tracking-wide"
      style={{ backgroundColor: `${account.accent}18`, color: account.accent }}
    >
      {account.logo}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  caption,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  caption: string;
  icon: typeof Wallet;
  tone: string;
}) {
  return (
    <Card className="p-4">
      <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", tone)}>
        <Icon className="h-4 w-4" strokeWidth={1.9} />
      </div>
      <p className="label mt-3">{label}</p>
      <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">{value}</p>
      <p className="mt-1 text-[10.5px] leading-relaxed text-white/35">{caption}</p>
    </Card>
  );
}

export function AccountsView() {
  const { profile, connectAccount, disconnectAccount } = useFinance();
  const metrics = getDashboardMetrics(profile);
  const deposits = getDepositAccounts(profile);
  const cards = getCreditCards(profile);
  const loans = getDebtAccounts(profile).filter((account) => account.type === "loan");
  const upcoming = getUpcomingPayments(profile);
  const [connectOpen, setConnectOpen] = useState(false);
  const [disconnectId, setDisconnectId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [step, setStep] = useState<"institution" | "details">("institution");
  const [institution, setInstitution] = useState(INSTITUTIONS[0]);
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [accountName, setAccountName] = useState("");
  const [balance, setBalance] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [minimumPayment, setMinimumPayment] = useState("");
  const [dueDay, setDueDay] = useState("15");
  const [loanKind, setLoanKind] = useState<LoanKind>("auto");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkingTotal = deposits.filter((a) => a.type === "checking").reduce((sum, a) => sum + a.balance, 0);
  const savingsTotal = deposits.filter((a) => a.type === "savings").reduce((sum, a) => sum + a.balance, 0);
  const disconnectAccountData = useMemo(
    () => profile.accounts.find((account) => account.id === disconnectId),
    [disconnectId, profile.accounts],
  );

  function resetForm() {
    setStep("institution");
    setInstitution(INSTITUTIONS[0]);
    setAccountType("checking");
    setAccountName("");
    setBalance("");
    setApr("");
    setCreditLimit("");
    setMinimumPayment("");
    setDueDay("15");
    setLoanKind("auto");
    setConsent(false);
    setError(null);
  }

  function closeConnect() {
    setConnectOpen(false);
    resetForm();
  }

  function submitConnection() {
    setError(null);
    if (!consent) {
      setError("Authorize read-only access to continue.");
      return;
    }
    const result = connectAccount({
      institution,
      name: accountName || `${accountType === "credit_card" ? "Credit Card" : accountType === "loan" ? "Loan" : "Account"} ••`,
      type: accountType,
      balance: Number(balance || 0),
      apr: apr ? Number(apr) / 100 : accountType === "credit_card" ? 0.2299 : undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      minimumPayment: minimumPayment ? Number(minimumPayment) : undefined,
      dueDay: dueDay ? Number(dueDay) : undefined,
      loanKind: accountType === "loan" ? loanKind : undefined,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setNotice(result.message);
    closeConnect();
  }

  const netPosition = checkingTotal + savingsTotal - metrics.totalDebt;

  return (
    <div className="space-y-4 sm:space-y-5">
      {notice ? (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-mint/20 bg-mint/[0.06] px-4 py-3 text-[12px] text-mint">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {notice}
          </span>
          <button type="button" onClick={() => setNotice(null)} aria-label="Dismiss">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <ShieldCheck className="h-3.5 w-3.5 text-mint" />
          Read-only connections · {profile.accounts.length} accounts synced
        </div>
        <Button onClick={() => setConnectOpen(true)}>
          <Plus className="h-4 w-4" /> Connect account
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Cash on hand"
          value={formatCurrency(checkingTotal + savingsTotal)}
          caption={`${formatCurrency(checkingTotal)} checking · ${formatCurrency(savingsTotal)} savings`}
          icon={Wallet}
          tone="bg-mint/10 text-mint"
        />
        <SummaryCard
          label="Credit card debt"
          value={formatCurrency(metrics.creditCardBalance)}
          caption={`${formatPercent(metrics.utilization, 0)} of ${formatCurrency(metrics.creditLimit)} used`}
          icon={CreditCard}
          tone="bg-amber/10 text-amber"
        />
        <SummaryCard
          label="Loans & mortgage"
          value={formatCurrency(metrics.loanBalance)}
          caption={`${formatCurrency(metrics.monthlyDebtPayments - cards.reduce((sum, card) => sum + (card.minimumPayment ?? 0), 0))} required monthly`}
          icon={Landmark}
          tone="bg-coral/10 text-coral"
        />
        <SummaryCard
          label="Net position"
          value={formatCurrency(netPosition)}
          caption="Cash and savings minus connected debt"
          icon={ArrowUpRight}
          tone="bg-violet-500/12 text-violet-300"
        />
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Bank accounts"
          description="Checking and savings across your linked institutions."
          action={<Badge tone="mint" dot>{deposits.length} linked</Badge>}
        />
        {deposits.length === 0 ? (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="No deposit accounts connected"
            description="Connect a checking or savings account to build your financial picture."
            action={<Button size="sm" onClick={() => setConnectOpen(true)}>Connect account</Button>}
          />
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {deposits.map((account) => (
              <div
                key={account.id}
                className="group relative overflow-hidden rounded-lg border border-white/[0.07] bg-white/[0.02] p-4 transition hover:border-white/[0.14] hover:bg-white/[0.035]"
              >
                <div className="flex items-start justify-between">
                  <InstitutionMark account={account} />
                  <button
                    type="button"
                    onClick={() => setDisconnectId(account.id)}
                    className="rounded-lg p-1.5 text-white/20 opacity-0 transition hover:bg-white/[0.06] hover:text-coral group-hover:opacity-100"
                    aria-label={`Disconnect ${account.institution} ${account.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="mt-3 text-[11px] text-white/40">
                  {account.institution} · {accountTypeLabel(account)}
                </p>
                <p className="text-[13px] font-medium text-white/85">{account.name}</p>
                <p className="num mt-2.5 font-display text-[24px] font-semibold tracking-tight text-white">
                  {formatCurrency(account.balance)}
                </p>
                <div className="mt-2 flex items-center justify-between text-[10px] text-white/30">
                  <span>•••• {account.mask}</span>
                  {account.apr ? <span>{formatPercent(account.apr, 2)} APY</span> : <span>No fees</span>}
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[9.5px] text-white/25">
                  <RefreshCw className="h-2.5 w-2.5" /> Synced {formatRelativeSync(account.lastSyncedAt)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Credit cards"
          description="Revolving balances, limits and required payments."
          action={<Badge tone={metrics.utilization > 0.3 ? "amber" : "mint"}>{formatPercent(metrics.utilization, 0)} utilized</Badge>}
        />
        <div className="mt-3 divide-y divide-white/[0.05]">
          {cards.map((card) => {
            const utilization = card.creditLimit ? card.balance / card.creditLimit : 0;
            const payment = upcoming.find((entry) => entry.accountId === card.id);
            return (
              <div key={card.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <InstitutionMark account={card} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white/85">{card.name}</p>
                    <p className="text-[10.5px] text-white/35">
                      {card.institution} · •••• {card.mask}
                    </p>
                  </div>
                </div>
                <div className="grid min-w-0 flex-[1.6] grid-cols-3 gap-3 text-[10.5px]">
                  <div>
                    <p className="text-white/30">Balance</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatCurrency(card.balance)}</p>
                    <Progress
                      value={utilization * 100}
                      tone={utilization > 0.3 ? "amber" : "mint"}
                      size="sm"
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <p className="text-white/30">APR</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatPercent(card.apr ?? 0, 2)}</p>
                    <p className="mt-0.5 text-[9.5px] text-white/25">{formatCurrency(card.creditLimit ?? 0)} limit</p>
                  </div>
                  <div>
                    <p className="text-white/30">Next payment</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatCurrency(card.minimumPayment ?? 0)}</p>
                    <p className={cn("mt-0.5 text-[9.5px]", payment && payment.daysAway <= 7 ? "text-amber" : "text-white/25")}>
                      {payment ? `Due in ${payment.daysAway} days` : "No due date"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 sm:justify-end">
                  <Link href="/debt" className="text-[10.5px] font-medium text-violet-300 hover:text-violet-200">
                    Payoff plan
                  </Link>
                  <button
                    type="button"
                    onClick={() => setDisconnectId(card.id)}
                    className="rounded-lg p-2 text-white/25 transition hover:bg-white/[0.05] hover:text-coral"
                    aria-label={`Disconnect ${card.name}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
          {cards.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/35">No credit cards connected.</p>
          ) : null}
        </div>
      </Card>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Loans & mortgage"
          description="Balances, rates and remaining terms."
          action={<Link href="/debt" className="text-[10.5px] text-violet-300 hover:text-violet-200">Debt manager</Link>}
        />
        <div className="mt-3 divide-y divide-white/[0.05]">
          {loans.map((loan) => {
            const payment = upcoming.find((entry) => entry.accountId === loan.id);
            const repaid =
              loan.originalBalance && loan.originalBalance > 0
                ? Math.max(0, Math.min(1, (loan.originalBalance - loan.balance) / loan.originalBalance))
                : null;
            return (
              <div key={loan.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <InstitutionMark account={loan} />
                  <div className="min-w-0">
                    <p className="truncate text-[12.5px] font-medium text-white/85">{loan.name}</p>
                    <p className="text-[10.5px] text-white/35">
                      {loan.institution} · {accountTypeLabel(loan)} · •••• {loan.mask}
                    </p>
                  </div>
                </div>
                <div className="grid flex-[1.8] grid-cols-2 gap-3 text-[10.5px] sm:grid-cols-4">
                  <div>
                    <p className="text-white/30">Balance</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatCurrency(loan.balance)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Rate</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatPercent(loan.apr ?? 0, 2)}</p>
                  </div>
                  <div>
                    <p className="text-white/30">Monthly</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">{formatCurrency(loan.minimumPayment ?? 0)}</p>
                    <p className="mt-0.5 text-[9.5px] text-white/25">
                      {payment ? `Due in ${payment.daysAway}d` : "Monthly"}
                    </p>
                  </div>
                  <div>
                    <p className="text-white/30">Remaining</p>
                    <p className="num mt-0.5 text-[12px] font-semibold text-white">
                      {loan.remainingMonths ? `${Math.floor(loan.remainingMonths / 12)}y ${loan.remainingMonths % 12}m` : "—"}
                    </p>
                  </div>
                </div>
                <div className="w-full sm:w-28">
                  {repaid !== null ? (
                    <>
                      <Progress value={repaid * 100} tone="brand" size="sm" />
                      <p className="mt-1 text-[9.5px] text-white/30">{formatPercent(repaid, 0)} repaid</p>
                    </>
                  ) : (
                    <span className="text-[10px] text-white/25">No original balance</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setDisconnectId(loan.id)}
                  className="self-end rounded-lg p-2 text-white/25 transition hover:bg-white/[0.05] hover:text-coral sm:self-auto"
                  aria-label={`Disconnect ${loan.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          {loans.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/35">No loans connected.</p>
          ) : null}
        </div>
      </Card>

      <InfoNote icon={<ShieldCheck className="h-4 w-4" />} className="border-mint/10">
        In a production build, PoyoVault would use a permissioned account-aggregation provider. Credentials are never shared with PoyoVault, access is read-only, and every connection can be revoked here or at your bank. This prototype uses simulated data and never requests real banking credentials.
      </InfoNote>

      {/* Connect account modal */}
      <Modal
        open={connectOpen}
        onClose={closeConnect}
        title={step === "institution" ? "Connect an account" : "Account details"}
        description={
          step === "institution"
            ? "Choose where your account is held. This is a simulated connection — no credentials are requested."
            : "Add the balances you want PoyoVault to work with. You can change or disconnect this later."
        }
        footer={
          step === "institution" ? (
            <>
              <Button variant="ghost" onClick={closeConnect}>Cancel</Button>
              <Button onClick={() => setStep("details")}>Continue</Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={() => setStep("institution")}>Back</Button>
              <Button onClick={submitConnection} disabled={!consent}>Connect account</Button>
            </>
          )
        }
      >
        {step === "institution" ? (
          <div className="space-y-4">
            <div>
              <label className="field-label" htmlFor="institution">Institution</label>
              <select
                id="institution"
                className="field"
                value={institution}
                onChange={(event) => setInstitution(event.target.value)}
              >
                {INSTITUTIONS.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>
            <div>
              <p className="field-label">Account type</p>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setAccountType(option.value)}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left text-[12px] transition",
                      accountType === option.value
                        ? "border-violet-400/40 bg-violet-500/[0.12] text-white"
                        : "border-white/[0.08] text-white/50 hover:border-white/20 hover:text-white/80",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-900 accent-violet-500"
              />
              <span className="text-[11px] leading-relaxed text-white/45">
                I authorize PoyoVault to read balances, transactions and account details for this account. I understand this is a simulated connection for the prototype and that I can disconnect at any time.
              </span>
            </label>
            <div className="flex items-center gap-2 text-[10px] text-white/25">
              <Link2 className="h-3 w-3" /> Read-only · encrypted · revocable
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
              <Building2 className="h-4 w-4 text-violet-300" />
              <div>
                <p className="text-[12px] font-medium text-white/85">{institution}</p>
                <p className="text-[10px] capitalize text-white/35">{accountType.replace("_", " ")}</p>
              </div>
            </div>
            <div>
              <label className="field-label" htmlFor="accountName">Account name</label>
              <input
                id="accountName"
                className="field"
                placeholder={accountType === "credit_card" ? "Freedom Unlimited" : accountType === "loan" ? "Auto loan" : "Everyday checking"}
                value={accountName}
                onChange={(event) => setAccountName(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="balance">
                {accountType === "credit_card" || accountType === "loan" ? "Outstanding balance" : "Current balance"}
              </label>
              <input
                id="balance"
                className="field"
                inputMode="decimal"
                placeholder="0.00"
                value={balance}
                onChange={(event) => setBalance(event.target.value)}
              />
            </div>
            {accountType === "credit_card" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="limit">Credit limit</label>
                  <input id="limit" className="field" inputMode="decimal" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="apr">APR (%)</label>
                  <input id="apr" className="field" inputMode="decimal" placeholder="22.99" value={apr} onChange={(e) => setApr(e.target.value)} />
                </div>
              </div>
            ) : null}
            {accountType === "loan" ? (
              <div className="space-y-3">
                <div>
                  <label className="field-label" htmlFor="loanKind">Loan type</label>
                  <select id="loanKind" className="field" value={loanKind} onChange={(e) => setLoanKind(e.target.value as LoanKind)}>
                    <option value="mortgage">Mortgage</option>
                    <option value="auto">Auto loan</option>
                    <option value="student">Student loan</option>
                    <option value="personal">Personal loan</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="field-label" htmlFor="aprLoan">APR (%)</label>
                    <input id="aprLoan" className="field" inputMode="decimal" placeholder="6.2" value={apr} onChange={(e) => setApr(e.target.value)} />
                  </div>
                  <div>
                    <label className="field-label" htmlFor="minPayment">Monthly payment</label>
                    <input id="minPayment" className="field" inputMode="decimal" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
                  </div>
                </div>
              </div>
            ) : null}
            {accountType === "credit_card" ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="field-label" htmlFor="minPaymentCard">Minimum payment</label>
                  <input id="minPaymentCard" className="field" inputMode="decimal" value={minimumPayment} onChange={(e) => setMinimumPayment(e.target.value)} />
                </div>
                <div>
                  <label className="field-label" htmlFor="dueDay">Due day (1–28)</label>
                  <input id="dueDay" className="field" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
                </div>
              </div>
            ) : accountType === "loan" ? (
              <div>
                <label className="field-label" htmlFor="dueDay">Due day (1–28)</label>
                <input id="dueDay" className="field" inputMode="numeric" value={dueDay} onChange={(e) => setDueDay(e.target.value)} />
              </div>
            ) : null}
            {error ? <p className="text-[11px] text-coral">{error}</p> : null}
            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-white/20 bg-ink-900 accent-violet-500"
              />
              <span className="text-[11px] leading-relaxed text-white/45">
                I confirm these details and authorize read-only access. PoyoVault will use them to calculate balances, spending and recommendations.
              </span>
            </label>
          </div>
        )}
      </Modal>

      {/* Disconnect confirmation */}
      <Modal
        open={Boolean(disconnectId)}
        onClose={() => setDisconnectId(null)}
        title="Disconnect this account?"
        description="PoyoVault will stop syncing this account and remove its transactions from your dashboard."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDisconnectId(null)}>Keep connected</Button>
            <Button
              variant="danger"
              onClick={() => {
                if (disconnectId) {
                  disconnectAccount(disconnectId);
                  setNotice("Account disconnected. Its transactions were removed.");
                }
                setDisconnectId(null);
              }}
            >
              Disconnect
            </Button>
          </>
        }
      >
        {disconnectAccountData ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3.5">
            <InstitutionMark account={disconnectAccountData} />
            <div>
              <p className="text-[12.5px] font-medium text-white/85">{disconnectAccountData.name}</p>
              <p className="text-[10.5px] text-white/35">
                {disconnectAccountData.institution} · •••• {disconnectAccountData.mask} · {formatCurrency(disconnectAccountData.balance)}
              </p>
            </div>
          </div>
        ) : null}
        <InfoNote className="mt-3" icon={<ShieldCheck className="h-4 w-4" />}>
          In production, disconnecting also revokes the aggregation token with your bank. Your historical data at the institution is never affected.
        </InfoNote>
      </Modal>
    </div>
  );
}
