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
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      {
        url: "/icons/halo-icon-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        url: "/icons/halo-icon-512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/icons/halo-icon-180.png",
        sizes: "180x180",
        type: "image/png",
      },
      {
        url: "/icons/halo-icon-152.png",
        sizes: "152x152",
        type: "image/png",
      },
    ],
    shortcut: [
      {
        url: "/icons/halo-icon-96.png",
        sizes: "96x96",
        type: "image/png",
      },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Halo",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createServerComponentClient({ cookies });
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
