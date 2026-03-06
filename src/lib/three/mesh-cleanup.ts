import { NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import { weld, dedup, prune, normals, quantize } from "@gltf-transform/functions";

export async function cleanupMesh(buffer: ArrayBuffer): Promise<Uint8Array> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const document = await io.readBinary(new Uint8Array(buffer));

  await document.transform(
    weld(),
    dedup(),
    prune(),
  );

  // Render both sides of every triangle — hides holes from single-surface AI meshes
  for (const material of document.getRoot().listMaterials()) {
    material.setDoubleSided(true);
  }

  return await io.writeBinary(document);
}

/**
 * Stage 2: Post-segmentation optimization.
 * Runs AFTER segmentation is complete. Safe to recalculate normals and
 * quantize vertices here because segmentation has already finished its
 * connected component analysis.
 */
export async function optimizeMesh(buffer: ArrayBuffer | Uint8Array): Promise<Uint8Array> {
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);
  const input = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  const document = await io.readBinary(input);

  await document.transform(
    normals(),
    quantize(),
    prune(),
  );

  return await io.writeBinary(document);
}
