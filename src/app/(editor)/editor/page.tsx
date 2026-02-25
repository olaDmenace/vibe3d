"use client";

import dynamic from "next/dynamic";

const EditorLayout = dynamic(
  () =>
    import("@/components/editor/editor-layout").then((m) => m.EditorLayout),
  { ssr: false }
);

// Standalone editor (no project persistence — for unauthenticated quick use)
export default function EditorPage() {
  return <EditorLayout />;
}
