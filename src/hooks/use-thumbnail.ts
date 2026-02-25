import { useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export function useThumbnail() {
  const supabase = createClient();

  const captureThumbnail = useCallback(
    async (projectId: string, canvas: HTMLCanvasElement) => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Render the canvas to a blob at reduced size
        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png", 0.8)
        );
        if (!blob) return;

        const path = `${user.id}/${projectId}/thumbnail.png`;

        // Upload to thumbnails bucket (upsert)
        await supabase.storage
          .from("thumbnails")
          .upload(path, blob, { upsert: true });

        // Get public URL
        const {
          data: { publicUrl },
        } = supabase.storage.from("thumbnails").getPublicUrl(path);

        // Update project with thumbnail URL
        await fetch(`/api/projects/${projectId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ thumbnail_url: publicUrl }),
        });
      } catch {
        // Non-critical — silently fail
      }
    },
    [supabase]
  );

  return { captureThumbnail };
}
