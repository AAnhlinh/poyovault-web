"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Bookmark,
  Check,
  Clock,
  Gift,
  Info,
  ShieldOff,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { useFinance } from "@/components/providers/finance-provider";
import { getRewardsSummary, type MatchedOffer } from "@/lib/finance/rewards";
import { daysUntil, formatCurrency, formatDate, formatPercent } from "@/lib/finance/format";
import { Badge, Button, Card, CardHeader, InfoNote, Segmented } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";

type OfferFilter = "for-you" | "all" | "sponsored";

export function RewardsView() {
  const { profile, updatePreferences } = useFinance();
  const rewards = getRewardsSummary(profile);
  const [filter, setFilter] = useState<OfferFilter>(rewards.personalized ? "for-you" : "all");
  const [selected, setSelected] = useState<MatchedOffer | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [toast, setToast] = useState<string | null>(null);

  const effectiveFilter: OfferFilter =
    !rewards.personalized && filter === "for-you" ? "all" : filter;
  const offers = rewards.offers.filter((offer) => {
    if (effectiveFilter === "for-you") return offer.categorySpend > 0;
    if (effectiveFilter === "sponsored") return offer.sponsored;
    return true;
  });

  const topCategories = rewards.categorySpend.slice(0, 4);

  function togglePersonalization(next: boolean) {
    updatePreferences({ personalizedOffers: next });
    setFilter(next ? "for-you" : "all");
    setToast(
      next
        ? "Personalized matching is on. Offers now use your spending categories."
        : "Personalized matching is off. Offers are limited to general member benefits.",
    );
    window.setTimeout(() => setToast(null), 4500);
  }

  function toggleSaved(offer: MatchedOffer) {
    setSaved((current) =>
      current.includes(offer.id) ? current.filter((id) => id !== offer.id) : [...current, offer.id],
    );
    const isSaved = saved.includes(offer.id);
    setToast(isSaved ? `${offer.partner} removed from saved offers.` : `${offer.partner} saved for later.`);
    window.setTimeout(() => setToast(null), 3500);
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      {toast ? (
        <div className="flex items-center justify-between rounded-2xl border border-mint/20 bg-mint/[0.06] px-4 py-3 text-[11.5px] text-mint">
          <span className="flex items-center gap-2">
            <Check className="h-4 w-4" /> {toast}
          </span>
          <button type="button" onClick={() => setToast(null)} className="text-[10px] text-mint/60 hover:text-mint">
            Dismiss
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] text-white/35">
          <Gift className="h-3.5 w-3.5 text-violet-300" />
          {offers.length} partner offers · sponsored offers are always labelled
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2">
          <div>
            <p className="text-[10.5px] font-medium text-white/70">Personalized matching</p>
            <p className="text-[9px] text-white/30">Uses spending categories only</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={rewards.personalized}
            aria-label="Personalized offer matching"
            onClick={() => togglePersonalization(!rewards.personalized)}
            className={cn(
              "relative h-5.5 w-10 shrink-0 rounded-full border transition-colors",
              rewards.personalized
                ? "border-violet-400/40 bg-gradient-to-r from-violet-500 to-brand-500"
                : "border-white/10 bg-white/10",
            )}
            style={{ height: 22, width: 40 }}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform",
                rewards.personalized ? "translate-x-[21px]" : "translate-x-0.5",
              )}
            />
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint/10 text-mint">
            <Tag className="h-4 w-4" />
          </div>
          <p className="label mt-3">Potential first-year value</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {rewards.personalized ? formatCurrency(rewards.potentialAnnual) : "—"}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {rewards.personalized
              ? `${formatCurrency(rewards.potentialMonthly)}/mo equivalent · one-time credits counted once`
              : "Enable matching to estimate"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/12 text-violet-300">
            <Sparkles className="h-4 w-4" />
          </div>
          <p className="label mt-3">Matched to you</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {rewards.personalized ? rewards.matchedCount : 0}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">
            {rewards.personalized ? "Offers tied to categories you already spend on" : "Personalization is switched off"}
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500/10 text-brand-300">
            <Users className="h-4 w-4" />
          </div>
          <p className="label mt-3">Member benefits</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">
            {rewards.offers.filter((offer) => !offer.sponsored).length}
          </p>
          <p className="mt-1 text-[10.5px] text-white/35">Independent of partner sponsorships</p>
        </Card>
        <Card className="p-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber/10 text-amber">
            <Gift className="h-4 w-4" />
          </div>
          <p className="label mt-3">Saved offers</p>
          <p className="num mt-1 font-display text-[22px] font-semibold tracking-tight text-white">{saved.length}</p>
          <p className="mt-1 text-[10.5px] text-white/35">Kept in this session</p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-12">
        <Card className="p-5 sm:p-6 xl:col-span-8">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardHeader
              title={rewards.personalized ? "Offers matched to your spending" : "Member benefits"}
              description={
                rewards.personalized
                  ? "Ranked by the savings they could create on spending you already have — not by partner spend."
                  : "General benefits available to PoyoVault members. No spending data is used."
              }
            />
            <Segmented
              size="sm"
              value={effectiveFilter}
              onChange={(value) => setFilter(value)}
              options={[
                ...(rewards.personalized ? [{ value: "for-you" as const, label: "For you" }] : []),
                { value: "all" as const, label: "All" },
                { value: "sponsored" as const, label: "Sponsored" },
              ]}
            />
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {offers.map((offer) => {
              const days = daysUntil(offer.expiresAt);
              const isSaved = saved.includes(offer.id);
              return (
                <article
                  key={offer.id}
                  className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 transition hover:border-white/[0.15]"
                >
                  <div
                    className="absolute inset-x-0 top-0 h-0.5 opacity-70"
                    style={{ background: `linear-gradient(90deg, ${offer.accent}, transparent)` }}
                  />
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] text-[10px] font-bold"
                        style={{ backgroundColor: `${offer.accent}18`, color: offer.accent }}
                      >
                        {offer.partner.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-[12.5px] font-medium text-white/85">{offer.partner}</p>
                        <p className="text-[9.5px] uppercase tracking-wide text-white/25">
                          {offer.sponsored ? "Sponsored partner" : "Member benefit"}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleSaved(offer)}
                      className={cn(
                        "rounded-lg p-1.5 transition",
                        isSaved ? "bg-violet-500/15 text-violet-300" : "text-white/25 hover:bg-white/[0.06] hover:text-white/70",
                      )}
                      aria-label={isSaved ? `Remove ${offer.partner} from saved offers` : `Save ${offer.partner} offer`}
                      aria-pressed={isSaved}
                    >
                      <Bookmark className={cn("h-3.5 w-3.5", isSaved && "fill-current")} />
                    </button>
                  </div>

                  <h3 className="mt-3 font-display text-[13.5px] font-semibold leading-snug tracking-tight text-white">
                    {offer.tagline}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[10.5px] leading-relaxed text-white/40">{offer.description}</p>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className="rounded-lg border px-2 py-1 text-[10.5px] font-semibold"
                      style={{ borderColor: `${offer.accent}35`, backgroundColor: `${offer.accent}10`, color: offer.accent }}
                    >
                      {offer.discount}
                    </span>
                    {rewards.personalized && offer.estimatedMonthlySavings > 0 ? (
                      <span className="rounded-lg bg-mint/10 px-2 py-1 text-[10px] font-medium text-mint">
                        {offer.savingsCadence === "monthly"
                          ? `~${formatCurrency(offer.estimatedMonthlySavings)}/mo`
                          : offer.savingsCadence === "yearly"
                            ? `~${formatCurrency(offer.grossSavings)}/yr`
                            : `~${formatCurrency(offer.grossSavings)} once`}
                      </span>
                    ) : null}
                    <span className="ml-auto flex items-center gap-1 text-[9px] text-white/25">
                      <Clock className="h-2.5 w-2.5" /> {days > 0 ? `${days}d left` : "Expired"}
                    </span>
                  </div>

                  {rewards.personalized && offer.estimatedMonthlySavings > 0 ? (
                    <p className="mt-2.5 line-clamp-2 text-[9.5px] leading-relaxed text-white/30">{offer.rationale}</p>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => setSelected(offer)}
                    className="mt-3 flex w-full items-center justify-center rounded-xl border border-white/[0.07] py-2 text-[10.5px] font-medium text-white/55 transition hover:border-white/15 hover:text-white"
                  >
                    Offer details
                  </button>
                </article>
              );
            })}
          </div>
        </Card>

        <div className="space-y-4 xl:col-span-4">
          <Card className="p-5">
            <CardHeader
              title={rewards.personalized ? "What matching uses" : "Personalization is off"}
              description={
                rewards.personalized
                  ? "Average monthly spend by category over the last three complete months."
                  : "No spending data is used to rank offers. You can enable matching any time."
              }
              action={<ShieldOff className="h-4 w-4 text-white/25" />}
            />
            {rewards.personalized ? (
              <div className="mt-3 space-y-2.5">
                {topCategories.map((category) => (
                  <div key={category.category}>
                    <div className="flex items-center justify-between text-[10.5px]">
                      <span className="text-white/45">{category.label}</span>
                      <span className="num text-white/70">{formatCurrency(category.amount)}/mo</span>
                    </div>
                    <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-violet-400 to-brand-400"
                        style={{ width: `${Math.max(8, (category.amount / Math.max(1, topCategories[0]?.amount ?? 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-[11px] leading-relaxed text-white/35">
                Turning matching off does not change your accounts, goals or AI recommendations. It only stops PoyoVault
                from ranking partner offers against your spending.
              </p>
            )}
            <Link href="/settings" className="mt-3 inline-flex items-center gap-1 text-[10.5px] text-violet-300 hover:text-violet-200">
              Privacy controls
            </Link>
          </Card>

          <Card className="p-5">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-brand-300" />
              <p className="text-[12px] font-medium text-white/80">How sponsored offers work</p>
            </div>
            <p className="mt-2 text-[10.5px] leading-relaxed text-white/40">
              Partners may pay PoyoVault for placement. Sponsored offers carry a label, and sponsorship never changes
              AI recommendations, debt advice or which offer we estimate as valuable. We estimate value only from
              spending you already have.
            </p>
            <p className="mt-2 text-[10px] leading-relaxed text-white/25">
              Using an offer is optional. If a discount would require new spending to unlock, it is not counted as
              savings.
            </p>
          </Card>

          <InfoNote icon={<Sparkles className="h-4 w-4" />}>
            Offers are simulated for this prototype and do not represent live partner agreements. Estimated savings are
            illustrative and capped by each offer's terms. One-time credits are counted once in the first-year total;
            they are not promised monthly discounts.
          </InfoNote>
        </div>
      </div>

      <Card className="p-5 sm:p-6">
        <CardHeader
          title="Rewards philosophy"
          description="What PoyoVault will and will not promote."
        />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            {
              title: "Discount what you already buy",
              body: "Grocery, transport and subscription offers are matched to existing spending, so a discount reduces a cost rather than adding one.",
            },
            {
              title: "No debt-driven offers",
              body: "PoyoVault does not surface new credit, balance transfers or buy-now-pay-later offers as rewards. Those are financial decisions, not perks.",
            },
            {
              title: "You own the data switch",
              body: "Personalized matching can be turned off without losing your accounts or AI analysis. Sponsored placement is always disclosed.",
            },
          ].map((item) => (
            <div key={item.title} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <p className="text-[12px] font-medium text-white/80">{item.title}</p>
              <p className="mt-1.5 text-[10.5px] leading-relaxed text-white/40">{item.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected?.partner ?? "Partner offer"}
        description={selected?.tagline}
        footer={
          selected ? (
            <>
              <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
              <Button
                onClick={() => {
                  toggleSaved(selected);
                  setSelected(null);
                }}
              >
                <Bookmark className="h-3.5 w-3.5" />
                {saved.includes(selected.id) ? "Remove from saved" : "Save this offer"}
              </Button>
            </>
          ) : null
        }
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="rounded-lg border px-2.5 py-1 text-[11px] font-semibold"
                style={{ borderColor: `${selected.accent}35`, backgroundColor: `${selected.accent}10`, color: selected.accent }}
              >
                {selected.discount}
              </span>
              <Badge tone={selected.sponsored ? "violet" : "mint"}>
                {selected.sponsored ? "Sponsored partner" : "Member benefit"}
              </Badge>
              <span className="text-[10px] text-white/30">Expires {formatDate(selected.expiresAt)}</span>
            </div>
            <p className="text-[12px] leading-relaxed text-white/55">{selected.description}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="label">Eligibility</p>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/50">{selected.eligibility}</p>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-white/[0.025] p-3">
                <p className="label">Estimated value</p>
                <p className="num mt-1.5 text-[15px] font-semibold text-mint">
                  {!rewards.personalized
                    ? "Personalization off"
                    : selected.savingsCadence === "monthly"
                      ? `${formatCurrency(selected.estimatedMonthlySavings)}/mo`
                      : selected.savingsCadence === "yearly"
                        ? `${formatCurrency(selected.grossSavings)}/yr (${formatCurrency(selected.estimatedMonthlySavings)}/mo equivalent)`
                        : `${formatCurrency(selected.grossSavings)} once (${formatCurrency(selected.estimatedMonthlySavings)}/mo equivalent)`}
                </p>
                <p className="mt-1 text-[9.5px] leading-relaxed text-white/30">{selected.rationale}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3.5">
              <p className="label">Why you are seeing this</p>
              <p className="mt-1.5 text-[11px] leading-relaxed text-white/45">
                {rewards.personalized
                  ? selected.categorySpend > 0
                    ? selected.savingsCadence === "monthly"
                      ? `Your average ${selected.category} spend is ${formatCurrency(selected.categorySpend)} a month. This offer reduces spending you already have; it is not a reason to add a purchase.`
                      : `You already spend about ${formatCurrency(selected.categorySpend)} a month on ${selected.category}. This is a limited-use offer for a purchase you were already planning — not a reason to spend more.`
                    : "You do not have material spending in this category, so this offer is unlikely to produce a real saving. It is shown for completeness."
                  : "Personalized matching is off, so this offer is shown to all members rather than being selected from your spending."}
              </p>
            </div>
            <InfoNote>
              PoyoVault does not sell your financial data. Sponsor relationships are disclosed on every sponsored offer
              and never influence AI recommendations or debt guidance.
            </InfoNote>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
