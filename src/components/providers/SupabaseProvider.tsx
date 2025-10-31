'use client';

import { useState, type ReactNode } from 'react';
import { SessionContextProvider, type Session } from '@supabase/auth-helpers-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

type SupabaseProviderProps = {
  children: ReactNode;
  initialSession: Session | null;
};

export default function SupabaseProvider({
  children,
  initialSession,
}: SupabaseProviderProps) {
  const [supabaseClient] = useState(() => createClientComponentClient());

  return (
    <SessionContextProvider supabaseClient={supabaseClient} initialSession={initialSession}>
      {children}
    </SessionContextProvider>
  );
}
