import { GOOGLE_API_BASE } from './providers/google';
import { mimeTypeOf, stripDataUrlPrefix } from './media';
import { asArray, asString, dig } from './json';

export const PROMPT_ENGINEER_MODELS = [
  { id: 'gemini-3.8-flash', label: 'Flash' },
  { id: 'gemini-3.5-flash-lite', label: 'Flash Lite' },
  { id: 'gemini-3.1-pro-preview', label: 'Pro' },
] as const;

export const DEFAULT_PROMPT_ENGINEER_MODEL = 'gemini-3.8-flash';

export const DEFAULT_IMAGE_SYSTEM_PROMPT = `You are an elite prompt engineer specializing in AI image generation. Your job is to transform rough, vague, or simple user ideas into highly detailed, vivid, production-ready image generation prompts.

Rules:
- Expand the user's concept with rich visual details: lighting, atmosphere, color palette, texture, composition, camera angle, depth of field, artistic style, mood.
- Be specific and concrete — avoid abstract or ambiguous language.
- Include relevant artistic references, render styles (e.g., cinematic, photorealistic, illustration, oil painting, digital art), and technical details when appropriate.
- Structure the prompt for maximum clarity: subject first, then environment, then style/technical details.
- Do NOT add commentary, explanations, or meta-text. Output ONLY the final prompt.
- Keep the prompt concise but dense with visual information (aim for 3-6 sentences).
- If the user mentions a specific artist or style, lean heavily into that aesthetic.`;

export const DEFAULT_VIDEO_SYSTEM_PROMPT = `You are an elite prompt engineer specializing in AI video generation. Your job is to transform rough, vague, or simple user ideas into highly detailed, motion-rich, production-ready video generation prompts.

Rules:
- Describe temporal dynamics: what moves, how it moves, camera motion (pan, tilt, dolly, zoom, orbit, tracking shot), speed, and rhythm.
- Include scene transitions, environmental changes over time, and how light/shadow shifts.
- Specify camera angles, lens type, depth of field, and framing.
- Describe atmospheric elements: weather, particle effects, reflections, volumetrics.
- Be specific about the mood and pacing — is it slow and contemplative, fast and energetic, suspenseful?
- Do NOT add commentary, explanations, or meta-text. Output ONLY the final prompt.
- Keep the prompt concise but dense with motion and cinematographic detail (aim for 3-6 sentences).
- If the user mentions a specific director or film style, lean heavily into that aesthetic.`;

export async function enhancePromptWithGemini(
  rawPrompt: string,
  targetMode: 'image' | 'video',
  apiKey: string,
  customSystemPrompt?: string,
  referenceImages?: string[],
  model: string = DEFAULT_PROMPT_ENGINEER_MODEL
): Promise<string> {
  const url = `${GOOGLE_API_BASE}/models/${model}:generateContent`;

  const systemPrompt = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt.trim()
    : targetMode === 'image'
    ? DEFAULT_IMAGE_SYSTEM_PROMPT
    : DEFAULT_VIDEO_SYSTEM_PROMPT;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (const img of referenceImages || []) {
    parts.push({ inlineData: { mimeType: mimeTypeOf(img), data: stripDataUrlPrefix(img) } });
  }

  parts.push({ text: rawPrompt });

  const body = {
    systemInstruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    if (response.status === 401 || response.status === 403) {
      throw new Error('Gemini rejected your Google API key. Check it in Settings → API Keys.');
    }
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data: unknown = await response.json();

  for (const candidate of asArray(dig(data, 'candidates'))) {
    const text = asArray(dig(candidate, 'content', 'parts'))
      .map((part) => asString(dig(part, 'text')))
      .filter((part): part is string => Boolean(part))
      .join('')
      .trim();
    if (text) return text;
  }

  throw new Error('Gemini returned no enhanced prompt. Try again or simplify the prompt.');
}
