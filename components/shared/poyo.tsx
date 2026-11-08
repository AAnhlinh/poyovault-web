"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

type PoyoVariant = "mark" | "bust";
type PoyoLook = "classic" | "wink" | "curious";

/**
 * Poyo — PoyoVault's line-art companion.
 * Drawn as a single neon stroke: oversized ears, small oval eyes and a
 * rectangular lens over the left eye. Purely decorative but given an
 * accessible label because it carries the product's personality.
 */
export function Poyo({
  size = 96,
  variant = "bust",
  look = "classic",
  animated = true,
  glow = true,
  className,
  label = "Poyo, the PoyoVault companion",
}: {
  size?: number;
  variant?: PoyoVariant;
  /** Occasionally vary the expression so Poyo does not always look identical. */
  look?: PoyoLook;
  animated?: boolean;
  glow?: boolean;
  className?: string;
  label?: string;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const gradientId = `poyo-gradient-${uid}`;
  const ratio = variant === "mark" ? 100 / 160 : 124 / 160;

  return (
    <svg
      viewBox={variant === "mark" ? "0 0 160 100" : "0 0 160 124"}
      width={size}
      height={Math.round(size * ratio)}
      role="img"
      aria-label={label}
      className={cn(
        "shrink-0 overflow-visible",
        glow && "poyo-glow",
        animated && "poyo-float",
        className,
      )}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#EDE9FE" />
          <stop offset="42%" stopColor="#C4B5FD" />
          <stop offset="100%" stopColor="#67E8F9" />
        </linearGradient>
      </defs>

      <g
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth={2.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        transform={
          look === "curious"
            ? "rotate(-3 80 80)"
            : look === "wink"
              ? "rotate(2 80 80)"
              : undefined
        }
      >
        {variant === "bust" ? (
          <>
            <path d="M12 114 L44 80" opacity="0.75" />
            <path d="M148 114 L116 80" opacity="0.75" />
            <path d="M64 88 L64 101 L80 111 L96 101 L96 88" strokeWidth={1.6} opacity="0.4" />
          </>
        ) : null}

        {/* Head, ears and jaw */}
        <path d="M44 78 L27 30 L46 7 L65 34 Q80 28.5 95 34 L114 7 L133 30 L116 78 L80 92 Z" />

        {/* Eyes — the wink replaces the left eye with a closed arc. */}
        {look === "wink" ? (
          <path d="M62 60 Q68.5 66.5 75 60" strokeWidth={2.2} />
        ) : (
          <ellipse
            cx="68.5"
            cy="59.5"
            rx="4.1"
            ry="7.4"
            fill={`url(#${gradientId})`}
            stroke="none"
            className={animated ? "poyo-eye" : undefined}
          />
        )}
        <ellipse
          cx="95.5"
          cy="59.5"
          rx={look === "curious" ? 4.8 : 4.1}
          ry={look === "curious" ? 8.4 : 7.4}
          fill={`url(#${gradientId})`}
          stroke="none"
          className={animated ? "poyo-eye" : undefined}
          style={{ animationDelay: "0.08s" }}
        />

        {/* A raised brow gives the curious look its expression. */}
        {look === "curious" ? (
          <path d="M89 43 L101 40" strokeWidth={1.6} opacity="0.55" />
        ) : null}

        {/* Signature rectangular lens */}
        <rect
          x="55"
          y={look === "curious" ? 39 : 43}
          width="27"
          height="33"
          rx="4"
          strokeWidth={1.5}
          opacity="0.72"
          transform={
            look === "curious"
              ? "rotate(4 68.5 56)"
              : look === "wink"
                ? "rotate(-5 68.5 59.5)"
                : "rotate(-2 68.5 59.5)"
          }
        />
      </g>
    </svg>
  );
}
