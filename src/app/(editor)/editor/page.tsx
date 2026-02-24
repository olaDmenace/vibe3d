"use client";

import dynamic from "next/dynamic";

const EditorLayout = dynamic(
  () =>
    import("@/components/editor/editor-layout").then((m) => m.EditorLayout),
  { ssr: false }
);

export default function EditorPage() {
  return <EditorLayout />;
}
