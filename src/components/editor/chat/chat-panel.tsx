"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { useEditorStore } from "@/store/editor-store";
import { useGenerationStore } from "@/store/generation-store";
import { createClient } from "@/lib/supabase/client";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import type { EditorAction } from "@/types/actions";
import { getSpawnPosition } from "@/lib/scene-utils";
import { toast } from "@/store/toast-store";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  actions?: EditorAction[];
  timestamp: string;
  metadata?: Record<string, unknown>;
}

const GENERATION_STYLES = [
  { id: "realistic", label: "Realistic", icon: "\uD83C\uDFAF" },
  { id: "cartoon", label: "Cartoon", icon: "\uD83C\uDFA8" },
  { id: "low-poly", label: "Low Poly", icon: "\uD83D\uDC8E" },
  { id: "sculpture", label: "Sculpture", icon: "\uD83D\uDDFF" },
  { id: "pbr", label: "PBR", icon: "\u2728" },
] as const;

const SUGGESTIONS = [
  "Create a sports car",
  "Create a medieval castle",
  "Create a cute robot",
  "Create a modern chair",
  "Create a treasure chest",
  "Create a space helmet",
];

const SCENE_TEMPLATES = [
  {
    id: "desk-setup",
    label: "Desk Setup",
    icon: "\uD83D\uDDA5\uFE0F",
    prompt: "Create a modern desk setup with a desk, monitor, keyboard, desk lamp, and coffee mug",
  },
  {
    id: "living-room",
    label: "Living Room",
    icon: "\uD83D\uDECB\uFE0F",
    prompt: "Create a cozy living room with a sofa, coffee table, floor lamp, and bookshelf",
  },
  {
    id: "product-studio",
    label: "Product Studio",
    icon: "\uD83D\uDCF8",
    prompt: "Create a product photography studio with a white display table and two studio lights",
  },
  {
    id: "game-scene",
    label: "Game Scene",
    icon: "\uD83C\uDFAE",
    prompt: "Create a game scene with a treasure chest, wooden barrel, torch on a wall mount, and stone pedestal",
  },
  {
    id: "outdoor-cafe",
    label: "Outdoor Caf\u00E9",
    icon: "\u2615",
    prompt: "Create an outdoor caf\u00E9 scene with a small round table, two chairs, a potted plant, and a coffee cup",
  },
];

const PROVIDER_LABELS: Record<string, string> = {
  auto: "Vibe3D AI",
  meshy: "Vibe3D AI\u00B7M",
  tripo: "Vibe3D AI\u00B7T",
};

interface GenerationJob {
  taskId: string;
  prompt: string;
  status: "pending" | "processing" | "complete" | "failed";
  progress: number;
  error?: string;
  provider?: string;
  enhancedPrompt?: string;
  sourceImage?: string;
}

/** Clean a generation prompt into a proper object name */
function cleanPromptForName(prompt: string): string {
  return (
    prompt
      .replace(/^(please\s+)?/i, "")
      .replace(/^(generate|create|make|build|spawn|add)\s+/i, "")
      .replace(/^(me\s+)?(a|an|the)\s+/i, "")
      .replace(/^3d\s*(model\s*)?(of\s*)?/i, "")
      .replace(/^(new\s+)?/i, "")
      .replace(/\b(for\s+my\s+scene|to\s+the\s+scene|in\s+the\s+scene)\s*$/i, "")
      .replace(/^./, (c) => c.toUpperCase())
      .slice(0, 40)
      .trim() || "Generated Model"
  );
}

/** Determine if a user message is a 3D generation request (vs an edit/chat command) */
function isGenerationRequest(text: string): { isGen: boolean; prompt: string } {
  const lower = text.toLowerCase().trim();

  // Edit patterns — should go to AI chat, not 3D generation
  const editPatterns = [
    /^make\s+(it|the|that|this|them)\b/,
    /^make\s+\w+\s+(more|less|bigger|smaller|taller|shorter|wider|thinner)\b/,
    /^(change|set|update|modify|adjust|turn|paint|color|recolor)\b/,
    /\b(pink|red|blue|green|yellow|purple|orange|white|black|gray|grey|brown|gold|silver)\s*$/,
    /\b(visible|invisible|hidden|transparent|opaque)\s*$/,
    /\b(roughness|metalness|metallic|opacity|color|material|texture)\b/,
    /^(move|rotate|scale|resize|position|place|shift)\b/,
    /^(delete|remove|hide|show|lock|unlock|rename|duplicate|copy)\b/,
    /^(select|deselect|group|ungroup)\b/,
  ];

  if (editPatterns.some((p) => p.test(lower))) {
    return { isGen: false, prompt: "" };
  }

  // Generation patterns
  const genMatch = text.match(
    /(?:^|\b)(?:generate|create|build|spawn)\s+(?:a\s+|an\s+|me\s+(?:a\s+|an\s+)?|3d\s+(?:model\s+)?(?:of\s+)?)?(.+)/i
  );
  if (genMatch) return { isGen: true, prompt: genMatch[1].trim() };

  // "make a <noun>" or "add a <noun>" — only with articles (edit patterns already filtered)
  const makeMatch = text.match(
    /(?:^|\b)(?:make|add)\s+(?:a\s+|an\s+|me\s+(?:a\s+|an\s+)?)(.+)/i
  );
  if (makeMatch) return { isGen: true, prompt: makeMatch[1].trim() };

  return { isGen: false, prompt: "" };
}

