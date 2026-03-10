import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic();
  }
  return client;
}

/**
 * Use Claude to enrich a short prompt into a detailed 3D generation prompt.
 * This produces dramatically better results from text-to-3D providers.
 */
export async function enrichPrompt(userPrompt: string): Promise<string> {
  try {
    const anthropic = getClient();

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 200,
      system: `You are a 3D model prompt engineer. Given a short description, expand it into a detailed prompt optimized for AI 3D model generation (Meshy/Tripo3D).

Rules:
- Output ONLY the enhanced prompt, no explanation
- Keep it under 150 words
- Add specific structural details (geometry, proportions, materials)
- Include keywords that produce watertight meshes: "solid", "thick", "closed surface"
- Describe the object from a 3D perspective, not 2D
- Include material hints: "wooden", "metallic", "plastic", "fabric"
- Add quality keywords: "detailed", "high resolution", "clean topology"
- For organic shapes: add "smooth surface", "connected geometry", "solid form"
- For hard surfaces: add "sharp edges", "precise geometry", "mechanical detail"
- Never include instructions like "create" or "generate" — just describe the object`,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("");

    return text.trim() || userPrompt;
  } catch (err) {
    console.warn("[enrichPrompt] Failed, using original:", err);
    return userPrompt;
  }
}
