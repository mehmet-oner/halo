import type { Metadata } from "next";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/auth-helpers-nextjs";
import SupabaseProvider from "@/components/providers/SupabaseProvider";
import { getAuthenticatedUser } from "@/lib/auth/getAuthenticatedUser";
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
  const cookieStore = await cookies();
  const supabase = createServerComponentClient({
    cookies: () => cookieStore,
  });
  const auth = await getAuthenticatedUser({
    client: supabase,
    requireSession: true,
  });

  const initialSession: Session | null = auth?.session ?? null;

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
