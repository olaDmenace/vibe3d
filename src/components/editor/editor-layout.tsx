"use client";

import { EditorToolbar } from "./toolbar/editor-toolbar";
import { EditorViewport } from "./viewport/editor-viewport";
import { ChatPanel } from "./chat/chat-panel";
import { LeftSidebar } from "./panels/left-sidebar";
import { RightSidebar } from "./panels/right-sidebar";
import { GenerationOverlay } from "./viewport/generation-overlay";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { useAuthStatus } from "@/hooks/use-auth-status";
import { useGenerationStore } from "@/store/generation-store";
import { EditorTour } from "./tour/editor-tour";

type EditorLayoutProps = {
  projectId?: string;
  projectName?: string;
};

export function EditorLayout({ projectId, projectName }: EditorLayoutProps = {}) {
  useKeyboardShortcuts();
  const { isAuthenticated } = useAuthStatus();
  const { isGenerating, prompt, progress } = useGenerationStore();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#262624]">
      {/* Full-screen 3D Viewport */}
      <div className="absolute inset-0">
        <EditorViewport />
      </div>

      {/* Generation loading overlay — shows over viewport */}
      <GenerationOverlay
        isGenerating={isGenerating}
        prompt={prompt ?? undefined}
        progress={progress}
      />

      {/* Floating left sidebar (fixed positioned) */}
      <LeftSidebar projectId={projectId} projectName={projectName} />

      {/* Floating right sidebar (fixed positioned) */}
      <RightSidebar projectId={projectId} />

      {/* Floating toolbar (absolute positioned) */}
      <EditorToolbar
        projectId={projectId}
        projectName={projectName}
        isAuthenticated={isAuthenticated}
      />

      {/* Floating chat input (absolute positioned) */}
      <ChatPanel projectId={projectId} isAuthenticated={isAuthenticated} />

      {/* Guided tour overlay */}
      <EditorTour />
    </div>
  );
}
