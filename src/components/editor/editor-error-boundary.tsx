"use client";

import { Component } from "react";
import type { ReactNode, ErrorInfo } from "react";

type Props = {
  section: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.section}] Error:`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full flex-col items-center justify-center gap-3 p-4">
          <svg
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="font-[family-name:var(--font-spline-sans)] text-[12px] text-white/50">
            {this.props.section} encountered an error
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="rounded-[10px] bg-white/[0.08] px-3 py-1.5 font-[family-name:var(--font-spline-sans)] text-[11px] text-white/70 transition-colors hover:bg-white/[0.12]"
          >
            Try Again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
