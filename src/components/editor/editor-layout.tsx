"use client";

import { EditorToolbar } from "./toolbar/editor-toolbar";
import { EditorViewport } from "./viewport/editor-viewport";
import { ChatPanel } from "./chat/chat-panel";
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-editor-bg">
      {/* Top toolbar */}
      <EditorToolbar projectId={projectId} projectName={projectName} />

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: AI Chat panel */}
        <ChatPanel />

        {/* Center: 3D Viewport */}
        <div className="flex-1 overflow-hidden">
          <EditorViewport />
        </div>

        {/* Right: Sidebar (hierarchy, properties, assets) */}
        <RightSidebar />
      </div>

      {/* Guided tour overlay */}
      <EditorTour />
    </div>
  );
}
