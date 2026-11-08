import type { ReactNode } from "react";
import { loadProfileBundle } from "@/lib/data/profile";
import { FinanceProvider } from "@/components/providers/finance-provider";
import { AppShell } from "@/components/layout/app-shell";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const { profile, chat, mode } = await loadProfileBundle();

  return (
    <FinanceProvider initialProfile={profile} initialChat={chat} mode={mode}>
      <AppShell mode={mode}>{children}</AppShell>
    </FinanceProvider>
  );
}
