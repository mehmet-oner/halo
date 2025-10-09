import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });
  const { error } = await supabase.auth.signOut();
  return NextResponse.json({
    success: !error,
    message: error ? error.message : null,
  });
}
