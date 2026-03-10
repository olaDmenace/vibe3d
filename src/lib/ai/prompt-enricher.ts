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
      max_tokens: 300,
      system: `You are a 3D model prompt engineer. Given a short description, expand it into a detailed prompt optimized for AI 3D model generation.

Rules:
- Output ONLY the enhanced prompt, no explanation
- STRICT LIMIT: Keep it under 80 words and under 500 characters total
- Add key structural details (geometry, proportions, materials)
- Include mesh quality keywords: "solid", "closed surface", "clean topology"
- Include material hints: "wooden", "metallic", "plastic", "fabric"
- For organic shapes: "smooth surface", "solid form"
- For hard surfaces: "sharp edges", "precise geometry"
- Never include instructions like "create" or "generate" — just describe the object
- Be concise — quality over quantity`,
      messages: [
        { role: "user", content: userPrompt },
      ],
    });

    let text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("")
      .trim();

    if (!text) return userPrompt;

    // Enforce hard limit for provider APIs (Meshy max 800 chars)
    if (text.length > 750) {
      // Trim to last complete sentence within limit
      const trimmed = text.slice(0, 750);
      const lastPeriod = trimmed.lastIndexOf(".");
      text = lastPeriod > 200 ? trimmed.slice(0, lastPeriod + 1) : trimmed;
    }

    return text;
  } catch (err) {
    console.warn("[enrichPrompt] Failed, using original:", err);
    return userPrompt;
  }
}
