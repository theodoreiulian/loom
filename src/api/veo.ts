const VEO_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

export async function generateVideoWithVeo(
  prompt: string,
  referenceImage: string | null,
  _mode: 'reference' | 'starting-frame',
  duration: number,
  aspectRatio: '16:9' | '9:16' | '1:1',
  apiKey: string,
  params: {
    negativePrompt?: string;
    personGeneration?: 'allow_adult' | 'dont_allow';
  } = {}
): Promise<string> {
  const url = `${VEO_API_BASE}/models/veo-3-generate-preview:generateVideos?key=${apiKey}`;

  const body: Record<string, unknown> = {
    instance: {
      prompt,
    },
    parameters: {
      aspectRatio,
      durationSeconds: duration.toString(),
    },
  };

  if (referenceImage) {
    const base64Data = referenceImage.split(',')[1];
    const mimeType = referenceImage.match(/data:([^;]+);/)?.[1] || 'image/png';
    (body.instance as Record<string, unknown>).image = {
      mimeType,
      data: base64Data,
    };
  }

  if (params.personGeneration) {
    (body.parameters as Record<string, unknown>).personGeneration = params.personGeneration;
  }

  if (params.negativePrompt && params.negativePrompt.trim()) {
    (body.instance as Record<string, unknown>).negativePrompt = params.negativePrompt.trim();
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `Veo API error: ${response.status}`);
  }

  const data = await response.json();
  const operationName = data.name;

  if (!operationName) {
    throw new Error('No operation name returned from Veo');
  }

  return pollVeoOperation(operationName, apiKey);
}

async function pollVeoOperation(operationName: string, apiKey: string): Promise<string> {
  const maxAttempts = 60;
  const interval = 5000;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    const response = await fetch(`${VEO_API_BASE}/${operationName}?key=${apiKey}`);

    if (!response.ok) continue;

    const data = await response.json();

    if (data.done) {
      if (data.error) {
        throw new Error(data.error.message || 'Video generation failed');
      }

      const video = data.response?.generatedVideos?.[0];
      if (video?.video?.uri) {
        return video.video.uri;
      }
      if (video?.video?.data) {
        return `data:video/mp4;base64,${video.video.data}`;
      }
      throw new Error('Task succeeded but no video found');
    }
  }

  throw new Error('Video generation timed out');
}
