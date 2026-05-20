const OPENAI_API_BASE = 'https://api.openai.com/v1';

function getOpenAISize(aspectRatio: string, resolution: string): string {
  const ratioMap: Record<string, { w: number; h: number }> = {
    '1:1': { w: 1, h: 1 },
    '4:3': { w: 4, h: 3 },
    '16:9': { w: 16, h: 9 },
    '3:4': { w: 3, h: 4 },
    '9:16': { w: 9, h: 16 },
    '21:9': { w: 21, h: 9 },
    '9:21': { w: 9, h: 21 },
    '2:1': { w: 2, h: 1 },
    '1:2': { w: 1, h: 2 },
    '3:2': { w: 3, h: 2 },
    '2:3': { w: 2, h: 3 },
  };

  const base = resolution === '4K' ? 2048 : resolution === '2K' ? 1536 : 1024;
  const ratio = ratioMap[aspectRatio];
  if (!ratio) return '1024x1024';

  let w: number;
  let h: number;

  // Use the SHORTER side as the base so the image always has enough pixels
  // to meet GPT Image 2's minimum pixel budget.
  if (ratio.h > ratio.w) {
    // Portrait: width is the shorter side
    w = base;
    h = Math.round((base * ratio.h) / ratio.w);
  } else {
    // Landscape or square: height is the shorter side
    h = base;
    w = Math.round((base * ratio.w) / ratio.h);
  }

  // Round to nearest multiple of 16 (required by GPT Image 2)
  w = Math.round(w / 16) * 16;
  h = Math.round(h / 16) * 16;

  // Ensure minimum sensible size
  w = Math.max(16, w);
  h = Math.max(16, h);

  // Clamp to max supported resolution (3840x2160)
  const MAX_W = 3840;
  const MAX_H = 2160;
  if (w > MAX_W || h > MAX_H) {
    const scale = Math.min(MAX_W / w, MAX_H / h);
    w = Math.round(w * scale / 16) * 16;
    h = Math.round(h * scale / 16) * 16;
  }

  return `${w}x${h}`;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const byteString = atob(dataUrl.split(',')[1]);
  const mimeType = dataUrl.match(/data:([^;]+);/)?.[1] || 'image/png';
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

export async function generateImageWithOpenAI(
  prompt: string,
  referenceImages: string[],
  apiKey: string,
  params: {
    model?: string;
    aspectRatio?: string;
    negativePrompt?: string;
    resolution?: string;
    numberOfImages?: number;
    quality?: 'auto' | 'low' | 'medium' | 'high';
    outputFormat?: 'png' | 'jpeg' | 'webp';
    outputCompression?: number;
    background?: 'transparent' | 'opaque' | 'auto';
    inputFidelity?: 'high' | 'low';
    moderation?: 'low' | 'auto';
  } = {}
): Promise<string[]> {
  const modelName = params.model || 'gpt-image-2';
  const size = getOpenAISize(params.aspectRatio || '1:1', params.resolution || '1K');
  const n = params.numberOfImages || 1;
  const quality = params.quality || 'auto';
  const outputFormat = params.outputFormat || 'png';
  const outputCompression = params.outputCompression ?? 100;
  const moderation = params.moderation || 'auto';

  let finalPrompt = prompt;
  if (params.negativePrompt && params.negativePrompt.trim()) {
    finalPrompt += `\n\nAvoid: ${params.negativePrompt.trim()}.`;
  }

  const isEditing = referenceImages.length > 0;

  // Edits endpoint
  if (isEditing) {
    const url = `${OPENAI_API_BASE}/images/edits`;
    const formData = new FormData();

    formData.append('model', modelName);
    formData.append('prompt', finalPrompt);
    formData.append('n', String(Math.min(n, 10)));
    formData.append('size', size);
    formData.append('quality', quality);
    formData.append('output_format', outputFormat);
    if (outputFormat !== 'png') {
      formData.append('output_compression', String(outputCompression));
    }
    formData.append('moderation', moderation);

    if (params.background) {
      formData.append('background', params.background);
    }
    if (params.inputFidelity) {
      formData.append('input_fidelity', params.inputFidelity);
    }

    for (let i = 0; i < referenceImages.length; i++) {
      const img = referenceImages[i];
      const blob = dataUrlToBlob(img);
      const ext = blob.type === 'image/jpeg' ? 'jpg' : blob.type === 'image/webp' ? 'webp' : 'png';
      formData.append('image', blob, `reference_${i}.${ext}`);
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const images: string[] = [];
    for (const item of data.data || []) {
      if (item.b64_json) {
        const mime = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png';
        images.push(`data:${mime};base64,${item.b64_json}`);
      } else if (item.url) {
        images.push(item.url);
      }
    }
    if (images.length === 0) {
      throw new Error('No image was returned from OpenAI. Try again or use a different prompt.');
    }
    return images;
  }

  // Generations endpoint
  const url = `${OPENAI_API_BASE}/images/generations`;

  const body: Record<string, unknown> = {
    model: modelName,
    prompt: finalPrompt,
    n: Math.min(n, 10),
    size,
    quality,
    output_format: outputFormat,
    moderation,
  };

  if (outputFormat !== 'png') {
    body.output_compression = outputCompression;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const images: string[] = [];
  for (const item of data.data || []) {
    if (item.b64_json) {
      const mime = outputFormat === 'jpeg' ? 'image/jpeg' : outputFormat === 'webp' ? 'image/webp' : 'image/png';
      images.push(`data:${mime};base64,${item.b64_json}`);
    } else if (item.url) {
      images.push(item.url);
    }
  }
  if (images.length === 0) {
    throw new Error('No image was returned from OpenAI. Try again or use a different prompt.');
  }
  return images;
}
