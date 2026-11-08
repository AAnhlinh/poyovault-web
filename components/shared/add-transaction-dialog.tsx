"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { CATEGORY_META } from "@/lib/finance/aggregate";
import type { TransactionCategory, TransactionType } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

function today() {
  return new Date().toISOString().slice(0, 10);
}

const EXPENSE_CATEGORIES = Object.entries(CATEGORY_META)
  .filter(([key]) => key !== "income")
  .map(([value, meta]) => ({ value: value as TransactionCategory, label: meta.label }));

export function AddTransactionDialog({
  open,
  onClose,
  onAdded,
}: {
  open: boolean;
  onClose: () => void;
  onAdded?: (message: string) => void;
}) {
  const { profile, addTransaction } = useFinance();
  const accounts = profile.accounts;
  const [type, setType] = useState<TransactionType>("expense");
  const [accountId, setAccountId] = useState("");
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState<TransactionCategory>("groceries");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setType("expense");
    setAccountId(
      accounts.find((account) => account.type === "checking")?.id ?? accounts[0]?.id ?? "",
    );
    setMerchant("");
    setCategory("groceries");
    setAmount("");
    setDate(today());
    setError(null);
  }, [open, accounts]);

  function submit() {
    setError(null);
    const result = addTransaction({
      accountId,
      merchant,
      category: type === "income" ? "income" : category,
      amount: Number(amount),
      date,
      type,
    });
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onAdded?.(result.message);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a transaction"
      description="Record income or spending so balances, budgets and Poyo's advice stay current."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!accounts.length || !accountId}>
            Add transaction
          </Button>
        </>
      }
    >
      {accounts.length === 0 ? (
        <p className="text-[12px] leading-relaxed text-white/45">
          You need an account before you can add activity.{" "}
          <Link href="/accounts" className="text-violet-300 hover:text-violet-200">
            Connect an account
          </Link>{" "}
          first.
        </p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["expense", "income"] as const).map((option) => {
              const active = type === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => setType(option)}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border py-2.5 text-[12px] font-medium capitalize transition",
                    active
                      ? "border-violet-400/40 bg-violet-500/[0.12] text-white"
                      : "border-white/[0.08] text-white/45 hover:border-white/20 hover:text-white/75",
                  )}
                >
                  {option === "expense" ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownLeft className="h-3.5 w-3.5" />
                  )}
                  {option}
                </button>
              );
            })}
          </div>

          <div>
            <label className="field-label" htmlFor="tx-account">
              Account
            </label>
            <select
              id="tx-account"
              className="field"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
            >
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.institution} · {account.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="tx-merchant">
                Description
              </label>
              <input
                id="tx-merchant"
                className="field"
                placeholder={type === "income" ? "Paycheck" : "Whole Foods"}
                value={merchant}
                onChange={(event) => setMerchant(event.target.value)}
              />
            </div>
            <div>
              <label className="field-label" htmlFor="tx-amount">
                Amount
              </label>
              <input
                id="tx-amount"
                className="field"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="tx-date">
                Date
              </label>
              <input
                id="tx-date"
                type="date"
                className="field"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
            </div>
            {type === "expense" ? (
              <div>
                <label className="field-label" htmlFor="tx-category">
                  Category
                </label>
                <select
                  id="tx-category"
                  className="field"
                  value={category}
                  onChange={(event) => setCategory(event.target.value as TransactionCategory)}
                >
                  {EXPENSE_CATEGORIES.map((entry) => (
                    <option key={entry.value} value={entry.value}>
                      {entry.label}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <p className="field-label">Category</p>
                <div className="field flex items-center text-white/40">Income</div>
              </div>
            )}
          </div>

          <p className="text-[10px] leading-relaxed text-white/25">
            Adding a transaction updates the account balance too — spending reduces cash or increases
            a card balance, income does the reverse.
          </p>

          {error ? <p className="text-[11px] text-coral">{error}</p> : null}
        </div>
      )}
    </Modal>
  );
}
