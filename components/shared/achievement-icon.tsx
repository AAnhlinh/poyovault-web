import {
  CalendarCheck,
  CreditCard,
  PiggyBank,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { Achievement } from "@/lib/finance/gamification";

const ICONS: Partial<Record<Achievement["icon"], LucideIcon>> = {
  piggy: PiggyBank,
  shield: ShieldCheck,
  trending: TrendingUp,
  credit: CreditCard,
  sparkles: Sparkles,
  target: Target,
  trophy: Trophy,
  calendar: CalendarCheck,
};

export function achievementIcon(icon: Achievement["icon"]): LucideIcon {
  return ICONS[icon] ?? Star;
}
