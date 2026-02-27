"use client";

import { EditorToolbar } from "./toolbar/editor-toolbar";
import { EditorViewport } from "./viewport/editor-viewport";
import { ChatPanel } from "./chat/chat-panel";
import { LeftSidebar } from "./panels/left-sidebar";
import { RightSidebar } from "./panels/right-sidebar";
import { useKeyboardShortcuts } from "@/hooks/use-keyboard-shortcuts";
import { EditorTour } from "./tour/editor-tour";

type EditorLayoutProps = {
  projectId?: string;
  projectName?: string;
};

export function EditorLayout({ projectId, projectName }: EditorLayoutProps = {}) {
  useKeyboardShortcuts();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#262624]">
      {/* Full-screen 3D Viewport */}
      <div className="absolute inset-0">
        <EditorViewport />
      </div>

      {/* Floating left sidebar (fixed positioned) */}
      <LeftSidebar projectId={projectId} projectName={projectName} />

      {/* Floating right sidebar (fixed positioned) */}
      <RightSidebar projectId={projectId} />

      {/* Floating toolbar (absolute positioned) */}
      <EditorToolbar projectId={projectId} projectName={projectName} />

      {/* Floating chat input (absolute positioned) */}
      <ChatPanel projectId={projectId} />

      {/* Guided tour overlay */}
      <EditorTour />
    </div>
  );
}
