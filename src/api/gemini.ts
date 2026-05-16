const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateImageWithGemini(
  prompt: string,
  referenceImages: string[],
  apiKey: string,
  params: {
    model?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    resolution?: string;
    numberOfImages?: number;
  } = {}
): Promise<string> {
  const modelName = params.model || 'gemini-3.1-flash-image-preview';
  const url = `${GEMINI_API_BASE}/models/${modelName}:generateContent?key=${apiKey}`;

  let finalPrompt = prompt;

  if (params.aspectRatio) {
    finalPrompt += `\n\nAspect ratio: ${params.aspectRatio}.`;
  }
  if (params.negativePrompt && params.negativePrompt.trim()) {
    finalPrompt += `\n\nAvoid: ${params.negativePrompt.trim()}.`;
  }
  if (params.resolution) {
    finalPrompt += `\n\nResolution: ${params.resolution}.`;
  }

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (const img of referenceImages) {
    const base64Data = img.split(',')[1];
    const mimeType = img.match(/data:([^;]+);/)?.[1] || 'image/png';
    parts.push({
      inlineData: {
        mimeType,
        data: base64Data,
      },
    });
  }

  parts.push({ text: finalPrompt });

  const body: Record<string, unknown> = {
    contents: [
      {
        role: 'user',
        parts,
      },
    ],
    generationConfig: {
      responseModalities: ['Text', 'Image'],
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    if (blockReason === 'SAFETY') {
      throw new Error('Blocked by Gemini safety filters. Try rephrasing your prompt.');
    }
    throw new Error(
      'Request blocked by Gemini (reason: ' + blockReason + '). ' +
      'This often happens with certain reference images or prompt content — try a different image or prompt.'
    );
  }

  for (const candidate of data.candidates || []) {
    const finishReason = candidate.finishReason;
    if (finishReason && finishReason !== 'STOP') {
      if (finishReason === 'SAFETY') {
        throw new Error('Blocked by Gemini safety filters. Try rephrasing your prompt.');
      }
      throw new Error('Generation stopped early (reason: ' + finishReason + '). Try a different prompt.');
    }
    for (const part of candidate.content?.parts || []) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  }

  throw new Error('No image was returned. The model responded but produced no image data — try again or use a different prompt.');
}

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
  referenceImages?: string[]
): Promise<string> {
  const url = `${GEMINI_API_BASE}/models/gemini-3.1-flash-lite-preview:generateContent?key=${apiKey}`;

  const systemPrompt = customSystemPrompt && customSystemPrompt.trim()
    ? customSystemPrompt.trim()
    : targetMode === 'image'
    ? DEFAULT_IMAGE_SYSTEM_PROMPT
    : DEFAULT_VIDEO_SYSTEM_PROMPT;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

  for (const img of referenceImages || []) {
    const base64Data = img.split(',')[1];
    const mimeType = img.match(/data:([^;]+);/)?.[1] || 'image/png';
    parts.push({ inlineData: { mimeType, data: base64Data } });
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
      maxOutputTokens: 512,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Gemini API error: ${response.status}`);
  }

  const data = await response.json();

  for (const candidate of data.candidates || []) {
    for (const part of candidate.content?.parts || []) {
      if (part.text) {
        return part.text.trim();
      }
    }
  }

  throw new Error('No enhanced prompt was returned. Response: ' + JSON.stringify(data));
}
