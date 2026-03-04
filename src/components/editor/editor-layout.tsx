"use client";

import { EditorToolbar } from "./toolbar/editor-toolbar";
import { EditorViewport } from "./viewport/editor-viewport";
import { ChatPanel } from "./chat/chat-panel";
import { LeftSidebar } from "./panels/left-sidebar";
import { RightSidebar } from "./panels/right-sidebar";
import { GenerationOverlay } from "./viewport/generation-overlay";
import { EmptyStateOverlay } from "./viewport/empty-state-overlay";
import { ViewportContextMenu } from "./viewport/context-menu";
import { EditorErrorBoundary } from "./editor-error-boundary";
import { SaveStatusIndicator } from "./toolbar/save-status-indicator";
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
  const { isGenerating, prompt, progress, startedAt } = useGenerationStore();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#262624]">
      {/* Full-screen 3D Viewport */}
      <div className="absolute inset-0">
        <EditorErrorBoundary section="Viewport">
          <EditorViewport />
        </EditorErrorBoundary>
      </div>

      {/* Generation loading overlay — shows over viewport */}
      <GenerationOverlay
        isGenerating={isGenerating}
        prompt={prompt ?? undefined}
        progress={progress}
        startedAt={startedAt}
      />

      {/* Empty state overlay */}
      <EmptyStateOverlay />

      {/* Floating left sidebar (fixed positioned) */}
      <EditorErrorBoundary section="Hierarchy">
        <LeftSidebar projectId={projectId} projectName={projectName} />
      </EditorErrorBoundary>

      {/* Floating right sidebar (fixed positioned) */}
      <EditorErrorBoundary section="Properties">
        <RightSidebar projectId={projectId} />
      </EditorErrorBoundary>

      {/* Floating toolbar (absolute positioned) */}
      <div className="absolute z-20 flex items-center gap-2" style={{ left: 262, top: 16 }}>
        <EditorToolbar
          projectId={projectId}
          projectName={projectName}
          isAuthenticated={isAuthenticated}
        />
        <SaveStatusIndicator />
      </div>

      {/* Floating chat input (absolute positioned) */}
      <EditorErrorBoundary section="Chat">
        <ChatPanel projectId={projectId} isAuthenticated={isAuthenticated} />
      </EditorErrorBoundary>

      {/* Right-click context menu */}
      <ViewportContextMenu />

      {/* Guided tour overlay */}
      <EditorTour />
    </div>
  );
}
