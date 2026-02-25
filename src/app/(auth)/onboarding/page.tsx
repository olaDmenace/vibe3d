"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const USE_CASES = [
  { id: "game-dev", label: "Game Development", icon: "/assets/icons/onboarding-game.svg" },
  { id: "product-design", label: "Product Design", icon: "/assets/icons/onboarding-product.svg" },
  { id: "3d-printing", label: "3D Printing", icon: "/assets/icons/onboarding-3d.svg" },
  { id: "architecture", label: "Architecture", icon: "/assets/icons/onboarding-architecture.svg" },
  { id: "animation", label: "Animation & Film", icon: "/assets/icons/onboarding-animation.svg" },
  { id: "education", label: "Education & Learning", icon: "/assets/icons/onboarding-education.svg" },
  { id: "fun", label: "Just for Fun", icon: "/assets/icons/onboarding-fun.svg" },
];

const TRUST_LOGOS = [
  { src: "/assets/logos/scale.png", alt: "Scale", width: 64, height: 20 },
  { src: "/assets/logos/google.png", alt: "Google", width: 64, height: 20 },
  { src: "/assets/logos/shopify.png", alt: "Shopify", width: 72, height: 20 },
  { src: "/assets/logos/accenture.png", alt: "Accenture", width: 80, height: 20 },
];

// Button layout matches Figma: row1 = 2, row2 = 3, row3 = 2
const ROWS = [
  USE_CASES.slice(0, 2),
  USE_CASES.slice(2, 5),
  USE_CASES.slice(5, 7),
];

export default function OnboardingPage() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Check if user already completed onboarding
  useEffect(() => {
    const check = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/sign-in");
        return;
      }
      if (user.user_metadata?.onboarding_completed) {
        router.replace("/dashboard");
        return;
      }
      setReady(true);
    };
    check();
  }, [supabase, router]);

  const toggleUseCase = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGetStarted = async () => {
    setLoading(true);
    try {
      await supabase.auth.updateUser({
        data: {
          onboarding_completed: true,
          use_cases: Array.from(selected),
        },
      });
    } catch {
      // Non-critical — proceed anyway
    }
    router.push("/dashboard");
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#101010]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[rgba(222,220,209,0.3)] border-t-[#faf9f5]" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen bg-[#101010]"
      style={{ fontFamily: "'Aeonik Pro', sans-serif" }}
    >
      {/* Left — Onboarding form */}
      <div className="relative flex w-full max-w-[540px] flex-col justify-between px-[68px] py-12">
        <div className="flex flex-col pt-24">
          {/* Gem logo */}
          <div className="mb-8">
            <Image
              src="/assets/icons/logo-gem.svg"
              alt="Vibe3D"
              width={56}
              height={57}
              className="drop-shadow-[0_0_12px_rgba(255,200,180,0.3)]"
            />
          </div>

          {/* Heading */}
          <h1
            className="text-[37.5px] leading-[37px] text-[#c2c0b6]"
            style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
          >
            What&apos;s your primary
            <br />
            use case?
          </h1>
          <p className="mt-3 text-sm text-[rgba(255,255,255,0.52)]">
            Select all that apply
          </p>

          {/* Use case grid */}
          <div className="mt-8 flex flex-col gap-[15px]">
            {ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex gap-[15px]">
                {row.map((uc) => (
                  <button
                    key={uc.id}
                    onClick={() => toggleUseCase(uc.id)}
                    className={`group relative flex h-[60px] items-center gap-3 rounded-[9px] border px-5 transition-all ${
                      selected.has(uc.id)
                        ? "border-[rgba(222,220,209,0.5)] bg-[rgba(255,255,255,0.05)]"
                        : "border-[rgba(222,220,209,0.3)] hover:border-[rgba(222,220,209,0.45)] hover:bg-[rgba(255,255,255,0.02)]"
                    }`}
                  >
                    {/* Selected glow effect */}
                    {selected.has(uc.id) && (
                      <div className="pointer-events-none absolute inset-0 rounded-[9px] bg-gradient-to-r from-[rgba(200,160,140,0.15)] via-[rgba(180,140,200,0.1)] to-transparent" />
                    )}
                    <Image
                      src={uc.icon}
                      alt=""
                      width={24}
                      height={24}
                      className="relative z-10 opacity-70"
                    />
                    <span className="relative z-10 whitespace-nowrap text-[14.8px] text-[#e5e5e5]">
                      {uc.label}
                    </span>
                  </button>
                ))}
              </div>
            ))}
          </div>

          {/* Get Started button */}
          <button
            onClick={handleGetStarted}
            disabled={loading}
            className="mt-8 flex h-[44px] w-[151px] items-center justify-center rounded-[9px] bg-[#faf9f5] text-base font-medium text-[#30302e] transition-colors hover:bg-[#e8e7e3] disabled:opacity-50"
          >
            {loading ? "Loading..." : "Get Started"}
          </button>
        </div>

        {/* Trust logos */}
        <div className="mt-auto pt-16">
          <p className="text-sm text-[rgba(255,255,255,0.52)]">
            Trusted by teams at{" "}
            <span className="text-[rgba(255,255,255,0.92)]">
              world&apos;s leading organizations
            </span>
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-[57px] opacity-50">
            {TRUST_LOGOS.map((logo) => (
              <Image
                key={logo.alt}
                src={logo.src}
                alt={logo.alt}
                width={logo.width}
                height={logo.height}
                className="h-5 w-auto object-contain"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Right — Editor preview */}
      <div className="relative m-6 ml-0 hidden flex-1 overflow-hidden rounded-[20px] border border-[rgba(222,220,209,0.15)] bg-[#262624] backdrop-blur-[16px] lg:block">
        <Image
          src="/assets/images/hero-3d-model.png"
          alt="3D editor preview"
          fill
          className="object-cover"
          priority
        />
        {/* Bottom warm gradient */}
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[rgba(180,140,120,0.4)] via-[rgba(160,120,100,0.2)] to-transparent" />
      </div>
    </div>
  );
}
