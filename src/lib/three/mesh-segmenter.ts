import {
  Document,
  NodeIO,
  Primitive,
  Node as GltfNode,
} from "@gltf-transform/core";
import { dedup, prune } from "@gltf-transform/functions";

/* ------------------------------------------------------------------ */
/*  Mesh Segmenter                                                     */
/*  Post-processes AI-generated GLB models by splitting single-mesh    */
/*  models into semantically meaningful parts so users can             */
/*  individually color/edit each part.                                 */
/*                                                                     */
/*  Strategy:                                                          */
/*  1. Connected component analysis — split disjoint geometry islands  */
/*  2. Vertex color clustering — split by dominant vertex color groups */
/*  3. Cap at MAX_PARTS to avoid over-segmentation                    */
/*  4. Naming heuristic — derive human-readable part names             */
/* ------------------------------------------------------------------ */

/** Hard cap on the number of segmented parts to prevent over-segmentation */
const MAX_PARTS = 12;

/* ------------------------------------------------------------------ */
/*  Union-Find for connected component analysis                        */
/* ------------------------------------------------------------------ */

class UnionFind {
  private parent: Int32Array;
  private rank: Int32Array;

  constructor(size: number) {
    this.parent = new Int32Array(size);
    this.rank = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      this.parent[i] = i;
    }
  }

  find(x: number): number {
    while (this.parent[x] !== x) {
      this.parent[x] = this.parent[this.parent[x]]; // path compression
      x = this.parent[x];
    }
    return x;
  }

  union(a: number, b: number): void {
    const ra = this.find(a);
    const rb = this.find(b);
    if (ra === rb) return;
    if (this.rank[ra] < this.rank[rb]) {
      this.parent[ra] = rb;
    } else if (this.rank[ra] > this.rank[rb]) {
      this.parent[rb] = ra;
    } else {
      this.parent[rb] = ra;
      this.rank[ra]++;
    }
  }

  /** Return a Map from root → array of member indices */
  components(): Map<number, number[]> {
    const map = new Map<number, number[]>();
    for (let i = 0; i < this.parent.length; i++) {
      const root = this.find(i);
      let arr = map.get(root);
      if (!arr) {
        arr = [];
        map.set(root, arr);
      }
      arr.push(i);
    }
    return map;
  }
}

/* ------------------------------------------------------------------ */
/*  Color helpers                                                      */
/* ------------------------------------------------------------------ */

/** Quantize an RGB color to a hex bucket for grouping */
function quantizeColor(r: number, g: number, b: number, bucketSize = 64): string {
  const qr = Math.round(r * 255 / bucketSize) * bucketSize;
  const qg = Math.round(g * 255 / bucketSize) * bucketSize;
  const qb = Math.round(b * 255 / bucketSize) * bucketSize;
  return `${qr},${qg},${qb}`;
}

/** Convert quantized color string to a human-readable name */
function colorToName(key: string): string {
  const [r, g, b] = key.split(",").map(Number);
  // Simple color naming based on dominant channel
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);

  if (max - min < 40) {
    // Grayscale
    if (max < 64) return "Dark";
    if (max < 160) return "Gray";
    return "Light";
  }

  if (r >= g && r >= b) {
    if (g > b + 40) return "Yellow";
    if (b > g + 40) return "Magenta";
    return "Red";
  }
  if (g >= r && g >= b) {
    if (r > b + 40) return "Yellow-Green";
    if (b > r + 40) return "Cyan";
    return "Green";
  }
  // b is max
  if (r > g + 40) return "Purple";
  if (g > r + 40) return "Cyan";
  return "Blue";
}

/* ------------------------------------------------------------------ */
/*  Cap components — merge excess small parts into one                 */
/* ------------------------------------------------------------------ */

/**
 * If there are more than MAX_PARTS components, keep the largest
 * MAX_PARTS - 1 and merge the rest into a single "details" component.
 */
