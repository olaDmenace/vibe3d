"use client";

import Image from "next/image";

const TRUST_LOGOS = [
  { src: "/assets/logos/scale.png", alt: "Scale", width: 64, height: 20 },
  { src: "/assets/logos/google.png", alt: "Google", width: 64, height: 20 },
  { src: "/assets/logos/shopify.png", alt: "Shopify", width: 72, height: 20 },
  { src: "/assets/logos/accenture.png", alt: "Accenture", width: 80, height: 20 },
  { src: "/assets/logos/giphy.png", alt: "Giphy", width: 56, height: 20 },
  { src: "/assets/logos/webflow.png", alt: "Webflow", width: 72, height: 20 },
  { src: "/assets/logos/openai.png", alt: "OpenAI", width: 72, height: 20 },
  { src: "/assets/logos/microsoft.png", alt: "Microsoft", width: 80, height: 20 },
  { src: "/assets/logos/alloy.png", alt: "Alloy", width: 64, height: 20 },
];

export function TrustMarquee() {
  return (
    <div className="mt-auto pt-16">
      <p className="text-sm text-[rgba(255,255,255,0.52)]">
        Trusted by teams at{" "}
        <span className="text-[rgba(255,255,255,0.92)]">
          world&apos;s leading organizations
        </span>
      </p>
      <div
        className="mt-6 overflow-hidden opacity-50"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          className="trust-marquee-track flex w-max items-center gap-[57px]"
        >
          {[...TRUST_LOGOS, ...TRUST_LOGOS].map((logo, i) => (
            <Image
              key={`${logo.alt}-${i}`}
              src={logo.src}
              alt={logo.alt}
              width={logo.width}
              height={logo.height}
              className="h-5 w-auto shrink-0 object-contain"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
