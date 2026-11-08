import type { Metadata } from "next";
import { DebtView } from "@/components/debt/debt-view";

export const metadata: Metadata = {
  title: "Debt manager",
};

export default function DebtPage() {
  return <DebtView />;
}
