import Link from "next/link";
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Card                                                                */
/* ------------------------------------------------------------------ */
export function Card({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("surface", className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  description,
  action,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[16px] font-semibold tracking-tight text-white">{title}</h2>
        {description ? (
          <p className="mt-1 text-[12px] leading-relaxed text-white/45">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */
type ButtonVariant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type ButtonSize = "sm" | "md" | "lg";

export function buttonClass(
  variant: ButtonVariant = "primary",
  size: ButtonSize = "md",
  className?: string,
) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-md font-medium transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-ink-950 disabled:cursor-not-allowed disabled:opacity-50",
    size === "sm" && "h-8 px-3 text-xs",
    size === "md" && "h-10 px-4 text-[13px]",
    size === "lg" && "h-11 px-5 text-sm",
    variant === "primary" &&
      "bg-violet-400 text-ink-950 hover:bg-violet-300 active:bg-violet-500 active:text-white",
    variant === "secondary" &&
      "border border-white/[0.08] bg-white/[0.035] text-white/80 hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-white",
    variant === "ghost" && "text-white/65 hover:bg-white/[0.06] hover:text-white",
    variant === "outline" &&
      "border border-white/[0.14] bg-transparent text-white/80 hover:border-violet-300/40 hover:bg-violet-500/[0.06] hover:text-white",
    variant === "danger" && "bg-coral/15 text-coral hover:bg-coral/25",
    className,
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button className={buttonClass(variant, size, className)} {...props}>
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */
type BadgeTone = "neutral" | "mint" | "violet" | "blue" | "brand" | "amber" | "coral" | "lime";

const badgeTones: Record<BadgeTone, string> = {
  neutral: "border-white/10 bg-white/[0.06] text-white/65",
  mint: "border-mint/20 bg-mint/10 text-mint",
  violet: "border-violet-400/25 bg-violet-500/15 text-violet-300",
  blue: "border-brand-400/25 bg-brand-500/12 text-brand-300",
  brand: "border-brand-400/25 bg-brand-500/12 text-brand-300",
  amber: "border-amber/25 bg-amber/10 text-amber",
  coral: "border-coral/25 bg-coral/10 text-coral",
  lime: "border-lime/25 bg-lime/10 text-lime",
};

export function Badge({
  children,
  tone = "neutral",
  dot,
  className,
}: {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold tracking-wide",
        badgeTones[tone],
        className,
      )}
    >
      {dot ? <span className="h-1.5 w-1.5 rounded-full bg-current" /> : null}
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress                                                            */
/* ------------------------------------------------------------------ */
export function Progress({
  value,
  tone = "violet",
  size = "md",
  className,
  label,
}: {
  value: number;
  tone?: "violet" | "mint" | "brand" | "amber" | "coral" | "lime";
  size?: "sm" | "md" | "lg";
  className?: string;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  const tones = {
    violet: "bg-gradient-to-r from-violet-400 to-violet-500",
    mint: "bg-gradient-to-r from-mint to-emerald-400",
    brand: "bg-gradient-to-r from-brand-400 to-brand-600",
    amber: "bg-gradient-to-r from-amber to-orange-400",
    coral: "bg-gradient-to-r from-coral to-rose-500",
    lime: "bg-gradient-to-r from-lime to-emerald-300",
  };
  return (
    <div
      className={cn(
        "w-full overflow-hidden rounded-full bg-white/[0.07]",
        size === "sm" && "h-1.5",
        size === "md" && "h-2",
        size === "lg" && "h-2.5",
        className,
      )}
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tones[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section heading                                                     */
/* ------------------------------------------------------------------ */
export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div>
        {eyebrow ? <p className="label mb-2">{eyebrow}</p> : null}
        <h1 className="font-display text-[22px] font-semibold tracking-tight text-white sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 max-w-2xl text-[13px] leading-relaxed text-white/45">{description}</p>
        ) : null}
      </div>
      {action ? <div className="flex items-center gap-2">{action}</div> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toggle                                                              */
/* ------------------------------------------------------------------ */
export function Toggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-6 py-3.5">
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-white/90">{label}</p>
        {description ? (
          <p className="mt-1 text-xs leading-relaxed text-white/45">{description}</p>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 disabled:opacity-40",
          checked ? "border-violet-400/40 bg-violet-600" : "border-white/10 bg-white/10",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow-sm transition-transform duration-200",
            checked ? "translate-x-[22px]" : "translate-x-0.5",
          )}
          style={{ height: 18, width: 18 }}
        />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Segmented control                                                   */
/* ------------------------------------------------------------------ */
export function Segmented<T extends string | number>({
  options,
  value,
  onChange,
  size = "md",
  className,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-0.5 rounded-md border border-white/[0.07] bg-black/25 p-1",
        className,
      )}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-lg font-medium transition",
            size === "sm" ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
            value === option.value
              ? "bg-violet-500/[0.16] text-white"
              : "text-white/45 hover:text-white/80",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state                                                         */
/* ------------------------------------------------------------------ */
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-white/10 px-6 py-12 text-center">
      {icon ? (
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.05] text-white/50">
          {icon}
        </div>
      ) : null}
      <p className="font-medium text-white/85">{title}</p>
      {description ? <p className="max-w-sm text-xs leading-relaxed text-white/45">{description}</p> : null}
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small link                                                          */
/* ------------------------------------------------------------------ */
export function TextLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium text-violet-300 transition hover:text-violet-200",
        className,
      )}
    >
      {children}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/* Info note                                                           */
/* ------------------------------------------------------------------ */
export function InfoNote({
  children,
  icon,
  className,
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-md border border-white/[0.06] bg-white/[0.025] px-3.5 py-3 text-[11.5px] leading-relaxed text-white/45",
        className,
      )}
    >
      {icon ? <span className="mt-0.5 shrink-0 text-violet-300">{icon}</span> : null}
      <div>{children}</div>
    </div>
  );
}
