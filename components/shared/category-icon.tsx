import {
  ArrowDownLeft,
  Car,
  Clapperboard,
  HeartPulse,
  Home,
  Plane,
  Receipt,
  Shield,
  ShoppingBag,
  ShoppingBasket,
  Tv,
  UtensilsCrossed,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CATEGORY_META } from "@/lib/finance/aggregate";

const ICONS: Record<string, LucideIcon> = {
  groceries: ShoppingBasket,
  dining: UtensilsCrossed,
  entertainment: Clapperboard,
  shopping: ShoppingBag,
  transportation: Car,
  housing: Home,
  utilities: Zap,
  subscriptions: Tv,
  healthcare: HeartPulse,
  travel: Plane,
  insurance: Shield,
  other: Receipt,
  income: ArrowDownLeft,
};

export function CategoryGlyph({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const Icon = ICONS[category] ?? Receipt;
  return <Icon className={cn("h-4 w-4", className)} strokeWidth={1.8} />;
}

export function CategoryAvatar({
  category,
  className,
}: {
  category: string;
  className?: string;
}) {
  const color = CATEGORY_META[category]?.color ?? "#818CF8";
  return (
    <div
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06]",
        className,
      )}
      style={{ backgroundColor: `${color}14`, color }}
    >
      <CategoryGlyph category={category} />
    </div>
  );
}
