"use client";

import dynamic from "next/dynamic";
import { useParams } from "next/navigation";

const EditorWithProject = dynamic(
  () =>
    import("@/components/editor/editor-with-project").then(
      (m) => m.EditorWithProject
    ),
  { ssr: false }
);

export default function ProjectEditorPage() {
  const params = useParams<{ id: string }>();
  return <EditorWithProject projectId={params.id} />;
}
