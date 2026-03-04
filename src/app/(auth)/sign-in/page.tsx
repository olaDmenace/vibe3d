"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TrustMarquee } from "@/components/trust-marquee";

export default function SignInPage() {
  const [email, setEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState<"email" | "otp">("email");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const otpInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const supabase = createClient();

  // Show callback errors from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const desc = params.get("error_description");
    if (error) {
      setMessage({ type: "error", text: desc || error });
    }
  }, []);

  // Auto-focus OTP input when step changes
  useEffect(() => {
    if (step === "otp") {
      otpInputRef.current?.focus();
    }
  }, [step]);

  async function handleGoogleSignIn() {
    setLoading(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    }
  }

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
    } else {
      setStep("otp");
      setMessage({ type: "success", text: "We sent an 8-digit code to your email." });
    }
    setLoading(false);
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault();
    if (!otpCode.trim()) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: otpCode.trim(),
      type: "email",
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setLoading(false);
    } else {
      // Signed in — check onboarding status and redirect
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const onboardingCompleted = user?.user_metadata?.onboarding_completed;
      router.push(onboardingCompleted ? "/dashboard" : "/onboarding");
    }
  }

  function handleBackToEmail() {
    setStep("email");
    setOtpCode("");
    setMessage(null);
  }

  return (
    <div className="flex h-screen bg-[var(--page-bg)]" style={{ fontFamily: "'Aeonik Pro', sans-serif" }}>
      {/* Left — Auth form */}
      <div className="relative flex w-full max-w-[540px] flex-col justify-between px-[68px] py-12">
        {/* Logo + form */}
        <div className="flex flex-col items-center pt-24">
          {/* Logo gem */}
          <div className="mb-4 flex h-20 w-20 items-center justify-center opacity-90">
            <Image
              src="/assets/icons/logo-gem.svg"
              alt="Vibe3D logo"
              width={56}
              height={57}
              className="drop-shadow-[0_0_12px_rgba(255,200,180,0.3)]"
            />
          </div>

          {/* Title */}
          <h1
            className="text-center text-4xl text-[var(--heading)]"
            style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
          >
            Vibe3D
          </h1>
          <p className="mt-2 text-center text-sm text-[rgba(255,255,255,0.52)]">
            {step === "email"
              ? "Log in or register with your email."
              : `Enter the code sent to ${email}`}
          </p>

          {/* Auth card */}
          <div className="mt-8 w-full max-w-[400px] rounded-[18px] border border-[var(--border)] bg-[var(--card-bg)] p-7 shadow-[0px_4px_24px_0px_rgba(0,0,0,0.02),0px_4px_32px_0px_rgba(0,0,0,0.02)]">
            {step === "email" ? (
              <>
                {/* Google button */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-3 rounded-[9px] border border-[rgba(222,220,209,0.3)] transition-colors hover:bg-[rgba(255,255,255,0.05)] disabled:opacity-50"
                >
                  <Image
                    src="/assets/icons/google-logo.svg"
                    alt="Google"
                    width={16}
                    height={15}
                  />
                  <span className="text-base text-[var(--text-primary)]">
                    Continue with Google
                  </span>
                </button>

                {/* Divider */}
                <div className="my-4 flex items-center justify-center">
                  <span className="text-xs tracking-wider text-[var(--heading)] uppercase">
                    or
                  </span>
                </div>

                {/* Email form */}
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={loading}
                    className="h-11 w-full rounded-[9px] border border-[var(--border)] bg-[var(--input-bg)] px-3 text-base text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none transition-colors focus:border-[rgba(222,220,209,0.4)] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || !email.trim()}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] bg-[var(--text-primary)] text-base text-[var(--page-bg)] transition-colors hover:bg-[#e8e7e3] disabled:opacity-50"
                  >
                    {loading ? "Sending..." : "Continue with email"}
                  </button>
                </form>
              </>
            ) : (
              <>
                {/* OTP verification form */}
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <input
                    ref={otpInputRef}
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    placeholder="8-digit code"
                    disabled={loading}
                    className="h-11 w-full rounded-[9px] border border-[var(--border)] bg-[var(--input-bg)] px-3 text-center text-xl tracking-[0.3em] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] placeholder:tracking-normal placeholder:text-base outline-none transition-colors focus:border-[rgba(222,220,209,0.4)] disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 8}
                    className="flex h-11 w-full items-center justify-center rounded-[9px] bg-[var(--text-primary)] text-base text-[var(--page-bg)] transition-colors hover:bg-[#e8e7e3] disabled:opacity-50"
                  >
                    {loading ? "Verifying..." : "Verify code"}
                  </button>
                </form>

                {/* Back link */}
                <button
                  onClick={handleBackToEmail}
                  className="mt-3 w-full text-center text-sm text-[var(--text-muted)] transition-colors hover:text-[var(--heading)]"
                >
                  Use a different email
                </button>
              </>
            )}

            {/* Status message */}
            {message && (
              <p
                className={`mt-4 text-center text-sm ${
                  message.type === "success" ? "text-green-400" : "text-red-400"
                }`}
              >
                {message.text}
              </p>
            )}

            {/* Privacy */}
            <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
              By continuing, you acknowledge Vibe3D&apos;s{" "}
              <Link href="#" className="underline">
                Privacy Policy
              </Link>
              .
            </p>
          </div>
        </div>

        {/* Trust logos */}
        <TrustMarquee />
      </div>

      {/* Right — Hero image */}
      <div className="relative hidden flex-1 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card-bg)] backdrop-blur-[16px] lg:block m-6 ml-0">
        <Image
          src="/assets/images/hero-3d-model.png"
          alt="3D model showcase"
          fill
          className="object-cover"
          priority
        />
        {/* Bottom gradient overlay */}
        <div className="absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[rgba(16,16,16,0.9)] to-transparent" />
        {/* Bottom text */}
        <div className="absolute bottom-12 left-12 max-w-xs">
          <p className="text-lg leading-8 text-[var(--text-primary)]">
            Create stunning 3D models with AI. No modeling experience required.
          </p>
        </div>
      </div>
    </div>
  );
}
