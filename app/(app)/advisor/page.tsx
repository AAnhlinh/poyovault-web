import type { Metadata } from "next";
import { AdvisorView } from "@/components/advisor/advisor-view";

export const metadata: Metadata = {
  title: "AI financial advisor",
};

export default function AdvisorPage() {
  return <AdvisorView />;
}
