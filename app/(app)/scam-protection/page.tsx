import type { Metadata } from "next";
import { ScamProtectionView } from "@/components/scam/scam-protection-view";

export const metadata: Metadata = {
  title: "AI scam protection",
};

export default function ScamProtectionPage() {
  return <ScamProtectionView />;
}
