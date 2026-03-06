export interface MaterialPreset {
  id: string;
  name: string;
  category: string;
  color: string;
  roughness: number;
  metalness: number;
  opacity: number;
  emissive?: string;
  emissiveIntensity?: number;
  thumbnail?: string;
}

export const MATERIAL_PRESETS: MaterialPreset[] = [
  // Metals
  { id: "chrome", name: "Chrome", category: "Metal", color: "#d4d4d8", roughness: 0.05, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #e4e4e7, #71717a, #e4e4e7)" },
  { id: "gold", name: "Gold", category: "Metal", color: "#eab308", roughness: 0.15, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #fde047, #ca8a04, #fde047)" },
  { id: "copper", name: "Copper", category: "Metal", color: "#c2712e", roughness: 0.2, metalness: 1, opacity: 1, thumbnail: "linear-gradient(135deg, #d4956a, #92400e, #d4956a)" },
  { id: "brushed-steel", name: "Brushed Steel", category: "Metal", color: "#9ca3af", roughness: 0.4, metalness: 0.9, opacity: 1, thumbnail: "linear-gradient(135deg, #d1d5db, #6b7280, #d1d5db)" },
  { id: "bronze", name: "Bronze", category: "Metal", color: "#92702a", roughness: 0.3, metalness: 0.85, opacity: 1, thumbnail: "linear-gradient(135deg, #b8923e, #6b4e1e, #b8923e)" },

  // Natural
  { id: "wood-oak", name: "Oak Wood", category: "Natural", color: "#a0764a", roughness: 0.7, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #c4956a, #7a5c3a)" },
  { id: "wood-walnut", name: "Walnut", category: "Natural", color: "#5c3d2e", roughness: 0.65, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #7a5040, #3e2a1e)" },
  { id: "stone", name: "Stone", category: "Natural", color: "#78716c", roughness: 0.85, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #a8a29e, #57534e)" },
  { id: "marble", name: "Marble", category: "Natural", color: "#e7e5e4", roughness: 0.2, metalness: 0.05, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #d6d3d1, #fafaf9)" },
  { id: "clay", name: "Clay", category: "Natural", color: "#c4a882", roughness: 0.9, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #d4b896, #a08060)" },

  // Synthetic
  { id: "plastic-glossy", name: "Glossy Plastic", category: "Synthetic", color: "#e4e4e7", roughness: 0.1, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #f4f4f5, #a1a1aa, #f4f4f5)" },
  { id: "plastic-matte", name: "Matte Plastic", category: "Synthetic", color: "#d4d4d8", roughness: 0.6, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #e4e4e7, #a1a1aa)" },
  { id: "rubber", name: "Rubber", category: "Synthetic", color: "#27272a", roughness: 0.9, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #3f3f46, #18181b)" },
  { id: "glass", name: "Glass", category: "Synthetic", color: "#e0f2fe", roughness: 0.0, metalness: 0.1, opacity: 0.3, thumbnail: "linear-gradient(135deg, rgba(224,242,254,0.5), rgba(186,230,253,0.3))" },
  { id: "ceramic", name: "Ceramic", category: "Synthetic", color: "#fafaf9", roughness: 0.15, metalness: 0.05, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #e7e5e4, #fafaf9)" },

  // Fabric
  { id: "fabric-cotton", name: "Cotton", category: "Fabric", color: "#f5f5f4", roughness: 0.95, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #fafaf9, #e7e5e4)" },
  { id: "fabric-leather", name: "Leather", category: "Fabric", color: "#44403c", roughness: 0.5, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #57534e, #292524)" },
  { id: "fabric-velvet", name: "Velvet", category: "Fabric", color: "#4c1d95", roughness: 0.85, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #6d28d9, #3b0764)" },
  { id: "fabric-denim", name: "Denim", category: "Fabric", color: "#1e40af", roughness: 0.8, metalness: 0, opacity: 1, thumbnail: "linear-gradient(135deg, #2563eb, #1e3a8a)" },

  // Special
  { id: "neon-glow", name: "Neon Glow", category: "Special", color: "#06b6d4", roughness: 0.3, metalness: 0, opacity: 1, emissive: "#06b6d4", emissiveIntensity: 2, thumbnail: "linear-gradient(135deg, #22d3ee, #0891b2)" },
  { id: "lava", name: "Lava", category: "Special", color: "#dc2626", roughness: 0.6, metalness: 0, opacity: 1, emissive: "#ef4444", emissiveIntensity: 1.5, thumbnail: "linear-gradient(135deg, #f87171, #991b1b)" },
];

export const MATERIAL_CATEGORIES = [...new Set(MATERIAL_PRESETS.map((p) => p.category))];
