import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorParam = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // If Supabase returned an error directly (e.g., redirect URL not allowed)
  if (errorParam) {
    console.error("[auth/callback] Supabase error:", errorParam, errorDescription);
    return NextResponse.redirect(
      `${origin}/sign-in?error=${encodeURIComponent(errorParam)}&error_description=${encodeURIComponent(errorDescription || "")}`
    );
  }

  // No code means the magic link didn't include an auth code
  // This happens when the redirect URL is not in Supabase's allowed list
  if (!code) {
    console.error("[auth/callback] No code parameter in callback URL. Check Supabase URL Configuration → Redirect URLs includes:", `${origin}/auth/callback`);
    return NextResponse.redirect(
      `${origin}/sign-in?error=no_code&error_description=${encodeURIComponent("No auth code received. Ensure redirect URL is configured in Supabase Dashboard.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("[auth/callback] Code exchange failed:", error.message);
    return NextResponse.redirect(
      `${origin}/sign-in?error=exchange_failed&error_description=${encodeURIComponent(error.message)}`
    );
  }

  // Check if user has completed onboarding
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const onboardingCompleted = user?.user_metadata?.onboarding_completed;

  let next = searchParams.get("next");
  if (!next || !next.startsWith("/")) {
    next = onboardingCompleted ? "/dashboard" : "/onboarding";
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}
