import type { Metadata } from "next";
import { AuthPanel } from "@/components/auth/auth-panel";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Sign in",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const params = await searchParams;
  const next =
    params.next && params.next.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";

  return (
    <AuthPanel
      configured={isSupabaseConfigured}
      next={next}
      initialError={params.error}
    />
  );
}
