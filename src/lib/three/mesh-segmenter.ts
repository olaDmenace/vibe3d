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
/*  3. Naming heuristic — derive human-readable part names             */
/* ------------------------------------------------------------------ */

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
function quantizeColor(r: number, g: number, b: number, bucketSize = 32): string {
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

  // Filter out tiny components (noise)
  const significantComponents = [...components.values()].filter(
    (verts) => verts.length >= minVertices
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

  // Filter tiny groups into the largest group
  const sortedGroups = [...colorGroups.entries()].sort(
    (a, b) => b[1].length - a[1].length
  );

  const significantGroups: [string, number[]][] = [];
  const largestKey = sortedGroups[0][0];
  const largestVerts = sortedGroups[0][1];

  for (const [key, verts] of sortedGroups) {
    if (verts.length >= minVertices) {
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
/*  Naming heuristic                                                   */
/* ------------------------------------------------------------------ */

function generatePartName(
  index: number,
  totalParts: number,
  promptHint: string,
  colorKey?: string
): string {
  // If we have a color-based split, use color name
  if (colorKey && colorKey !== "default") {
    const colorName = colorToName(colorKey);
    return `${promptHint}_${colorName}_Part`.replace(/\s+/g, "_");
  }

  // For connected-component splits, use indexed naming
  if (totalParts <= 4) {
    const labels = ["Body", "Detail_A", "Detail_B", "Detail_C"];
    return `${promptHint}_${labels[index]}`.replace(/\s+/g, "_");
  }

  return `${promptHint}_Part_${index + 1}`.replace(/\s+/g, "_");
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
    const splitPrimitives: Primitive[] = [];
    for (const prim of primitives) {
      const components = splitByComponents(doc, prim, minVertices);
      splitPrimitives.push(...components);
    }

    // Step 2: Try color-based splitting on each result
    const finalParts: { prim: Primitive; colorKey: string }[] = [];
    for (const prim of splitPrimitives) {
      const colorSplit = splitByColorGroups(doc, prim, minVertices);
      finalParts.push(...colorSplit);
    }

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

    // Remove the original mesh from its node
    meshNode.setMesh(null);

    for (let i = 0; i < finalParts.length; i++) {
      const { prim, colorKey } = finalParts[i];
      const partName = generatePartName(
        i,
        finalParts.length,
        promptHint,
        colorKey
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
