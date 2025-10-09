'use server';

import { cookies } from 'next/headers';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

export const getSupabaseRouteHandlerClient = async () => {
  const cookieStore = await cookies();
  return createRouteHandlerClient({ cookies: () => cookieStore });
};
