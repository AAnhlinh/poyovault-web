import type { Metadata } from "next";
import { TestDialer } from "@/components/test-dialer/test-dialer";

export const metadata: Metadata = {
  title: "Test dialer",
  description: "Hidden simulator for incoming scam calls.",
  robots: { index: false, follow: false },
};

export default function TestDialerPage() {
  return <TestDialer />;
}
