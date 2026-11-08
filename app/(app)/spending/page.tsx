import type { Metadata } from "next";
import { SpendingView } from "@/components/spending/spending-view";

export const metadata: Metadata = {
  title: "Spending",
};

export default function SpendingPage() {
  return <SpendingView />;
}
