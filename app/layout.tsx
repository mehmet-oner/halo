import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/auth-helpers-nextjs";
import SupabaseProvider from "@/components/providers/SupabaseProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halo",
  description: "Status sharing for close circles",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
  const [{ data: sessionData }, userResult] = await Promise.all([
    supabase.auth.getSession(),
    supabase.auth.getUser(),
  ]);

  const session = sessionData.session;
  let initialSession: Session | null = null;

  if (userResult.error) {
    console.warn("Supabase getUser failed:", userResult.error.message);
  } else if (session && userResult.data.user) {
    initialSession = {
      ...session,
      user: userResult.data.user,
    } as Session;
  }

  return (
    <html lang="en">
      <body className="antialiased">
        <SupabaseProvider initialSession={initialSession}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
