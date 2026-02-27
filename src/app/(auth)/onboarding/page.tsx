"use client";

import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Step 2: "How did you hear about us?"
const REFERRAL_SOURCES = [
  { id: "google", label: "Google / Search Engine", icon: "/assets/icons/onboarding-referral-search.svg" },
  { id: "friend", label: "Friend or Colleague", icon: "/assets/icons/onboarding-referral-friend.svg" },
  { id: "blog", label: "Blog / Article", icon: "/assets/icons/onboarding-referral-blog.svg" },
  { id: "twitter", label: "X/Twitter", icon: "/assets/icons/onboarding-referral-twitter.svg" },
  { id: "youtube", label: "YouTube / Video", icon: "/assets/icons/onboarding-referral-youtube.svg" },
  { id: "ad", label: "Advertisement", icon: "/assets/icons/onboarding-referral-ad.svg" },
  { id: "other", label: "Other", icon: "/assets/icons/onboarding-referral-other.svg" },
];

// Step 3: "What's your primary use case?"
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

type Step = "name" | "referral" | "use-cases";

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>("name");
  const [displayName, setDisplayName] = useState("");
  const [selectedReferrals, setSelectedReferrals] = useState<Set<string>>(new Set());
  const [selectedUseCases, setSelectedUseCases] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
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

  // Auto-focus name input
  useEffect(() => {
    if (ready && step === "name") {
      nameInputRef.current?.focus();
    }
  }, [ready, step]);

  const toggleReferral = (id: string) => {
    setSelectedReferrals((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleUseCase = (id: string) => {
    setSelectedUseCases((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;
    setStep("referral");
  };

  const handleReferralContinue = () => {
    setStep("use-cases");
  };

  const handleFinish = async () => {
    setLoading(true);
    try {
      await supabase.auth.updateUser({
        data: {
          display_name: displayName.trim(),
          referral_source: Array.from(selectedReferrals),
          use_cases: Array.from(selectedUseCases),
          onboarding_completed: true,
        },
      });
    } catch {
      // Non-critical — proceed anyway
    }
    router.push("/dashboard");
  };

  if (!ready) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--border-strong)] border-t-[#faf9f5]" />
      </div>
    );
  }

  return (
    <div
      className="flex h-screen bg-[var(--page-bg)]"
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

          {/* Step content */}
          {step === "name" && (
            <NameStep
              displayName={displayName}
              setDisplayName={setDisplayName}
              onSubmit={handleNameSubmit}
              nameInputRef={nameInputRef}
            />
          )}

          {step === "referral" && (
            <ReferralStep
              selected={selectedReferrals}
              onToggle={toggleReferral}
              onContinue={handleReferralContinue}
            />
          )}

          {step === "use-cases" && (
            <UseCaseStep
              selected={selectedUseCases}
              onToggle={toggleUseCase}
              onFinish={handleFinish}
              loading={loading}
            />
          )}
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
      <div className="relative m-6 ml-0 hidden flex-1 overflow-hidden rounded-[20px] border border-[var(--border)] bg-[var(--card-bg-secondary)] backdrop-blur-[16px] lg:block">
        {/* Subtle background glow layers */}
        <div className="absolute -left-[200px] -top-[100px] h-[800px] w-[900px] opacity-20" style={{ mixBlendMode: "plus-lighter" }}>
          <div className="absolute inset-0 rounded-full bg-[#507AEF] blur-[120px]" />
        </div>
        <div className="absolute -bottom-[100px] left-[100px] h-[600px] w-[700px] opacity-15" style={{ mixBlendMode: "plus-lighter" }}>
          <div className="absolute inset-0 rounded-full bg-[#FF774F] blur-[120px]" />
        </div>

        {/* Editor mockup frame */}
        <div className="absolute inset-[60px_50px_120px_50px] rounded-[18px] bg-[var(--card-bg-secondary)] shadow-[0_0_0_1px_rgba(255,255,255,0.1)]">
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
              <div className="mt-2 rounded bg-[var(--accent-bg)] px-2 py-1 text-[9px] text-[rgba(255,255,255,0.7)]">Scene 1</div>
              <div className="mt-3 rounded bg-[rgba(255,255,255,0.03)] px-2 py-1 text-[8px] text-[rgba(255,255,255,0.3)]">Search</div>
              <div className="mt-3 text-[9px] text-[rgba(255,255,255,0.7)]">Digital Camera</div>
            </div>
          </div>

          {/* Mockup viewport with 3D camera */}
          <div className="absolute bottom-0 left-[140px] right-[140px] top-8 bg-[var(--card-bg-secondary)]">
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

/* ─── Step 1: Name ─── */
function NameStep({
  displayName,
  setDisplayName,
  onSubmit,
  nameInputRef,
}: {
  displayName: string;
  setDisplayName: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  nameInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <>
      <h1
        className="text-[37.5px] leading-[37px] text-[var(--heading)]"
        style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
      >
        Welcome to Vibe3D
      </h1>
      <p className="mt-4 text-sm text-[rgba(255,255,255,0.52)]">
        Let&apos;s get to know you better so we can personalize your experience.
      </p>

      <form onSubmit={onSubmit} className="mt-8">
        <label className="text-sm text-white">
          What&apos;s your name? <span className="text-red-500">*</span>
        </label>
        <input
          ref={nameInputRef}
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="John Doe"
          className="mt-3.5 h-[60px] w-full max-w-[452px] rounded-[9px] border border-[var(--border-strong)] bg-transparent px-6 text-[14.8px] text-[var(--text-primary)] placeholder:text-[var(--text-primary)]/50 outline-none transition-colors focus:border-[var(--text-muted)]"
        />
        <button
          type="submit"
          disabled={!displayName.trim()}
          className="mt-7 flex h-[44px] w-[139px] items-center justify-center rounded-[9px] bg-[var(--text-primary)] text-base text-[var(--page-bg)] transition-colors hover:bg-[#e8e7e3] disabled:opacity-50"
        >
          Get Started
        </button>
      </form>
    </>
  );
}

/* ─── Step 2: Referral Source ─── */
function ReferralStep({
  selected,
  onToggle,
  onContinue,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onContinue: () => void;
}) {
  return (
    <>
      <h1
        className="text-[37.5px] leading-[37px] text-[var(--heading)]"
        style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
      >
        How did you hear
        <br />
        about us?
      </h1>
      <p className="mt-4 text-sm text-[rgba(255,255,255,0.52)]">
        This helps us understand what&apos;s working
      </p>

      <div className="mt-8 flex flex-wrap gap-[15px]">
        {REFERRAL_SOURCES.map((src) => (
          <button
            key={src.id}
            onClick={() => onToggle(src.id)}
            className={`group relative flex h-[52px] items-center gap-2.5 rounded-[9px] border px-4 transition-all ${
              selected.has(src.id)
                ? "border-[var(--text-muted)] bg-[var(--accent-bg)]"
                : "border-[var(--border-strong)] hover:border-[rgba(222,220,209,0.45)] hover:bg-[rgba(255,255,255,0.02)]"
            }`}
          >
            {selected.has(src.id) && (
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
              src={src.icon}
              alt=""
              width={22}
              height={22}
              className="relative z-10 shrink-0 opacity-70"
            />
            <span className="relative z-10 text-[14px] leading-tight text-[var(--text-primary)]">
              {src.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onContinue}
        className="mt-8 flex h-[44px] w-[139px] items-center justify-center rounded-[9px] bg-[var(--text-primary)] text-base text-[var(--page-bg)] transition-colors hover:bg-[#e8e7e3]"
      >
        Continue
      </button>
    </>
  );
}

/* ─── Step 3: Use Cases ─── */
function UseCaseStep({
  selected,
  onToggle,
  onFinish,
  loading,
}: {
  selected: Set<string>;
  onToggle: (id: string) => void;
  onFinish: () => void;
  loading: boolean;
}) {
  return (
    <>
      <h1
        className="text-[37.5px] leading-[37px] text-[var(--heading)]"
        style={{ fontFamily: "'PP Mondwest', Georgia, serif" }}
      >
        What&apos;s your primary
        <br />
        use case?
      </h1>
      <p className="mt-4 text-sm text-[rgba(255,255,255,0.52)]">
        Select all that apply
      </p>

      <div className="mt-8 flex flex-wrap gap-[15px]">
        {USE_CASES.map((uc) => (
          <button
            key={uc.id}
            onClick={() => onToggle(uc.id)}
            className={`group relative flex h-[52px] items-center gap-2.5 rounded-[9px] border px-4 transition-all ${
              selected.has(uc.id)
                ? "border-[var(--text-muted)] bg-[var(--accent-bg)]"
                : "border-[var(--border-strong)] hover:border-[rgba(222,220,209,0.45)] hover:bg-[rgba(255,255,255,0.02)]"
            }`}
          >
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
            <span className="relative z-10 text-[14px] leading-tight text-[var(--text-primary)]">
              {uc.label}
            </span>
          </button>
        ))}
      </div>

      <button
        onClick={onFinish}
        disabled={loading}
        className="mt-8 flex h-[44px] w-[151px] items-center justify-center rounded-[9px] bg-[var(--text-primary)] text-base font-medium text-[var(--page-bg)] transition-colors hover:bg-[#e8e7e3] disabled:opacity-50"
      >
        {loading ? "Loading..." : "Get Started"}
      </button>
    </>
  );
}