function capPrimitiveParts(parts: Primitive[]): Primitive[] {
  if (parts.length <= MAX_PARTS) return parts;

  // Sort by vertex count descending (largest first)
  const withSize = parts.map((p) => {
    const pos = p.getAttribute("POSITION");
    return { prim: p, vertCount: pos?.getCount() ?? 0 };
  });
  withSize.sort((a, b) => b.vertCount - a.vertCount);

  // Keep top MAX_PARTS, discard the rest (their geometry stays in the doc
  // but won't be referenced — prune() cleans them up later)
  return withSize.slice(0, MAX_PARTS).map((w) => w.prim);
}

function capColorParts(
  parts: { prim: Primitive; colorKey: string }[]
): { prim: Primitive; colorKey: string }[] {
  if (parts.length <= MAX_PARTS) return parts;

  const withSize = parts.map((p) => {
    const pos = p.prim.getAttribute("POSITION");
    return { ...p, vertCount: pos?.getCount() ?? 0 };
  });
  withSize.sort((a, b) => b.vertCount - a.vertCount);

  return withSize.slice(0, MAX_PARTS).map(({ prim, colorKey }) => ({ prim, colorKey }));
}

/* ------------------------------------------------------------------ */
/*  Split a primitive by connected components                          */
/* ------------------------------------------------------------------ */

