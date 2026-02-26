"use client";

import { useState } from "react";
import Image from "next/image";

export function ChatPanel() {
  const [message, setMessage] = useState("");

  return (
    <div
      className="absolute z-20"
      style={{
        width: 626,
        height: 145,
        left: "calc(50% - 313px)",
        bottom: 16,
      }}
    >
      <div
        style={{
          width: 626,
          height: 145,
          background: "#1F1F18",
          border: "1px solid rgba(222, 220, 209, 0.15)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          position: "relative",
        }}
      >
        {/* Inner textarea container */}
        <div
          style={{
            position: "absolute",
            top: 2,
            left: 2,
            width: 622,
            height: 108,
            background: "rgba(62, 62, 62, 0.5)",
            boxShadow:
              "0px 20.6px 16.5px rgba(26, 0, 108, 0.04), 0px 2.55px 2.04px rgba(26, 0, 108, 0.02)",
            borderRadius: 18,
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Textarea area */}
          <div className="relative flex-1 px-4 pt-3">
            {/* Blue cursor indicator bar */}
            {message.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 16,
                  top: 14,
                  width: 0.92,
                  height: 13.85,
                  background: "#39A6FF",
                  borderRadius: 1,
                }}
              />
            )}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Start creating..."
              className="w-full h-full bg-transparent text-white/90 placeholder:text-white/40 outline-none resize-none"
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 11,
                letterSpacing: "0.3px",
                lineHeight: "16px",
                paddingLeft: message.length === 0 ? 6 : 0,
              }}
            />
          </div>

          {/* Bottom row inside textarea container */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Attach icon button (left) — matches dashboard */}
            <button
              title="Attach"
              className="flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
              style={{
                width: 31,
                height: 31,
                borderRadius: 5.4,
                background: "transparent",
                border: "none",
              }}
            >
              <Image
                src="/assets/icons/dashboard-attach.svg"
                alt="Attach"
                width={20}
                height={20}
                style={{ opacity: 0.7 }}
              />
            </button>

            {/* Audio levels icon button (right) */}
            <button
              title="Voice Input"
              className="flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors"
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: "transparent",
                border: "none",
              }}
            >
              <Image
                src="/assets/icons/dashboard-audio.svg"
                alt="Audio"
                width={20}
                height={20}
                style={{ opacity: 0.7 }}
              />
            </button>
          </div>
        </div>

        {/* Model selector row (below the inner container) */}
        <div
          className="flex items-center gap-1.5 px-4"
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 33,
          }}
        >
          {/* Sparkle icon */}
          <Image
            src="/assets/icons/dashboard-sparkle.svg"
            alt="Sparkle"
            width={17}
            height={17}
            style={{ opacity: 0.5 }}
          />

          {/* Model name */}
          <span
            style={{
              fontFamily: "'Spline Sans', sans-serif",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.95)",
              letterSpacing: "0.3px",
            }}
          >
            NanoBanana
          </span>

          {/* Chevron down icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ opacity: 0.7 }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="white"
              strokeWidth="1.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
