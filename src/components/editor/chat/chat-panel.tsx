"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useEditorStore } from "@/store/editor-store";
import { useGenerationStore } from "@/store/generation-store";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications } from "@/hooks/use-push-notifications";
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

/** Clean a generation prompt into a proper object name */
function cleanPromptForName(prompt: string): string {
  return (
    prompt
      // Remove common generation prefixes
      .replace(/^(generate|create|make|build|spawn|add)\s+/i, "")
      // Remove articles
      .replace(/^(a|an|the|me a|me an)\s+/i, "")
      // Remove "3d model of" type phrases
      .replace(/^3d\s*(model\s*)?(of\s*)?/i, "")
      // Capitalize first letter
      .replace(/^./, (c) => c.toUpperCase())
      // Truncate
      .slice(0, 40)
      .trim() || "Generated Model"
  );
}

export function ChatPanel({ projectId, isAuthenticated = true }: { projectId?: string; isAuthenticated?: boolean }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // One-shot gate to prevent duplicate handling of completed generations
  const generationHandledRef = useRef(false);
  // Ref to hold the current poll timeout so we can cancel it
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dispatch = useEditorStore((s) => s.dispatch);
  const supabase = createClient();
  const { notify } = usePushNotifications();

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

  // Ref for auto-trigger
  const autoTriggeredRef = useRef(false);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, []);

  // Poll generation status using chained setTimeout (not setInterval)
  const pollGeneration = useCallback(
    (taskId: string, prompt: string) => {
      if (!projectId) return;

      // Reset the one-shot gate for this new generation
      generationHandledRef.current = false;

      // Cancel any existing poll chain
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      async function poll() {
        // Already handled — don't poll again
        if (generationHandledRef.current) return;

        try {
          const res = await fetch(
            `/api/projects/${projectId}/generate/${taskId}?prompt=${encodeURIComponent(prompt)}`
          );
          const data = await res.json();

          // Already handled by a concurrent callback — bail
          if (generationHandledRef.current) return;

          if (data.status === "complete") {
            // Gate: prevent re-entry from any concurrent poll
            generationHandledRef.current = true;

            // Extract mesh segmentation info from response
            const resMeshNames: string[] = data.meshNames ?? [];
            const resMeshCount: number = data.meshCount ?? 0;

            // Add the model to the scene
            const objId = crypto.randomUUID();
            dispatch({
              type: "ADD_OBJECT",
              id: objId,
              payload: {
                name: cleanPromptForName(prompt),
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
                  meshNames: resMeshNames,
                  meshCount: resMeshCount,
                },
              },
            });

            const meshInfo =
              resMeshCount >= 2
                ? ` It has ${resMeshCount} editable parts: ${resMeshNames.join(", ")}.`
                : "";

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `3D model "${cleanPromptForName(prompt)}" has been generated and added to your scene.${meshInfo}`,
                timestamp: new Date().toISOString(),
              },
            ]);

            setGenerationJob(null);
            useGenerationStore.getState().clearGeneration();

            // Browser push notification
            notify(`3D model ready`, {
              body: `"${cleanPromptForName(prompt)}" has been generated and added to your scene.`,
              tag: `generation-${taskId}`,
            });

            return; // don't schedule next poll
          }

          if (data.status === "failed") {
            generationHandledRef.current = true;

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Generation failed: ${data.error || "Unknown error"}. Please try again.`,
                timestamp: new Date().toISOString(),
              },
            ]);

            setGenerationJob(null);
            useGenerationStore.getState().clearGeneration();

            return; // don't schedule next poll
          }

          // Still pending/processing — update progress and schedule next poll
          if (data.progress !== undefined) {
            useGenerationStore.getState().setProgress(data.progress);
          }

          setGenerationJob((prev) =>
            prev?.taskId === taskId
              ? { ...prev, status: data.status, progress: data.progress ?? prev.progress, error: data.error }
              : prev
          );

          if (!generationHandledRef.current) {
            pollTimeoutRef.current = setTimeout(poll, 3000);
          }
        } catch {
          // Polling failure — retry unless already handled
          if (!generationHandledRef.current) {
            pollTimeoutRef.current = setTimeout(poll, 3000);
          }
        }
      }

      // Start first poll after a short delay
      pollTimeoutRef.current = setTimeout(poll, 3000);
    },
    [projectId, dispatch, notify]
  );

  // Auto-trigger generation from dashboard prompt (stored in sessionStorage)
  useEffect(() => {
    if (!projectId || autoTriggeredRef.current) return;
    const pendingPrompt = sessionStorage.getItem("vibe3d-pending-prompt");
    if (!pendingPrompt) return;

    autoTriggeredRef.current = true;
    sessionStorage.removeItem("vibe3d-pending-prompt");

    // Show loading overlay immediately before API call returns
    useGenerationStore.getState().setGenerating(pendingPrompt);

    // Auto-submit the generation
    (async () => {
      setExpanded(true);
      const userMsg: ChatMessage = {
        role: "user",
        content: pendingPrompt,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      try {
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: pendingPrompt }),
        });
        const data = await res.json();

        if (!res.ok) {
          useGenerationStore.getState().clearGeneration();
          const errorMsg = data.upgrade
            ? `Generation limit reached (${data.used}/${data.limit}). Upgrade your plan.`
            : data.error || "Generation failed";
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: errorMsg, timestamp: new Date().toISOString() },
          ]);
        } else if (data.cached) {
          useGenerationStore.getState().clearGeneration();
          const objId = crypto.randomUUID();
          dispatch({
            type: "ADD_OBJECT",
            id: objId,
            payload: {
              name: cleanPromptForName(pendingPrompt),
              parentId: null,
              assetId: data.asset.id,
              visible: true,
              locked: false,
              transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
              materialOverrides: [],
              metadata: { cached: true },
            },
          });
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Found a cached model for "${cleanPromptForName(pendingPrompt)}" and added it to your scene.`, timestamp: new Date().toISOString() },
          ]);
        } else {
          setGenerationJob({ taskId: data.taskId, prompt: pendingPrompt, status: "pending", progress: 0 });
          pollGeneration(data.taskId, pendingPrompt);
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Generating 3D model for "${cleanPromptForName(pendingPrompt)}"... This may take a minute.`, timestamp: new Date().toISOString() },
          ]);
        }
      } catch {
        useGenerationStore.getState().clearGeneration();
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to start generation. Please try again.", timestamp: new Date().toISOString() },
        ]);
      }
    })();
  }, [projectId, dispatch, pollGeneration]);

  const handleImageUpload = useCallback(async (file: File) => {
    if (!projectId) return;
    setUploadingImage(true);

    try {
      // Upload to Supabase Storage
      const ext = file.name.split(".").pop() || "png";
      const path = `image-to-3d/${projectId}/${crypto.randomUUID()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Get signed URL
      const { data: urlData } = await supabase.storage
        .from("assets")
        .createSignedUrl(path, 3600);

      if (!urlData?.signedUrl) throw new Error("Failed to get signed URL");

      // Show preview
      setImagePreview(URL.createObjectURL(file));
      setExpanded(true);

      const userMsg: ChatMessage = {
        role: "user",
        content: `Generate 3D model from uploaded image`,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);

      // Show loading overlay
      useGenerationStore.getState().setGenerating("Image-to-3D");

      // Call generate with imageUrl
      const res = await fetch(`/api/projects/${projectId}/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "image-to-3d", imageUrl: urlData.signedUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        useGenerationStore.getState().clearGeneration();
        const errorMsg = data.upgrade
          ? `Generation limit reached (${data.used}/${data.limit}). Upgrade your plan.`
          : data.error || "Generation failed";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: errorMsg, timestamp: new Date().toISOString() },
        ]);
      } else if (data.cached) {
        useGenerationStore.getState().clearGeneration();
        const objId = crypto.randomUUID();
        dispatch({
          type: "ADD_OBJECT",
          id: objId,
          payload: {
            name: "Image-to-3D Model",
            parentId: null,
            assetId: data.asset.id,
            visible: true,
            locked: false,
            transform: { position: [0, 0, 0], rotation: [0, 0, 0], scale: [1, 1, 1] },
            materialOverrides: [],
            metadata: { cached: true },
          },
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Found a cached model and added it to your scene.", timestamp: new Date().toISOString() },
        ]);
      } else {
        setGenerationJob({ taskId: data.taskId, prompt: "Image-to-3D", status: "pending", progress: 0 });
        pollGeneration(data.taskId, "Image-to-3D");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Generating 3D model from your image... This may take a minute.", timestamp: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      useGenerationStore.getState().clearGeneration();
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to process image. Please try again.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setUploadingImage(false);
      setImagePreview(null);
    }
  }, [projectId, dispatch, pollGeneration, supabase.storage]);

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
      /(?:^|\b)(?:generate|create|make|build|spawn|add)\s+(?:a\s+|an\s+|me\s+(?:a\s+|an\s+)?|3d\s+(?:model\s+)?(?:of\s+)?)?(.+)/i
    );

    if (genMatch) {
      const genPrompt = genMatch[1].trim();

      // Show loading overlay immediately
      useGenerationStore.getState().setGenerating(genPrompt);

      try {
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: genPrompt }),
        });
        const data = await res.json();

        if (!res.ok) {
          useGenerationStore.getState().clearGeneration();
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
          useGenerationStore.getState().clearGeneration();
          const objId = crypto.randomUUID();
          dispatch({
            type: "ADD_OBJECT",
            id: objId,
            payload: {
              name: cleanPromptForName(genPrompt),
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
              content: `Found a cached model for "${cleanPromptForName(genPrompt)}" and added it to your scene.`,
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
              content: `Generating 3D model for "${cleanPromptForName(genPrompt)}"... This may take a minute.`,
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      } catch {
        useGenerationStore.getState().clearGeneration();
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
      const currentScene = useEditorStore.getState().getSerializableState();
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sceneState: currentScene }),
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
              placeholder={isAuthenticated ? "Start creating..." : "Sign in to use AI chat"}
              disabled={sending || !isAuthenticated}
              className="w-full h-full bg-transparent text-white/90 placeholder:text-white/40 outline-none resize-none disabled:opacity-50"
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 11,
                letterSpacing: "0.3px",
                lineHeight: "16px",
                paddingLeft: message.length === 0 ? 6 : 0,
              }}
            />
            {!isAuthenticated && (
              <a
                href="/sign-in"
                className="absolute bottom-2 left-4 text-[10px] underline"
                style={{ color: "#7CC4F8", fontFamily: "'Spline Sans', sans-serif" }}
              >
                Sign in to use AI chat
              </a>
            )}
          </div>

          {/* Image upload preview */}
          {(uploadingImage || imagePreview) && (
            <div className="flex items-center gap-2 px-3 pb-1">
              {imagePreview && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Upload" className="h-8 w-8 rounded object-cover" />
              )}
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "'Spline Sans', sans-serif" }}>
                {uploadingImage ? "Uploading & generating..." : "Processing image..."}
              </span>
            </div>
          )}

          {/* Bottom row inside textarea container */}
          <div className="flex items-center justify-between px-3 pb-3">
            {/* Attach / Image upload button (left) */}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleImageUpload(file);
                e.target.value = "";
              }}
            />
            <button
              title="Upload image for 3D generation"
              disabled={uploadingImage}
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center justify-center cursor-pointer hover:bg-white/5 transition-colors disabled:opacity-40"
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
                alt="Upload Image"
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
