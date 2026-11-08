import type { Metadata } from "next";
import { SavingsView } from "@/components/savings/savings-view";

export const metadata: Metadata = {
  title: "Savings goals",
};

export default function SavingsPage() {
  return <SavingsView />;
}
