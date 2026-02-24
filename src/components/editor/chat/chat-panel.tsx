"use client";

import { MessageSquare, Send } from "lucide-react";
import { useState } from "react";

/**
 * AI Chat panel — Phase 1 placeholder.
 * The full AI integration comes in Phase 4.
 */
export function ChatPanel() {
  const [message, setMessage] = useState("");

  return (
    <div className="flex h-full w-72 flex-col border-r border-editor-border bg-editor-surface">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-editor-border px-3 py-2">
        <MessageSquare size={14} className="text-editor-accent" />
        <h3 className="text-xs font-medium text-editor-text">AI Assistant</h3>
      </div>

      {/* Messages */}
      <div className="flex flex-1 items-center justify-center px-4 text-center">
        <div>
          <MessageSquare
            size={32}
            className="mx-auto mb-3 text-editor-text-dim"
          />
          <p className="text-xs text-editor-text-dim">
            AI chat will be available in Phase 4.
          </p>
          <p className="mt-1 text-[10px] text-editor-text-dim">
            Describe changes to your scene in natural language.
          </p>
        </div>
      </div>

      {/* Input */}
      <div className="border-t border-editor-border p-2">
        <div className="flex items-center gap-2 rounded-lg border border-editor-border bg-editor-bg px-3 py-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe a change..."
            disabled
            className="flex-1 bg-transparent text-xs text-editor-text placeholder:text-editor-text-dim outline-none disabled:cursor-not-allowed disabled:opacity-50"
          />
          <button
            disabled
            className="text-editor-text-dim disabled:opacity-30"
          >
            <Send size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
