"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useEditorStore } from "@/store/editor-store";
import type { EditorAction } from "@/types/actions";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: EditorAction[];
  timestamp: string;
}

interface GenerationJob {
  taskId: string;
  prompt: string;
  status: "pending" | "processing" | "complete" | "failed";
  progress: number;
  error?: string;
}

export function ChatPanel({ projectId }: { projectId?: string }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const dispatch = useEditorStore((s) => s.dispatch);

  // Load conversation history on mount
  useEffect(() => {
    if (!projectId) return;
    fetch(`/api/projects/${projectId}/chat`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages?.length) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [projectId]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  // Poll generation status
  const pollGeneration = useCallback(
    (taskId: string, prompt: string) => {
      if (!projectId) return;
      if (pollRef.current) clearInterval(pollRef.current);

      pollRef.current = setInterval(async () => {
        try {
          const res = await fetch(
            `/api/projects/${projectId}/generate/${taskId}?prompt=${encodeURIComponent(prompt)}`
          );
          const data = await res.json();

          setGenerationJob((prev) =>
            prev?.taskId === taskId
              ? { ...prev, status: data.status, progress: data.progress, error: data.error }
              : prev
          );

          if (data.status === "complete" || data.status === "failed") {
            if (pollRef.current) clearInterval(pollRef.current);
            pollRef.current = null;

            if (data.status === "complete") {
              // Add the model to the scene
              const objId = crypto.randomUUID();
              dispatch({
                type: "ADD_OBJECT",
                id: objId,
                payload: {
                  name: prompt.slice(0, 40),
                  parentId: null,
                  assetId: `generated:${taskId}`,
                  visible: true,
                  locked: false,
                  transform: {
                    position: [0, 0, 0],
                    rotation: [0, 0, 0],
                    scale: [1, 1, 1],
                  },
                  materialOverrides: [],
                  metadata: {
                    generationTaskId: taskId,
                    thumbnailUrl: data.thumbnailUrl,
                    modelUrl: data.modelUrl,
                  },
                },
              });

              setMessages((prev) => [
                ...prev,
                {
                  role: "assistant",
                  content: `3D model "${prompt}" has been generated and added to your scene.`,
                  timestamp: new Date().toISOString(),
                },
              ]);
            }
          }
        } catch {
          // Polling failure — will retry on next interval
        }
      }, 3000);
    },
    [projectId, dispatch]
  );

  const handleSend = async () => {
    const trimmed = message.trim();
    if (!trimmed || sending || !projectId) return;

    const userMsg: ChatMessage = {
      role: "user",
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setSending(true);
    setExpanded(true);

    // Check if this is a generation request
    const genMatch = trimmed.match(
      /^(?:generate|create|make|build)\s+(?:a\s+)?(?:3d\s+)?(?:model\s+(?:of\s+)?)?(.+)/i
    );

    if (genMatch) {
      const genPrompt = genMatch[1].trim();
      try {
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: genPrompt }),
        });
        const data = await res.json();

        if (!res.ok) {
          const errorMsg =
            data.upgrade
              ? `You've reached your generation limit (${data.used}/${data.limit}). Upgrade your plan for more.`
              : data.error || "Generation failed";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: errorMsg, timestamp: new Date().toISOString() },
          ]);
        } else if (data.cached) {
          // Cached result — add to scene immediately
          const objId = crypto.randomUUID();
          dispatch({
            type: "ADD_OBJECT",
            id: objId,
            payload: {
              name: genPrompt.slice(0, 40),
              parentId: null,
              assetId: data.asset.id,
              visible: true,
              locked: false,
              transform: {
                position: [0, 0, 0],
                rotation: [0, 0, 0],
                scale: [1, 1, 1],
              },
              materialOverrides: [],
              metadata: { cached: true },
            },
          });
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Found a cached model for "${genPrompt}" and added it to your scene.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        } else {
          // Start polling
          setGenerationJob({
            taskId: data.taskId,
            prompt: genPrompt,
            status: "pending",
            progress: 0,
          });
          pollGeneration(data.taskId, genPrompt);
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: `Generating 3D model for "${genPrompt}"... This may take a minute.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to start generation. Please try again.", timestamp: new Date().toISOString() },
        ]);
      }
      setSending(false);
      return;
    }

    // Regular chat message — send to AI
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.error || "Something went wrong.", timestamp: new Date().toISOString() },
        ]);
      } else {
        // Dispatch any actions returned by the AI
        if (data.actions?.length) {
          for (const action of data.actions) {
            dispatch(action);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content: data.reply,
            actions: data.actions?.length ? data.actions : undefined,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to send message. Please try again.", timestamp: new Date().toISOString() },
      ]);
    }
    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className="absolute z-20"
      style={{
        width: 626,
        left: "calc(50% - 313px)",
        bottom: 16,
      }}
    >
      {/* Expanded messages area */}
      {expanded && messages.length > 0 && (
        <div
          style={{
            maxHeight: 300,
            marginBottom: 8,
            background: "#1F1F18",
            border: "1px solid rgba(222, 220, 209, 0.15)",
            borderRadius: 14,
            backdropFilter: "blur(16px)",
            overflow: "hidden",
          }}
        >
          <div className="flex items-center justify-between px-4 py-2">
            <span
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.5)",
              }}
            >
              Chat
            </span>
            <button
              onClick={() => setExpanded(false)}
              className="flex items-center justify-center hover:bg-white/5 transition-colors"
              style={{ width: 20, height: 20, borderRadius: 4 }}
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 2L8 8M8 2L2 8" stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          <div
            className="flex flex-col gap-2 overflow-y-auto px-4 pb-3"
            style={{ maxHeight: 260 }}
          >
            {messages.map((msg, i) => (
              <div
                key={i}
                className="flex flex-col"
                style={{
                  alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                }}
              >
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: msg.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px",
                    background: msg.role === "user" ? "rgba(124, 196, 248, 0.15)" : "rgba(62, 62, 62, 0.5)",
                    fontSize: 12,
                    lineHeight: "18px",
                    color: "rgba(255, 255, 255, 0.85)",
                    fontFamily: "'Spline Sans', sans-serif",
                  }}
                >
                  {msg.content}
                </div>
                {msg.actions && msg.actions.length > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      color: "rgba(124, 196, 248, 0.6)",
                      marginTop: 2,
                      fontFamily: "'Spline Sans', sans-serif",
                    }}
                  >
                    {msg.actions.length} action{msg.actions.length > 1 ? "s" : ""} applied
                  </span>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>
      )}

      {/* Generation progress bar */}
      {generationJob && (generationJob.status === "pending" || generationJob.status === "processing") && (
        <div
          style={{
            marginBottom: 8,
            padding: "10px 16px",
            background: "#1F1F18",
            border: "1px solid rgba(222, 220, 209, 0.15)",
            borderRadius: 10,
            backdropFilter: "blur(16px)",
          }}
        >
          <div className="flex items-center justify-between" style={{ marginBottom: 6 }}>
            <span
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.7)",
              }}
            >
              Generating: {generationJob.prompt}
            </span>
            <span
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 10,
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              {generationJob.progress}%
            </span>
          </div>
          <div
            style={{
              height: 3,
              background: "rgba(255, 255, 255, 0.1)",
              borderRadius: 2,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${generationJob.progress}%`,
                background: "#7CC4F8",
                borderRadius: 2,
                transition: "width 500ms ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Main input container */}
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
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Start creating..."
              disabled={sending}
              className="w-full h-full bg-transparent text-white/90 placeholder:text-white/40 outline-none resize-none disabled:opacity-50"
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
            {/* Attach icon button (left) */}
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

            {/* Send / Audio buttons (right) */}
            <div className="flex items-center gap-1">
              {message.trim().length > 0 && (
                <button
                  onClick={handleSend}
                  disabled={sending}
                  title="Send"
                  className="flex items-center justify-center cursor-pointer hover:bg-white/10 transition-colors disabled:opacity-40"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: "rgba(124, 196, 248, 0.15)",
                    border: "none",
                  }}
                >
                  {sending ? (
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                      <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                      <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="#7CC4F8" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#7CC4F8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
              )}
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
            Vibe3D AI
          </span>

          {messages.length > 0 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="ml-auto flex items-center gap-1 hover:bg-white/5 transition-colors"
              style={{
                padding: "2px 8px",
                borderRadius: 4,
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 10,
                color: "rgba(255, 255, 255, 0.4)",
              }}
            >
              {expanded ? "Hide" : "Show"} chat ({messages.length})
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
