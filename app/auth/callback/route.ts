import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const token = requestUrl.searchParams.get("token");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const email = requestUrl.searchParams.get("email");

  const cookieStore = await cookies();
  const supabase = createRouteHandlerClient({
    cookies: () => cookieStore,
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
  } else if (token || tokenHash) {
    const verificationType = (type ?? "signup") as "signup" | "email_change" | "recovery" | "magiclink" | "invite" | "email";
    if (tokenHash) {
      await supabase.auth.verifyOtp({ token_hash: tokenHash, type: verificationType });
    } else if (email) {
      await supabase.auth.verifyOtp({ email, token: token as string, type: verificationType });
    }
  }

  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
