import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import type { Session } from "@supabase/auth-helpers-nextjs";
import SupabaseProvider from "@/components/providers/SupabaseProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Halo",
  description: "Quite status sharing for close circles",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  let initialSession: Session | null = null;

  if (session) {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn("Supabase getUser failed:", userError.message);
    } else if (user) {
      const mutableSession = session as Session;
      mutableSession.user = user;
      initialSession = mutableSession;
    }
  } else {
    initialSession = null;
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <SupabaseProvider initialSession={initialSession}>
          {children}
        </SupabaseProvider>
      </body>
    </html>
  );
}
