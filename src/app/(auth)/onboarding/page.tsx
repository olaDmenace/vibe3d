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
          <div className="mt-8 flex flex-wrap gap-[15px]">
            {USE_CASES.map((uc) => (
              <button
                key={uc.id}
                onClick={() => toggleUseCase(uc.id)}
                className={`group relative flex h-[52px] items-center gap-2.5 rounded-[9px] border px-4 transition-all ${
                  selected.has(uc.id)
                    ? "border-[rgba(222,220,209,0.5)] bg-[rgba(255,255,255,0.05)]"
                    : "border-[rgba(222,220,209,0.3)] hover:border-[rgba(222,220,209,0.45)] hover:bg-[rgba(255,255,255,0.02)]"
                }`}
              >
                {/* Selected glow effect — Figma gradient SVG overlay */}
                {selected.has(uc.id) && (
                  <div
                    className="pointer-events-none absolute inset-0 overflow-hidden rounded-[9px]"
                    style={{ mixBlendMode: "plus-lighter" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src="/assets/icons/onboarding-selected-glow.svg"
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  </div>
                )}
                <Image
                  src={uc.icon}
                  alt=""
                  width={22}
                  height={22}
                  className="relative z-10 shrink-0 opacity-70"
                />
                <span className="relative z-10 text-[14px] leading-tight text-[#e5e5e5]">
                  {uc.label}
                </span>
              </button>
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

      {/* Right — Editor preview mockup */}
      <div className="relative m-6 ml-0 hidden flex-1 overflow-hidden rounded-[20px] border border-[rgba(222,220,209,0.15)] bg-[#262624] backdrop-blur-[16px] lg:block">
        {/* Subtle background glow layers */}
        <div className="absolute -left-[200px] -top-[100px] h-[800px] w-[900px] opacity-20" style={{ mixBlendMode: "plus-lighter" }}>
          <div className="absolute inset-0 rounded-full bg-[#507AEF] blur-[120px]" />
        </div>
        <div className="absolute -bottom-[100px] left-[100px] h-[600px] w-[700px] opacity-15" style={{ mixBlendMode: "plus-lighter" }}>
          <div className="absolute inset-0 rounded-full bg-[#FF774F] blur-[120px]" />
        </div>

        {/* Editor mockup frame */}
        <div className="absolute inset-[60px_50px_120px_50px] rounded-[18px] bg-[#262624] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
          {/* Mockup top bar */}
          <div className="flex h-8 items-center gap-2 rounded-t-[18px] border-b border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.03)] px-4">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-[rgba(255,255,255,0.15)]" />
              <div className="h-2 w-2 rounded-full bg-[rgba(255,255,255,0.15)]" />
              <div className="h-2 w-2 rounded-full bg-[rgba(255,255,255,0.15)]" />
            </div>
            <span className="ml-2 text-[10px] text-[rgba(255,255,255,0.4)]">Untitled</span>
          </div>

          {/* Mockup sidebar */}
          <div className="absolute bottom-0 left-0 top-8 w-[140px] border-r border-[rgba(255,255,255,0.05)] bg-[#1f1f18]">
            <div className="p-3">
              <div className="text-[9px] text-[rgba(255,255,255,0.5)]">Scenes</div>
              <div className="mt-2 rounded bg-[rgba(255,255,255,0.05)] px-2 py-1 text-[9px] text-[rgba(255,255,255,0.7)]">Scene 1</div>
              <div className="mt-3 rounded bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[8px] text-[rgba(255,255,255,0.3)]">Search</div>
              <div className="mt-3 text-[9px] text-[rgba(255,255,255,0.7)]">Digital Camera</div>
            </div>
          </div>

          {/* Mockup viewport with 3D camera */}
          <div className="absolute bottom-0 left-[140px] right-[140px] top-8 bg-[#262624]">
            <div className="relative flex h-full items-center justify-center">
              <Image
                src="/assets/images/editor-preview-camera.png"
                alt="3D camera model"
                width={320}
                height={420}
                className="object-contain drop-shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
                priority
              />
              {/* Blue selection handles */}
              <div className="pointer-events-none absolute inset-[15%_20%] border border-[#437dfd]">
                <div className="absolute -left-1 -top-1 h-2 w-2 border border-[#437dfd] bg-white" />
                <div className="absolute -right-1 -top-1 h-2 w-2 border border-[#437dfd] bg-white" />
                <div className="absolute -bottom-1 -left-1 h-2 w-2 border border-[#437dfd] bg-white" />
                <div className="absolute -bottom-1 -right-1 h-2 w-2 border border-[#437dfd] bg-white" />
              </div>
            </div>
          </div>

          {/* Mockup right panel */}
          <div className="absolute bottom-0 right-0 top-8 w-[140px] border-l border-[rgba(255,255,255,0.05)] bg-[#1f1f18]">
            <div className="p-3">
              <div className="flex gap-1">
                <div className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[8px] text-[rgba(255,255,255,0.6)]">Share</div>
                <div className="rounded bg-[rgba(255,255,255,0.08)] px-2 py-0.5 text-[8px] text-[rgba(255,255,255,0.6)]">Export</div>
              </div>
              <div className="mt-3 text-[8px] text-[rgba(255,255,255,0.5)]">Page</div>
              <div className="mt-2 text-[8px] text-[rgba(255,255,255,0.5)]">Transform</div>
              <div className="mt-1 flex gap-1">
                <span className="text-[7px] text-[rgba(255,255,255,0.4)]">Position</span>
                <span className="text-[7px] text-[#10b981]">X</span>
                <span className="text-[7px] text-[rgba(255,255,255,0.6)]">3.50</span>
                <span className="text-[7px] text-[#10b981]">Y</span>
                <span className="text-[7px] text-[rgba(255,255,255,0.6)]">-135</span>
              </div>
            </div>
          </div>

          {/* Mockup chat input */}
          <div className="absolute bottom-3 left-[155px] right-[155px] h-[50px] rounded-xl bg-[rgba(62,62,62,0.5)] px-3 pt-2">
            <span className="text-[9px] text-[rgba(255,255,255,0.35)]">Start creating...</span>
          </div>
        </div>

        {/* Bottom warm gradient fade */}
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[rgba(180,130,110,0.5)] via-[rgba(160,110,90,0.25)] to-transparent" />
      </div>
    </div>
  );
}
