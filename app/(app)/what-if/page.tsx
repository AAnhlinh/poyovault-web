import type { Metadata } from "next";
import { WhatIfView } from "@/components/what-if/what-if-view";

export const metadata: Metadata = {
  title: "What if",
};

export default function WhatIfPage() {
  return <WhatIfView />;
}
