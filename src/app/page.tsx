import Image from "next/image";
import Link from "next/link";

const FEATURES = [
  {
    icon: "/assets/icons/feature-ai.svg",
    title: "AI-Powered Design",
    description:
      "Describe your idea in plain language. AI transforms it into production-ready screens using your design system.",
  },
  {
    icon: "/assets/icons/feature-design-system.svg",
    title: "Design System Import",
    description:
      "Connect your Figma file and import tokens, colors, and components. Every generated screen stays on-brand.",
  },
  {
    icon: "/assets/icons/feature-canvas.svg",
    title: "Visual Building Board",
    description:
      "Arrange, connect, and iterate on screens in a node-based canvas. See the full picture of your product.",
  },
  {
    icon: "/assets/icons/feature-iteration.svg",
    title: "Instant Iteration",
    description:
      "Chat with any screen to refine it. Generate variations, run UX audits, and export — all without leaving the board.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-[#fafafa]">
      {/* Nav */}
      <nav className="flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.1)]">
            <Image
              src="/assets/icons/logo-icon.svg"
              alt=""
              width={14}
              height={14}
            />
          </div>
          <span className="text-sm font-semibold text-[#fafafa]">Vibe3D</span>
        </div>
        <div className="flex items-center gap-8">
          <Link
            href="#features"
            className="text-sm text-[#a1a1aa] transition-colors hover:text-[#fafafa]"
          >
            Features
          </Link>
          <Link
            href="#"
            className="text-sm text-[#a1a1aa] transition-colors hover:text-[#fafafa]"
          >
            Pricing
          </Link>
          <Link
            href="#"
            className="text-sm text-[#a1a1aa] transition-colors hover:text-[#fafafa]"
          >
            Docs
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link
            href="/sign-in"
            className="text-sm text-[#a1a1aa] transition-colors hover:text-[#fafafa]"
          >
            Sign In
          </Link>
          <Link
            href="/sign-in"
            className="rounded-md bg-[#6366f1] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[#818cf8]"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative mx-auto max-w-3xl px-8 pt-16 pb-12 text-center">
        {/* Glow */}
        <div className="pointer-events-none absolute top-3 left-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-[rgba(99,102,241,0.07)] blur-[50px]" />
        <h1 className="relative text-5xl leading-[60px] font-semibold tracking-tight text-[#fafafa]">
          Design starts with
          <br />a conversation.
        </h1>
        <p className="relative mt-6 text-base leading-[26px] text-[#a1a1aa]">
          Describe your idea. Connect your design system. Watch AI create
          screens
          <br />
          that actually look like a human made them.
        </p>
        <div className="relative mt-8 flex items-center justify-center gap-3">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-md bg-[#6366f1] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#818cf8]"
          >
            Shape Your Vision
            <Image
              src="/assets/icons/arrow-right.svg"
              alt=""
              width={16}
              height={16}
            />
          </Link>
          <Link
            href="/editor"
            className="inline-flex items-center rounded-md border border-[#3f3f46] px-5 py-2.5 text-sm font-medium text-[#d4d4d8] transition-colors hover:border-[#52525b] hover:text-[#fafafa]"
          >
            Start Building
          </Link>
        </div>
      </section>

      {/* Video preview */}
      <section className="mx-auto max-w-4xl px-8 pb-16">
        <p className="mb-4 text-center text-lg font-medium text-[#d4d4d8]">
          See it in action
        </p>
        <div className="relative overflow-hidden rounded-xl border border-[#27272a] bg-[#18181b] shadow-[0px_25px_50px_-12px_rgba(99,102,241,0.05)]">
          <div className="flex aspect-video items-center justify-center bg-[rgba(39,39,42,0.3)]">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#52525b] bg-[rgba(24,24,27,0.8)]">
              <Image
                src="/assets/icons/play-button.svg"
                alt="Play"
                width={24}
                height={24}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-4xl px-8 pb-16">
        <h2 className="text-center text-3xl font-semibold text-[#fafafa]">
          Everything you need to design faster
        </h2>
        <p className="mx-auto mt-3 max-w-md text-center text-sm leading-5 text-[#a1a1aa]">
          From idea to production-ready screens in minutes. No design experience
          required.
        </p>
        <div className="mt-10 grid grid-cols-2 gap-4">
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="rounded-xl border border-[#27272a] bg-[#18181b] p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-[rgba(99,102,241,0.1)]">
                <Image
                  src={feature.icon}
                  alt=""
                  width={20}
                  height={20}
                />
              </div>
              <h3 className="text-sm font-medium text-[#f4f4f5]">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-[22px] text-[#a1a1aa]">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-10 text-center">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 rounded-md bg-[#6366f1] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#818cf8]"
          >
            Get Started Free
            <Image
              src="/assets/icons/arrow-right.svg"
              alt=""
              width={16}
              height={16}
            />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#27272a] px-8 py-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-[rgba(99,102,241,0.1)]">
              <Image
                src="/assets/icons/logo-icon-small.svg"
                alt=""
                width={12}
                height={12}
              />
            </div>
            <span className="text-xs text-[#71717a]">Vibe3D</span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="#"
              className="text-xs text-[#71717a] hover:text-[#a1a1aa]"
            >
              Pricing
            </Link>
            <Link
              href="#"
              className="text-xs text-[#71717a] hover:text-[#a1a1aa]"
            >
              Docs
            </Link>
            <Link
              href="/sign-in"
              className="text-xs text-[#71717a] hover:text-[#a1a1aa]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
