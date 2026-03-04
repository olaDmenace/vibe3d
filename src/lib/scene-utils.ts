import type { SceneState } from "@/types/scene";

/**
 * Compute a spawn position for a new object, avoiding overlap with existing objects.
 * Finds the rightmost edge and places the new object to the right.
 */
export function getSpawnPosition(scene: SceneState): [number, number, number] {
  const objects = Object.values(scene.objects);
  if (objects.length === 0) return [0, 0, 0];

  let maxX = 0;
  for (const obj of objects) {
    const x = obj.transform.position[0];
    const edge = x + 2;
    if (edge > maxX) maxX = edge;
  }

  return [maxX + 1, 0, 0];
}