function splitByComponents(
  doc: Document,
  prim: Primitive,
  minVertices: number
): Primitive[] {
  const posAccessor = prim.getAttribute("POSITION");
  if (!posAccessor) return [prim];

  const indexAccessor = prim.getIndices();
  const vertexCount = posAccessor.getCount();

  if (vertexCount < minVertices * 2) return [prim]; // too small to split

  const uf = new UnionFind(vertexCount);

  if (indexAccessor) {
    // Indexed geometry — connect vertices that share triangles
    const triCount = indexAccessor.getCount() / 3;
    for (let t = 0; t < triCount; t++) {
      const i0 = indexAccessor.getScalar(t * 3);
      const i1 = indexAccessor.getScalar(t * 3 + 1);
      const i2 = indexAccessor.getScalar(t * 3 + 2);
      uf.union(i0, i1);
      uf.union(i1, i2);
    }
  } else {
    // Non-indexed — every 3 vertices form a triangle
    const triCount = vertexCount / 3;
    for (let t = 0; t < triCount; t++) {
      uf.union(t * 3, t * 3 + 1);
      uf.union(t * 3 + 1, t * 3 + 2);
    }
  }

  const components = uf.components();
  if (components.size <= 1) return [prim]; // single connected component

  // Filter out tiny components (noise) — require at least 5% of total vertices
  const relativeMin = Math.max(minVertices, Math.floor(vertexCount * 0.05));
  const significantComponents = [...components.values()].filter(
    (verts) => verts.length >= relativeMin
  );

  if (significantComponents.length <= 1) return [prim];

  // Build new primitives for each component
  const results: Primitive[] = [];

  for (const componentVerts of significantComponents) {
    const vertexSet = new Set(componentVerts);
    const newPrim = doc.createPrimitive();

    // Copy material
    const mat = prim.getMaterial();
    if (mat) newPrim.setMaterial(mat);
    newPrim.setMode(prim.getMode());

    // Build old→new vertex index map
    const oldToNew = new Map<number, number>();
    const sortedVerts = [...vertexSet].sort((a, b) => a - b);
    sortedVerts.forEach((oldIdx, newIdx) => {
      oldToNew.set(oldIdx, newIdx);
    });

    // Copy attributes for this component's vertices
    for (const semantic of prim.listSemantics()) {
      const srcAcc = prim.getAttribute(semantic)!;
      const elemSize = srcAcc.getElementSize();
      const newArr = new Float32Array(sortedVerts.length * elemSize);

      for (let i = 0; i < sortedVerts.length; i++) {
        const oldIdx = sortedVerts[i];
        const elem = srcAcc.getElement(oldIdx, new Array(elemSize).fill(0));
        for (let j = 0; j < elemSize; j++) {
          newArr[i * elemSize + j] = elem[j];
        }
      }

      const newAcc = doc.createAccessor()
        .setType(srcAcc.getType())
        .setArray(newArr);
      newPrim.setAttribute(semantic, newAcc);
    }

    // Rebuild indices for this component
    if (indexAccessor) {
      const triCount = indexAccessor.getCount() / 3;
      const newIndices: number[] = [];

      for (let t = 0; t < triCount; t++) {
        const i0 = indexAccessor.getScalar(t * 3);
        const i1 = indexAccessor.getScalar(t * 3 + 1);
        const i2 = indexAccessor.getScalar(t * 3 + 2);

        if (vertexSet.has(i0) && vertexSet.has(i1) && vertexSet.has(i2)) {
          newIndices.push(
            oldToNew.get(i0)!,
            oldToNew.get(i1)!,
            oldToNew.get(i2)!
          );
        }
      }

      const newIdxAcc = doc.createAccessor()
        .setType("SCALAR")
        .setArray(new Uint32Array(newIndices));
      newPrim.setIndices(newIdxAcc);
    }

    results.push(newPrim);
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Split a primitive by vertex color groups                           */
/* ------------------------------------------------------------------ */

function splitByColorGroups(
  doc: Document,
  prim: Primitive,
  minVertices: number
): { prim: Primitive; colorKey: string }[] {
  const colorAccessor = prim.getAttribute("COLOR_0");
  const posAccessor = prim.getAttribute("POSITION");

  if (!colorAccessor || !posAccessor) {
    return [{ prim, colorKey: "default" }];
  }

  const vertexCount = posAccessor.getCount();
  const colorElemSize = colorAccessor.getElementSize();
  const indexAccessor = prim.getIndices();

  // Group vertices by quantized color
  const colorGroups = new Map<string, number[]>();
  for (let i = 0; i < vertexCount; i++) {
    const color = colorAccessor.getElement(i, new Array(colorElemSize).fill(0));
    const key = quantizeColor(color[0], color[1], color[2]);
    let group = colorGroups.get(key);
    if (!group) {
      group = [];
      colorGroups.set(key, group);
    }
    group.push(i);
  }

  // If only one color group, no split needed
  if (colorGroups.size <= 1) {
    const key = colorGroups.keys().next().value ?? "default";
    return [{ prim, colorKey: key }];
  }

  // Filter tiny groups into the largest group — require at least 5% of total
  const relativeMin = Math.max(minVertices, Math.floor(vertexCount * 0.05));
  const sortedGroups = [...colorGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  const significantGroups: [string, number[]][] = [];
  const largestKey = sortedGroups[0][0];
  const largestVerts = sortedGroups[0][1];

  for (const [key, verts] of sortedGroups) {
    if (verts.length >= relativeMin) {
      significantGroups.push([key, verts]);
    } else {
      // Merge tiny groups into largest
      if (key !== largestKey) {
        largestVerts.push(...verts);
      }
    }
  }

  if (significantGroups.length <= 1) {
    return [{ prim, colorKey: largestKey }];
  }

  // Build a new primitive per color group
  const results: { prim: Primitive; colorKey: string }[] = [];

  for (const [colorKey, groupVerts] of significantGroups) {
    const vertexSet = new Set(groupVerts);
    const newPrim = doc.createPrimitive();

    const mat = prim.getMaterial();
    if (mat) newPrim.setMaterial(mat);
    newPrim.setMode(prim.getMode());

    const oldToNew = new Map<number, number>();
    const sortedVerts = [...vertexSet].sort((a, b) => a - b);
    sortedVerts.forEach((oldIdx, newIdx) => {
      oldToNew.set(oldIdx, newIdx);
    });

    // Copy attributes
    for (const semantic of prim.listSemantics()) {
      const srcAcc = prim.getAttribute(semantic)!;
      const elemSize = srcAcc.getElementSize();
      const newArr = new Float32Array(sortedVerts.length * elemSize);

      for (let i = 0; i < sortedVerts.length; i++) {
        const oldIdx = sortedVerts[i];
        const elem = srcAcc.getElement(oldIdx, new Array(elemSize).fill(0));
        for (let j = 0; j < elemSize; j++) {
          newArr[i * elemSize + j] = elem[j];
        }
      }

      const newAcc = doc.createAccessor()
        .setType(srcAcc.getType())
        .setArray(newArr);
      newPrim.setAttribute(semantic, newAcc);
    }

    // Rebuild indices
    if (indexAccessor) {
      const triCount = indexAccessor.getCount() / 3;
      const newIndices: number[] = [];

      for (let t = 0; t < triCount; t++) {
        const i0 = indexAccessor.getScalar(t * 3);
        const i1 = indexAccessor.getScalar(t * 3 + 1);
        const i2 = indexAccessor.getScalar(t * 3 + 2);

        if (vertexSet.has(i0) && vertexSet.has(i1) && vertexSet.has(i2)) {
          newIndices.push(
            oldToNew.get(i0)!,
            oldToNew.get(i1)!,
            oldToNew.get(i2)!
          );
        }
      }

      const newIdxAcc = doc.createAccessor()
        .setType("SCALAR")
        .setArray(new Uint32Array(newIndices));
      newPrim.setIndices(newIdxAcc);
    }

    results.push({ prim: newPrim, colorKey });
  }

  return results;
}

/* ------------------------------------------------------------------ */
/*  Naming heuristic — spatial + size analysis                         */
/* ------------------------------------------------------------------ */

interface PartBounds {
  center: [number, number, number];
  size: [number, number, number];
  volume: number;
}

/** Compute AABB center, size, and volume for a primitive */
function computePartBounds(prim: Primitive): PartBounds | null {
  const posAccessor = prim.getAttribute("POSITION");
  if (!posAccessor) return null;

  const count = posAccessor.getCount();
  if (count === 0) return null;

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  const elem = [0, 0, 0];
  for (let i = 0; i < count; i++) {
    posAccessor.getElement(i, elem);
    if (elem[0] < minX) minX = elem[0];
    if (elem[1] < minY) minY = elem[1];
    if (elem[2] < minZ) minZ = elem[2];
    if (elem[0] > maxX) maxX = elem[0];
    if (elem[1] > maxY) maxY = elem[1];
    if (elem[2] > maxZ) maxZ = elem[2];
  }

  const sx = maxX - minX;
  const sy = maxY - minY;
  const sz = maxZ - minZ;

  return {
    center: [(minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2],
    size: [sx, sy, sz],
    volume: sx * sy * sz,
  };
}

/**
 * Derive a spatial name based on the part's position relative to the
 * overall model bounds and its relative size.
 */
function generatePartName(
  index: number,
  totalParts: number,
  promptHint: string,
  colorKey: string | undefined,
  partBounds: PartBounds | null,
  allBounds: (PartBounds | null)[],
): string {
  // If we have a color-based split, use color name (no prompt prefix)
  if (colorKey && colorKey !== "default") {
    const colorName = colorToName(colorKey).toLowerCase();
    return colorName.replace(/\s+/g, "_");
  }

  // If no bounds data, fall back to indexed
  if (!partBounds) {
    return `part_${index + 1}`;
  }

  // Compute overall model bounds from all parts
  const validBounds = allBounds.filter((b): b is PartBounds => b !== null);
  if (validBounds.length === 0) {
    return `part_${index + 1}`;
  }

  let modelMinX = Infinity, modelMinY = Infinity, modelMinZ = Infinity;
  let modelMaxX = -Infinity, modelMaxY = -Infinity, modelMaxZ = -Infinity;
  let totalVolume = 0;

  for (const b of validBounds) {
    const halfX = b.size[0] / 2, halfY = b.size[1] / 2, halfZ = b.size[2] / 2;
    if (b.center[0] - halfX < modelMinX) modelMinX = b.center[0] - halfX;
    if (b.center[1] - halfY < modelMinY) modelMinY = b.center[1] - halfY;
    if (b.center[2] - halfZ < modelMinZ) modelMinZ = b.center[2] - halfZ;
    if (b.center[0] + halfX > modelMaxX) modelMaxX = b.center[0] + halfX;
    if (b.center[1] + halfY > modelMaxY) modelMaxY = b.center[1] + halfY;
    if (b.center[2] + halfZ > modelMaxZ) modelMaxZ = b.center[2] + halfZ;
    totalVolume += b.volume;
  }

  const modelCenter: [number, number, number] = [
    (modelMinX + modelMaxX) / 2,
    (modelMinY + modelMaxY) / 2,
    (modelMinZ + modelMaxZ) / 2,
  ];
  const modelExtent: [number, number, number] = [
    (modelMaxX - modelMinX) || 1,
    (modelMaxY - modelMinY) || 1,
    (modelMaxZ - modelMinZ) || 1,
  ];

  // Normalize part center to [-1, 1] range relative to model
  const nx = (partBounds.center[0] - modelCenter[0]) / (modelExtent[0] / 2);
  const ny = (partBounds.center[1] - modelCenter[1]) / (modelExtent[1] / 2);
  const nz = (partBounds.center[2] - modelCenter[2]) / (modelExtent[2] / 2);

  // Volume ratio — the largest part is the "body"
  const volumeRatio = totalVolume > 0 ? partBounds.volume / totalVolume : 0;

  let label: string;

  if (volumeRatio > 0.4) {
    label = "body";
  } else if (ny > 0.5) {
    label = "top";
  } else if (ny < -0.5) {
    label = "base";
  } else if (nx < -0.4) {
    label = "left_section";
  } else if (nx > 0.4) {
    label = "right_section";
  } else if (nz > 0.4) {
    label = "front";
  } else if (nz < -0.4) {
    label = "back";
  } else if (volumeRatio < 0.1) {
    label = "detail";
  } else {
    label = `section_${index + 1}`;
  }

  // Deduplicate: if another part already has this label, append index
  const usedLabels = new Set<string>();
  for (let i2 = 0; i2 < totalParts; i2++) {
    if (i2 === index) continue;
    const b2 = allBounds[i2];
    if (!b2) continue;
    const vr2 = totalVolume > 0 ? b2.volume / totalVolume : 0;
    const nx2 = (b2.center[0] - modelCenter[0]) / (modelExtent[0] / 2);
    const ny2 = (b2.center[1] - modelCenter[1]) / (modelExtent[1] / 2);
    const nz2 = (b2.center[2] - modelCenter[2]) / (modelExtent[2] / 2);
    let l2: string;
    if (vr2 > 0.4) l2 = "body";
    else if (ny2 > 0.5) l2 = "top";
    else if (ny2 < -0.5) l2 = "base";
    else if (nx2 < -0.4) l2 = "left_section";
    else if (nx2 > 0.4) l2 = "right_section";
    else if (nz2 > 0.4) l2 = "front";
    else if (nz2 < -0.4) l2 = "back";
    else if (vr2 < 0.1) l2 = "detail";
    else l2 = `section_${i2 + 1}`;
    usedLabels.add(l2);
  }

  if (usedLabels.has(label)) {
    label = `${label}_${index + 1}`;
  }

  return label;
}

/* ------------------------------------------------------------------ */
/*  Main entry point                                                   */
/* ------------------------------------------------------------------ */

export interface SegmentationResult {
  /** The segmented GLB buffer */
  buffer: Uint8Array;
  /** The names of the resulting meshes */
  meshNames: string[];
  /** Total mesh count after segmentation */
  meshCount: number;
  /** Whether segmentation actually split the model */
  wasSegmented: boolean;
}

/**
 * Segment a GLB model into multiple named meshes.
 *
 * @param glbBuffer - The raw GLB bytes
 * @param promptHint - A short name derived from the generation prompt (e.g. "Chess_Piece")
 * @param minVertices - Minimum vertices for a component to be kept (default 50)
 */
export async function segmentMesh(
  glbBuffer: ArrayBuffer,
  promptHint: string,
  minVertices = 50
): Promise<SegmentationResult> {
  const io = new NodeIO();
  const doc = await io.readBinary(new Uint8Array(glbBuffer));
  const scene = doc.getRoot().getDefaultScene() ?? doc.getRoot().listScenes()[0];

  if (!scene) {
    // No scene — return as-is
    return {
      buffer: new Uint8Array(glbBuffer),
      meshNames: [],
      meshCount: 0,
      wasSegmented: false,
    };
  }

  // Collect all mesh nodes in the scene
  const meshNodes: GltfNode[] = [];
  scene.traverse((node) => {
    if (node.getMesh()) meshNodes.push(node);
  });

  // If the model already has multiple mesh nodes, just collect names
  if (meshNodes.length >= 2) {
    const meshNames = meshNodes.map(
      (node, i) => node.getName() || `${promptHint}_Part_${i + 1}`
    );
    // Ensure all nodes have names
    meshNodes.forEach((node, i) => {
      if (!node.getName()) node.setName(meshNames[i]);
    });

    const outBuffer = await io.writeBinary(doc);
    return {
      buffer: outBuffer,
      meshNames,
      meshCount: meshNames.length,
      wasSegmented: false,
    };
  }

  // Single mesh node — attempt segmentation
  if (meshNodes.length === 1) {
    const meshNode = meshNodes[0];
    const mesh = meshNode.getMesh()!;
    const primitives = mesh.listPrimitives();

    if (primitives.length === 0) {
      return {
        buffer: new Uint8Array(glbBuffer),
        meshNames: [meshNode.getName() || promptHint],
        meshCount: 1,
        wasSegmented: false,
      };
    }

    // Step 1: Try connected component splitting on each primitive
    let splitPrimitives: Primitive[] = [];
    for (const prim of primitives) {
      const components = splitByComponents(doc, prim, minVertices);
      splitPrimitives.push(...components);
    }
    splitPrimitives = capPrimitiveParts(splitPrimitives);

    // Step 2: Try color-based splitting on each result
    let finalParts: { prim: Primitive; colorKey: string }[] = [];
    for (const prim of splitPrimitives) {
      const colorSplit = splitByColorGroups(doc, prim, minVertices);
      finalParts.push(...colorSplit);
    }
    finalParts = capColorParts(finalParts);

    // If no meaningful split happened, return with single mesh name
    if (finalParts.length <= 1) {
      const name = meshNode.getName() || promptHint;
      if (!meshNode.getName()) meshNode.setName(name);

      const outBuffer = await io.writeBinary(doc);
      return {
        buffer: outBuffer,
        meshNames: [name],
        meshCount: 1,
        wasSegmented: false,
      };
    }

    // Build new nodes for each part
    const meshNames: string[] = [];

    // Pre-compute bounds for all parts (needed for spatial naming)
    const allBounds = finalParts.map(({ prim }) => computePartBounds(prim));

    // Remove the original mesh from its node
    meshNode.setMesh(null);

    for (let i = 0; i < finalParts.length; i++) {
      const { prim, colorKey } = finalParts[i];
      const partName = generatePartName(
        i,
        finalParts.length,
        promptHint,
        colorKey,
        allBounds[i],
        allBounds,
      );
      meshNames.push(partName);

      const newMesh = doc.createMesh(partName).addPrimitive(prim);
      const newNode = doc.createNode(partName).setMesh(newMesh);
      scene.addChild(newNode);
    }

    // Remove the now-empty original node
    meshNode.dispose();

    // Clean up unused resources
    await doc.transform(prune(), dedup());

    const outBuffer = await io.writeBinary(doc);
    return {
      buffer: outBuffer,
      meshNames,
      meshCount: meshNames.length,
      wasSegmented: true,
    };
  }

  // No meshes at all
  return {
    buffer: new Uint8Array(glbBuffer),
    meshNames: [],
    meshCount: 0,
    wasSegmented: false,
  };
}