/** Detect if a message describes a multi-object scene */
function isSceneRequest(message: string): boolean {
  const scenePatterns = [
    /(?:scene|setup|environment|room|desk|table|kitchen|office|bedroom|living room|workspace|studio)/i,
    /(?:with|including|containing|featuring)\s+(?:a|an|some|the)\s+\w+\s+(?:and|,)\s+/i,
    /(?:create|build|make|generate)\s+(?:a|an|my)\s+\w+\s+(?:scene|setup|room|space)/i,
  ];
  return scenePatterns.some((p) => p.test(message));
}

type InputMode = "text" | "image" | "scene";

function GenerationResultCard({ message }: { message: ChatMessage }) {
  const sourceImage = message.metadata?.sourceImage as string | undefined;
  const thumbnailUrl = message.metadata?.thumbnailUrl as string | undefined;
  const meshCount = message.metadata?.meshCount as number | undefined;
  const objectName = message.metadata?.objectName as string | undefined;
  const enhancedPrompt = message.metadata?.enhancedPrompt as string | undefined;

  return (
    <div
      className="flex flex-col"
      style={{ alignSelf: "flex-start", maxWidth: "85%" }}
    >
      <div
        style={{
          borderRadius: "12px 12px 12px 4px",
          background: "rgba(62, 62, 62, 0.5)",
          overflow: "hidden",
          fontFamily: "'Spline Sans', sans-serif",
        }}
      >
        {/* Side-by-side for image-to-3D, single thumbnail for text-to-3D */}
        {(sourceImage || thumbnailUrl) && (
          <div className="flex relative">
            {sourceImage && (
              <div className="relative" style={{ width: thumbnailUrl ? "50%" : "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={sourceImage} alt="Original" className="w-full h-32 object-cover" />
                <span
                  className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] text-white"
                  style={{ background: "rgba(0, 0, 0, 0.6)" }}
                >
                  Original
                </span>
              </div>
            )}
            {thumbnailUrl && (
              <div className="relative" style={{ width: sourceImage ? "50%" : "100%" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={thumbnailUrl}
                  alt={objectName || "Generated model"}
                  className="w-full h-32 object-cover"
                />
                <div
                  className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] text-white"
                  style={{ background: "rgba(0, 0, 0, 0.6)" }}
                >
                  3D Model
                </div>
              </div>
            )}
          </div>
        )}
        <div className="px-3 py-2">
          <p className="text-[12px] font-medium text-white/90">
            {objectName || "Generated Model"}
          </p>
          {meshCount !== undefined && meshCount > 1 && (
            <p className="text-[10px] text-white/40 mt-0.5">
              {meshCount} editable parts
            </p>
          )}
          <p className="text-[10px] text-white/40 mt-1">Added to scene</p>
          {enhancedPrompt && (
            <details className="mt-2">
              <summary className="text-[10px] text-white/30 cursor-pointer hover:text-white/50">
                View enhanced prompt
              </summary>
              <p className="text-[10px] text-white/30 mt-1 italic leading-relaxed">
                {enhancedPrompt}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export function ChatPanel({ projectId, isAuthenticated = true }: { projectId?: string; isAuthenticated?: boolean }) {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [isAITyping, setIsAITyping] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [generationJob, setGenerationJob] = useState<GenerationJob | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<string>("realistic");
  const [selectedProvider, setSelectedProvider] = useState<string>("auto");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [pendingImageFile, setPendingImageFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
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

  // Poll generation status using chained setTimeout with exponential backoff.
  // Supports two-step preview+refine: when the server returns "refining",
  // the client switches to polling the refine task ID.
  const pollGeneration = useCallback(
    (initialTaskId: string, prompt: string, provider?: string, extras?: { enhancedPrompt?: string; sourceImage?: string }) => {
      if (!projectId) return;

      // Reset the one-shot gate for this new generation
      generationHandledRef.current = false;

      // Cancel any existing poll chain
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }

      let delay = 3000;           // Start at 3s
      const MAX_DELAY = 15000;    // Cap at 15s
      const BACKOFF_FACTOR = 1.5;
      let pollCount = 0;
      const MAX_POLLS = 60;       // ~5 minutes with backoff

      // Mutable — may switch from preview task to refine task mid-poll
      let currentTaskId = initialTaskId;
      let isRefining = false;

      async function poll() {
        // Already handled — don't poll again
        if (generationHandledRef.current) return;

        pollCount++;

        // Give up after too many polls
        if (pollCount > MAX_POLLS) {
          generationHandledRef.current = true;
          setGenerationJob(null);
          useGenerationStore.getState().clearGeneration();
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content: "Generation is taking longer than expected. The model may still be processing — try refreshing the page in a minute to check.",
              timestamp: new Date().toISOString(),
            },
          ]);
          return;
        }

        try {
          const refineParam = isRefining ? "&refine=true" : "";
          const providerParam = provider ? `&provider=${provider}` : "";
          const res = await fetch(
            `/api/projects/${projectId}/generate/${currentTaskId}?prompt=${encodeURIComponent(prompt)}${refineParam}${providerParam}`
          );
          const data = await res.json();

          // Already handled by a concurrent callback — bail
          if (generationHandledRef.current) return;

          // Map progress: preview phase = 0-50%, refine phase = 50-100%
          const rawProgress: number = data.progress ?? 0;
          const displayProgress = isRefining
            ? 50 + Math.floor(rawProgress / 2)
            : Math.floor(rawProgress / 2);

          useGenerationStore.getState().setProgress(displayProgress);

          setGenerationJob((prev) =>
            prev
              ? { ...prev, status: data.status, progress: displayProgress, error: data.error }
              : prev
          );

          // Preview completed — server started a refine task
          if (data.status === "refining" && data.refineTaskId) {
            currentTaskId = data.refineTaskId;
            isRefining = true;
            delay = 3000; // Reset backoff for refine phase
            useGenerationStore.getState().setProgress(50);
            pollTimeoutRef.current = setTimeout(poll, delay);
            return;
          }

          if (data.status === "complete" && !generationHandledRef.current) {
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
                assetId: `generated:${currentTaskId}`,
                visible: true,
                locked: false,
                transform: {
                  position: getSpawnPosition(useEditorStore.getState().scene),
                  rotation: [0, 0, 0],
                  scale: [1, 1, 1],
                },
                materialOverrides: [],
                metadata: {
                  generationTaskId: currentTaskId,
                  thumbnailUrl: data.thumbnailUrl,
                  modelUrl: data.modelUrl,
                  storagePath: data.storagePath,
                  meshNames: resMeshNames,
                  meshCount: resMeshCount,
                  provider: provider || data.provider,
                },
              },
            });

            // Build mesh info summary — truncate to first 6 names
            let meshInfo = "";
            if (resMeshCount >= 2) {
              const displayNames = resMeshNames.slice(0, 6);
              const remaining = resMeshCount - displayNames.length;
              const nameList = displayNames.join(", ") +
                (remaining > 0 ? `, and ${remaining} more` : "");
              meshInfo = ` It has ${resMeshCount} editable parts: ${nameList}. You can color each part individually.`;
            }

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `3D model "${cleanPromptForName(prompt)}" has been generated and added to your scene.${meshInfo}`,
                timestamp: new Date().toISOString(),
                metadata: {
                  type: "generation_complete",
                  thumbnailUrl: data.thumbnailUrl,
                  meshCount: resMeshCount,
                  objectName: cleanPromptForName(prompt),
                  enhancedPrompt: extras?.enhancedPrompt,
                  sourceImage: extras?.sourceImage,
                },
              },
            ]);

            setGenerationJob(null);
            useGenerationStore.getState().clearGeneration();

            // Browser push notification
            notify(`3D model ready`, {
              body: `"${cleanPromptForName(prompt)}" has been generated and added to your scene.`,
              tag: `generation-${currentTaskId}`,
            });

            return; // don't schedule next poll
          }

          if (data.status === "failed") {
            generationHandledRef.current = true;

            // Build user-friendly error message
            let errorMessage: string;
            const rawError: string = data.error || "";

            if (rawError.toLowerCase().includes("busy") || rawError.includes("503")) {
              errorMessage = "The AI generation service is currently busy. This is temporary — please try again in a minute or two.";
            } else if (rawError.toLowerCase().includes("timeout")) {
              errorMessage = "The generation request timed out. Try a simpler prompt or try again shortly.";
            } else if (rawError) {
              const cleanError = rawError.replace(/\.+$/, "");
              errorMessage = `Generation failed: ${cleanError}. You can try again with the same or a different prompt.`;
            } else {
              errorMessage = "Generation failed unexpectedly. Please try again.";
            }

            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: errorMessage,
                timestamp: new Date().toISOString(),
              },
            ]);

            setGenerationJob(null);
            useGenerationStore.getState().clearGeneration();

            return; // don't schedule next poll
          }

          // Still pending/processing — schedule next poll with backoff
          if (!generationHandledRef.current) {
            delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY);
            pollTimeoutRef.current = setTimeout(poll, delay);
          }
        } catch {
          // Network error — retry with backoff unless already handled
          if (!generationHandledRef.current && pollCount < MAX_POLLS) {
            if (pollCount === 3) toast.warning("Network issue — retrying generation check...");
            delay = Math.min(delay * BACKOFF_FACTOR, MAX_DELAY);
            pollTimeoutRef.current = setTimeout(poll, delay);
          }
        }
      }

      // Start first poll after initial delay
      pollTimeoutRef.current = setTimeout(poll, delay);
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
          body: JSON.stringify({ prompt: pendingPrompt, style: selectedStyle, provider: "auto", enhance: enhancePrompt }),
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
              transform: { position: getSpawnPosition(useEditorStore.getState().scene), rotation: [0, 0, 0], scale: [1, 1, 1] },
              materialOverrides: [],
              metadata: { cached: true },
            },
          });
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Found a cached model for "${cleanPromptForName(pendingPrompt)}" and added it to your scene.`, timestamp: new Date().toISOString() },
          ]);
        } else {
          const resolvedProvider = data.provider || "meshy";
          setGenerationJob({ taskId: data.taskId, prompt: pendingPrompt, status: "pending", progress: 0, provider: resolvedProvider, enhancedPrompt: data.enhancedPrompt });
          pollGeneration(data.taskId, pendingPrompt, resolvedProvider, { enhancedPrompt: data.enhancedPrompt });
          setMessages((prev) => [
            ...prev,
            { role: "assistant", content: `Generating 3D model for "${cleanPromptForName(pendingPrompt)}"... This may take a minute.`, timestamp: new Date().toISOString() },
          ]);
        }
      } catch {
        useGenerationStore.getState().clearGeneration();
        toast.error("Connection lost — please check your network and try again.");
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
        body: JSON.stringify({ prompt: "image-to-3d", imageUrl: urlData.signedUrl, provider: selectedProvider }),
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
            transform: { position: getSpawnPosition(useEditorStore.getState().scene), rotation: [0, 0, 0], scale: [1, 1, 1] },
            materialOverrides: [],
            metadata: { cached: true },
          },
        });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Found a cached model and added it to your scene.", timestamp: new Date().toISOString() },
        ]);
      } else {
        const capturedImage = imagePreview || undefined;
        setGenerationJob({ taskId: data.taskId, prompt: "Image-to-3D", status: "pending", progress: 0, sourceImage: capturedImage });
        pollGeneration(data.taskId, "Image-to-3D", undefined, { sourceImage: capturedImage });
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Generating 3D model from your image... This may take a minute.", timestamp: new Date().toISOString() },
        ]);
      }
    } catch (err) {
      console.error("Image upload failed:", err);
      useGenerationStore.getState().clearGeneration();
      toast.error("Connection lost — please check your network and try again.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to process image. Please try again.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setUploadingImage(false);
      setImagePreview(null);
    }
  }, [projectId, dispatch, pollGeneration, supabase.storage, selectedProvider]);

  // --- Scene Builder ---

  const decomposeScene = useCallback(async (prompt: string) => {
    const res = await fetch(`/api/projects/${projectId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: prompt, mode: "scene_decompose" }),
    });
    const data = await res.json();
    return data.sceneObjects as {
      objects: Array<{
        name: string;
        prompt: string;
        position: [number, number, number];
        scale: [number, number, number];
      }>;
    };
  }, [projectId]);

  const pollGenerationForScene = useCallback((
    taskId: string,
    prompt: string,
    name: string,
    position: [number, number, number],
    scale: [number, number, number]
  ): Promise<void> => {
    return new Promise((resolve) => {
      let delay = 3000;
      let attempts = 0;
      const maxAttempts = 60;
      let isRefining = false;
      let currentTaskId = taskId;

      async function poll() {
        if (attempts >= maxAttempts) { resolve(); return; }
        attempts++;

        try {
          const refineParam = isRefining ? "&refine=true" : "";
          const res = await fetch(
            `/api/projects/${projectId}/generate/${currentTaskId}?prompt=${encodeURIComponent(prompt)}${refineParam}`
          );
          const data = await res.json();

          if (data.status === "refining" && data.refineTaskId) {
            currentTaskId = data.refineTaskId;
            isRefining = true;
            delay = 3000;
            useGenerationStore.getState().setProgress(50);
            setTimeout(poll, delay);
            return;
          }

          if (data.status === "complete" && data.modelUrl) {
            const objId = crypto.randomUUID();
            dispatch({
              type: "ADD_OBJECT",
              id: objId,
              payload: {
                name,
                parentId: null,
                assetId: `generated:${currentTaskId}`,
                visible: true,
                locked: false,
                transform: { position, rotation: [0, 0, 0], scale },
                materialOverrides: [],
                metadata: {
                  modelUrl: data.modelUrl,
                  thumbnailUrl: data.thumbnailUrl,
                  meshNames: data.meshNames,
                  meshCount: data.meshCount,
                  generationTaskId: currentTaskId,
                },
              },
            });
            resolve();
            return;
          }

          if (data.status === "failed") { resolve(); return; }

          const displayProgress = isRefining
            ? 50 + Math.floor((data.progress ?? 0) / 2)
            : Math.floor((data.progress ?? 0) / 2);
          useGenerationStore.getState().setProgress(displayProgress);

          delay = Math.min(delay * 1.3, 15000);
          setTimeout(poll, delay);
        } catch {
          delay = Math.min(delay * 1.5, 15000);
          setTimeout(poll, delay);
        }
      }

      setTimeout(poll, delay);
    });
  }, [projectId, dispatch]);

  const handleSceneGeneration = useCallback(async (prompt: string) => {
    if (!projectId) return;
    setExpanded(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", content: prompt, timestamp: new Date().toISOString() },
      { role: "assistant", content: `Planning your scene: "${prompt}"...`, timestamp: new Date().toISOString() },
    ]);

    try {
      const decomposition = await decomposeScene(prompt);
      const objects = decomposition.objects;

      // Initialize scene objects in the generation store
      useGenerationStore.getState().setGenerating(prompt);
      useGenerationStore.getState().setSceneObjects(
        objects.map((o) => ({ name: o.name, status: "pending" as const }))
      );

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Scene planned with ${objects.length} objects: ${objects.map((o) => o.name).join(", ")}. Generating each...`,
          timestamp: new Date().toISOString(),
        },
      ]);

      for (let i = 0; i < objects.length; i++) {
        const obj = objects[i];
        useGenerationStore.getState().updateSceneObjectStatus(i, "generating");
        useGenerationStore.getState().setProgress(0);

        try {
          const res = await fetch(`/api/projects/${projectId}/generate`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ prompt: obj.prompt, style: selectedStyle, provider: selectedProvider, enhance: enhancePrompt }),
          });
          const data = await res.json();

          if (!res.ok || data.error) {
            useGenerationStore.getState().updateSceneObjectStatus(i, "failed");
            setMessages((prev) => [
              ...prev,
              {
                role: "assistant",
                content: `Failed to generate ${obj.name}: ${data.error || "Unknown error"}. Continuing...`,
                timestamp: new Date().toISOString(),
              },
            ]);
            continue;
          }

          if (data.cached) {
            const objId = crypto.randomUUID();
            dispatch({
              type: "ADD_OBJECT",
              id: objId,
              payload: {
                name: obj.name,
                parentId: null,
                assetId: data.asset.id,
                visible: true,
                locked: false,
                transform: { position: obj.position, rotation: [0, 0, 0], scale: obj.scale },
                materialOverrides: [],
                metadata: { cached: true },
              },
            });
            useGenerationStore.getState().updateSceneObjectStatus(i, "complete");
            continue;
          }

          await pollGenerationForScene(data.taskId, obj.prompt, obj.name, obj.position, obj.scale);
          useGenerationStore.getState().updateSceneObjectStatus(i, "complete");
        } catch (err) {
          console.error(`Failed to generate ${obj.name}:`, err);
          useGenerationStore.getState().updateSceneObjectStatus(i, "failed");
        }
      }

      useGenerationStore.getState().clearGeneration();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `Scene complete! Generated ${objects.length} objects. You can select and edit each one individually.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      console.error("Scene generation failed:", err);
      useGenerationStore.getState().clearGeneration();
      toast.error("Connection lost — please check your network and try again.");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Failed to plan the scene. Please try again.", timestamp: new Date().toISOString() },
      ]);
    }
  }, [projectId, decomposeScene, pollGenerationForScene, dispatch, selectedStyle, selectedProvider]);

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

    // Check if this is a scene request (multiple objects) first
    const genResult = isGenerationRequest(trimmed);
    if (isSceneRequest(trimmed) && genResult.isGen) {
      // Remove the user message we just added — handleSceneGeneration adds its own
      setMessages((prev) => prev.slice(0, -1));
      setSending(false);
      await handleSceneGeneration(trimmed);
      return;
    }

    if (genResult.isGen) {
      const genPrompt = genResult.prompt;

      // Show loading overlay immediately
      useGenerationStore.getState().setGenerating(genPrompt);

      try {
        const res = await fetch(`/api/projects/${projectId}/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: genPrompt, style: selectedStyle, provider: selectedProvider, enhance: enhancePrompt }),
        });
        const data = await res.json();

        if (!res.ok) {
          useGenerationStore.getState().clearGeneration();
          const errorMsg =
            data.upgrade
              ? `You've reached your generation limit (${data.used}/${data.limit}). Upgrade your plan for more.`
              : data.error || "Generation failed";
          toast.error(errorMsg);
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
                position: getSpawnPosition(useEditorStore.getState().scene),
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
          // Start polling — pass resolved provider for correct status checks
          const resolvedProvider = data.provider || "meshy";
          setGenerationJob({
            taskId: data.taskId,
            prompt: genPrompt,
            status: "pending",
            progress: 0,
            provider: resolvedProvider,
            enhancedPrompt: data.enhancedPrompt,
          });
          pollGeneration(data.taskId, genPrompt, resolvedProvider, { enhancedPrompt: data.enhancedPrompt });
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
        toast.error("Connection lost — please check your network and try again.");
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Failed to start generation. Please try again.", timestamp: new Date().toISOString() },
        ]);
      }
      setSending(false);
      return;
    }

    // Regular chat message — send to AI
    setIsAITyping(true);
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
        { role: "assistant", content: "Failed to send message. Please check your connection and try again.", timestamp: new Date().toISOString() },
      ]);
    }
    setIsAITyping(false);
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
      className={`absolute z-20 ${isDragOver ? "ring-2 ring-indigo-500/50 ring-inset rounded-[20px]" : ""}`}
      style={{
        width: 626,
        left: "calc(50% - 313px)",
        bottom: 16,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith("image/")) {
          handleImageUpload(file);
        }
      }}
    >
      {isDragOver && (
        <div className="absolute inset-0 bg-indigo-500/10 flex items-center justify-center z-10 pointer-events-none rounded-[20px]">
          <div className="text-sm text-indigo-400 font-medium font-body">
            Drop image to generate 3D model
          </div>
        </div>
      )}

      {/* Suggestion chips when chat is empty */}
      {messages.length === 0 && !expanded && (
        <div
          style={{
            marginBottom: 8,
            padding: "12px 16px",
            background: "#1F1F18",
            border: "1px solid rgba(222, 220, 209, 0.15)",
            borderRadius: 14,
            backdropFilter: "blur(16px)",
          }}
        >
          <p
            style={{
              fontFamily: "'Spline Sans', sans-serif",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.35)",
              marginBottom: 8,
            }}
          >
            Try one of these:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                className="px-3 py-1.5 rounded-full text-[11px] transition-colors"
                style={{
                  border: "1px solid rgba(222, 220, 209, 0.15)",
                  color: "rgba(255, 255, 255, 0.52)",
                  background: "transparent",
                  fontFamily: "'Spline Sans', sans-serif",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.7)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(255, 255, 255, 0.52)";
                }}
                onClick={() => setMessage(s)}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Scene templates */}
          <div style={{ marginTop: 10 }}>
            <p
              style={{
                fontFamily: "'Spline Sans', sans-serif",
                fontSize: 11,
                color: "rgba(255, 255, 255, 0.35)",
                marginBottom: 6,
              }}
            >
              Or generate a full scene:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {SCENE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] transition-colors"
                  style={{
                    border: "1px solid rgba(222, 220, 209, 0.15)",
                    color: "rgba(255, 255, 255, 0.52)",
                    background: "transparent",
                    fontFamily: "'Spline Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                    e.currentTarget.style.color = "rgba(165, 180, 252, 0.9)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.color = "rgba(255, 255, 255, 0.52)";
                  }}
                  onClick={() => handleSceneGeneration(t.prompt)}
                >
                  <span>{t.icon}</span>
                  <span>{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

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
            {messages.map((msg, i) =>
              msg.metadata?.type === "generation_complete" ? (
                <GenerationResultCard key={i} message={msg} />
              ) : (
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
              )
            )}
            {isAITyping && (
              <div className="flex justify-start">
                <div
                  className="px-4 py-3"
                  style={{
                    borderRadius: "12px 12px 12px 4px",
                    background: "rgba(62, 62, 62, 0.5)",
                  }}
                >
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-white/30 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
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

      {/* Mode selector tabs */}
      <div
        className="flex items-center gap-0.5 mb-1.5"
        style={{
          padding: "2px",
          background: "rgba(31, 31, 24, 0.8)",
          border: "1px solid rgba(222, 220, 209, 0.1)",
          borderRadius: 10,
          width: "fit-content",
        }}
      >
        {(
          [
            { mode: "text" as InputMode, label: "Text to 3D", icon: "T" },
            { mode: "image" as InputMode, label: "Image to 3D", icon: null },
            { mode: "scene" as InputMode, label: "Scene Builder", icon: null },
          ] as const
        ).map((tab) => (
          <button
            key={tab.mode}
            onClick={() => setInputMode(tab.mode)}
            className="transition-colors"
            style={{
              padding: "5px 12px",
              borderRadius: 8,
              fontFamily: "'Spline Sans', sans-serif",
              fontSize: 11,
              letterSpacing: "0.2px",
              color: inputMode === tab.mode ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.4)",
              background: inputMode === tab.mode ? "rgba(62, 62, 62, 0.7)" : "transparent",
              border: "none",
              cursor: "pointer",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Main input container */}
      <div
        style={{
          width: 626,
          minHeight: inputMode === "image" ? 180 : inputMode === "scene" ? 200 : 145,
          background: "#1F1F18",
          border: "1px solid rgba(222, 220, 209, 0.15)",
          backdropFilter: "blur(16px)",
          borderRadius: 20,
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Inner content container */}
        <div
          style={{
            margin: 2,
            flex: 1,
            background: "rgba(62, 62, 62, 0.5)",
            boxShadow:
              "0px 20.6px 16.5px rgba(26, 0, 108, 0.04), 0px 2.55px 2.04px rgba(26, 0, 108, 0.02)",
            borderRadius: 18,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          {/* ===== TEXT MODE ===== */}
          {inputMode === "text" && (
            <>
              <div className="relative flex-1 px-4 pt-3">
                <textarea
                  ref={textareaRef}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isAuthenticated ? "Describe what you want to create..." : "Sign in to use AI chat"}
                  disabled={sending || !isAuthenticated}
                  className="w-full h-full bg-transparent text-white/90 placeholder:text-white/40 outline-none resize-none disabled:opacity-50"
                  style={{
                    fontFamily: "'Spline Sans', sans-serif",
                    fontSize: 11,
                    letterSpacing: "0.3px",
                    lineHeight: "16px",
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
              <div className="flex items-center justify-between px-3 pb-3">
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
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: "transparent",
                    border: "none",
                  }}
                >
                  <Image
                    src="/assets/icons/dashboard-attach.svg"
                    alt="Upload Image"
                    width={40}
                    height={40}
                    style={{ opacity: 0.7 }}
                  />
                </button>
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
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: "transparent",
                      border: "none",
                    }}
                  >
                    <Image
                      src="/assets/icons/dashboard-audio.svg"
                      alt="Audio"
                      width={40}
                      height={40}
                      style={{ opacity: 0.7 }}
                    />
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ===== IMAGE MODE ===== */}
          {inputMode === "image" && (
            <div className="flex flex-col flex-1">
              {!pendingImageFile ? (
                <div
                  className="flex-1 flex flex-col items-center justify-center cursor-pointer m-2 rounded-xl transition-colors"
                  style={{
                    border: "2px dashed rgba(124, 196, 248, 0.25)",
                    background: isDragOver ? "rgba(124, 196, 248, 0.08)" : "rgba(124, 196, 248, 0.03)",
                    minHeight: 100,
                  }}
                  onClick={() => imageInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDragOver(false);
                    const file = e.dataTransfer.files[0];
                    if (file && file.type.startsWith("image/")) {
                      setPendingImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                >
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setPendingImageFile(file);
                        setImagePreview(URL.createObjectURL(file));
                      }
                      e.target.value = "";
                    }}
                  />
                  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" className="mb-2 opacity-40">
                    <rect x="3" y="5" width="22" height="18" rx="3" stroke="rgba(124,196,248,0.7)" strokeWidth="1.5" />
                    <circle cx="10" cy="12" r="2.5" stroke="rgba(124,196,248,0.7)" strokeWidth="1.2" />
                    <path d="M3 19L9 14L13 17L19 11L25 17" stroke="rgba(124,196,248,0.7)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <p style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 12, color: "rgba(124, 196, 248, 0.7)" }}>
                    Drop an image here or click to browse
                  </p>
                  <p style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 4 }}>
                    PNG, JPG, or WebP — clear photos with one subject work best
                  </p>
                </div>
              ) : (
                <div className="flex-1 flex items-center gap-3 px-4 py-3">
                  <div className="relative flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imagePreview || ""}
                      alt="Selected image"
                      className="rounded-lg object-cover border border-white/10"
                      style={{ width: 80, height: 80 }}
                    />
                    <button
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-[#1F1F18] border border-white/15 text-white/50 hover:text-white flex items-center justify-center text-[9px]"
                      onClick={() => {
                        setPendingImageFile(null);
                        if (imagePreview) URL.revokeObjectURL(imagePreview);
                        setImagePreview(null);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex flex-col gap-2 flex-1">
                    <p style={{ fontFamily: "'Spline Sans', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.7)" }}>
                      {pendingImageFile.name}
                    </p>
                    <button
                      onClick={() => {
                        if (pendingImageFile) {
                          handleImageUpload(pendingImageFile);
                          setPendingImageFile(null);
                        }
                      }}
                      disabled={uploadingImage}
                      className="flex items-center justify-center gap-1.5 py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
                      style={{
                        background: "rgba(124, 196, 248, 0.2)",
                        border: "1px solid rgba(124, 196, 248, 0.3)",
                        color: "#7CC4F8",
                        fontFamily: "'Spline Sans', sans-serif",
                        fontSize: 12,
                        fontWeight: 500,
                        cursor: uploadingImage ? "default" : "pointer",
                      }}
                    >
                      {uploadingImage ? (
                        <>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="animate-spin">
                            <circle cx="7" cy="7" r="5.5" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
                            <path d="M12.5 7A5.5 5.5 0 0 0 7 1.5" stroke="#7CC4F8" strokeWidth="1.5" strokeLinecap="round" />
                          </svg>
                          Generating...
                        </>
                      ) : (
                        "Generate 3D Model from Image"
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Image-to-3D tips */}
              {!pendingImageFile && (
                <div className="px-3 pb-2">
                  <div className="flex items-center gap-3" style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", fontFamily: "'Spline Sans', sans-serif" }}>
                    <span>Tips: single object</span>
                    <span>clean background</span>
                    <span>good lighting</span>
                    <span>no text overlays</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ===== SCENE BUILDER MODE ===== */}
          {inputMode === "scene" && (
            <div className="flex flex-col flex-1 px-3 py-3 gap-2">
              <div className="flex flex-wrap gap-1.5">
                {SCENE_TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] transition-colors"
                    style={{
                      border: "1px solid rgba(222, 220, 209, 0.12)",
                      color: "rgba(255, 255, 255, 0.55)",
                      background: "rgba(255, 255, 255, 0.03)",
                      fontFamily: "'Spline Sans', sans-serif",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(99, 102, 241, 0.1)";
                      e.currentTarget.style.color = "rgba(165, 180, 252, 0.9)";
                      e.currentTarget.style.borderColor = "rgba(99, 102, 241, 0.3)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
                      e.currentTarget.style.color = "rgba(255, 255, 255, 0.55)";
                      e.currentTarget.style.borderColor = "rgba(222, 220, 209, 0.12)";
                    }}
                    onClick={() => handleSceneGeneration(t.prompt)}
                  >
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex gap-2 flex-1">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Or describe your scene: 'A cozy reading nook with a beanbag, side table, and floor lamp'"
                  className="flex-1 bg-transparent text-white/90 placeholder:text-white/30 outline-none resize-none"
                  style={{
                    fontFamily: "'Spline Sans', sans-serif",
                    fontSize: 11,
                    lineHeight: "16px",
                    minHeight: 48,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && message.trim()) {
                      e.preventDefault();
                      handleSceneGeneration(message.trim());
                      setMessage("");
                    }
                  }}
                />
                {message.trim() && (
                  <button
                    onClick={() => {
                      handleSceneGeneration(message.trim());
                      setMessage("");
                    }}
                    className="self-end flex items-center justify-center"
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(124, 196, 248, 0.15)",
                      border: "none",
                      cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M3 8H13M13 8L9 4M13 8L9 12" stroke="#7CC4F8" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Image upload preview — below the input area (text mode only) */}
        {inputMode === "text" && imagePreview && (
          <div
            className="flex items-center gap-2 px-4"
            style={{
              height: 36,
              flexShrink: 0,
            }}
          >
            <div className="relative inline-block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imagePreview} alt="Upload preview" className="h-8 w-8 rounded-md object-cover border border-white/10" />
              {!uploadingImage && (
                <button
                  className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#1F1F18] border border-white/15 text-white/50 hover:text-white flex items-center justify-center text-[8px]"
                  onClick={() => setImagePreview(null)}
                >
                  ✕
                </button>
              )}
            </div>
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", fontFamily: "'Spline Sans', sans-serif" }}>
              {uploadingImage ? "Uploading & generating..." : "Ready to generate"}
            </span>
          </div>
        )}

        {/* Style selector + model row (bottom bar) */}
        <div
          className="flex items-center gap-1.5 px-4"
          style={{
            height: 33,
            flexShrink: 0,
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

          {/* Model name — cycles provider on click */}
          <button
            onClick={() => {
              const keys = Object.keys(PROVIDER_LABELS);
              const idx = keys.indexOf(selectedProvider);
              setSelectedProvider(keys[(idx + 1) % keys.length]);
            }}
            className="hover:opacity-80 transition-opacity cursor-pointer"
            style={{
              fontFamily: "'Spline Sans', sans-serif",
              fontSize: 11,
              color: "rgba(255, 255, 255, 0.95)",
              letterSpacing: "0.3px",
              background: "none",
              border: "none",
              padding: 0,
              whiteSpace: "nowrap",
            }}
          >
            {PROVIDER_LABELS[selectedProvider] || "Vibe3D AI"}
          </button>

          {/* Enhance with AI toggle */}
          <button
            onClick={() => setEnhancePrompt(!enhancePrompt)}
            title={enhancePrompt ? "AI prompt enhancement ON" : "AI prompt enhancement OFF"}
            className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] transition-colors flex-shrink-0 ml-1"
            style={{
              background: enhancePrompt ? "rgba(168, 85, 247, 0.2)" : "transparent",
              color: enhancePrompt ? "rgba(216, 180, 254, 0.9)" : "rgba(255, 255, 255, 0.3)",
              border: enhancePrompt ? "1px solid rgba(168, 85, 247, 0.3)" : "1px solid transparent",
              fontFamily: "'Spline Sans', sans-serif",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11 }}>&#x2728;</span>
            <span>Enhance</span>
          </button>

          {/* Style pills */}
          <div className="flex items-center gap-1 ml-1 overflow-x-auto">
            {GENERATION_STYLES.map((style) => (
              <button
                key={style.id}
                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] transition-colors flex-shrink-0"
                style={{
                  background: selectedStyle === style.id ? "rgba(99, 102, 241, 0.2)" : "transparent",
                  color: selectedStyle === style.id ? "rgba(165, 180, 252, 0.9)" : "rgba(255, 255, 255, 0.35)",
                  border: selectedStyle === style.id ? "1px solid rgba(99, 102, 241, 0.3)" : "1px solid transparent",
                  fontFamily: "'Spline Sans', sans-serif",
                }}
                onClick={() => setSelectedStyle(style.id)}
              >
                <span>{style.icon}</span>
                <span>{style.label}</span>
              </button>
            ))}
          </div>

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
