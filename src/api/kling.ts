const KLING_API_BASE = import.meta.env.DEV 
  ? '/api/kling' 
  : 'https://api-singapore.klingai.com';

export interface KlingTaskResponse {
  data?: {
    task_id: string;
  };
  code?: number;
  message?: string;
}

interface KlingTaskResult {
  data?: {
    task_status: string;
    task_result?: {
      videos?: Array<{ url: string; duration?: string }>;
    };
  };
  code?: number;
  message?: string;
}

/**
 * Generates a JWT token for Kling API authentication (HS256).
 */
async function generateKlingToken(accessKey: string, secretKey: string): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: accessKey,
    exp: now + 1800, // 30 minutes
    nbf: now - 5,    // 5 seconds ago
  };

  const base64Url = (str: string) => {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const unsignedToken = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(payload))}`;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secretKey);
  const messageData = encoder.encode(unsignedToken);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signatureBuffer = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
  const signatureArray = new Uint8Array(signatureBuffer);
  
  // Convert signature to base64url
  let binary = '';
  for (let i = 0; i < signatureArray.byteLength; i++) {
    binary += String.fromCharCode(signatureArray[i]);
  }
  const signatureBase64 = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${unsignedToken}.${signatureBase64}`;
}

function parseKlingKey(apiKey: string): { accessKey: string; secretKey: string } {
  if (apiKey.includes('|')) {
    const [accessKey, secretKey] = apiKey.split('|');
    return { accessKey: accessKey.trim(), secretKey: secretKey.trim() };
  }
  return { accessKey: apiKey.trim(), secretKey: '' };
}

export async function generateVideoWithKling(
  prompt: string,
  referenceImage: string | null,
  _mode: 'reference' | 'starting-frame',
  duration: number,
  aspectRatio: '16:9' | '9:16' | '1:1',
  apiKey: string,
  params: {
    negativePrompt?: string;
    resolution?: '720p' | '1080p' | '4K';
    model?: string;
  } = {}
): Promise<string> {
  const { accessKey, secretKey } = parseKlingKey(apiKey);
  if (!secretKey) {
    throw new Error('Kling API key format should be "accessKey|secretKey". Set both parts in Settings.');
  }

  // Determine endpoint based on whether an image is provided
  const isImageToVideo = !!referenceImage;
  const path = isImageToVideo ? '/v1/videos/image2video' : '/v1/videos/text2video';
  const url = `${KLING_API_BASE}${path}`;

  // Map resolution to Kling mode
  const klingMode = params.resolution === '720p' ? 'std' : 'pro';

  const body: Record<string, unknown> = {
    model_name: params.model || 'kling-v1',
    prompt,
    duration: duration.toString(),
    aspect_ratio: aspectRatio,
    mode: klingMode,
    cfg_scale: 0.5,
  };

  if (referenceImage) {
    // Kling Global/Singapore requires raw base64 without prefix and the field name MUST be 'image'
    const base64Data = referenceImage.includes(',') ? referenceImage.split(',')[1] : referenceImage;
    body.image = base64Data;
  }

  if (params.negativePrompt && params.negativePrompt.trim()) {
    body.negative_prompt = params.negativePrompt.trim();
  }

  const token = await generateKlingToken(accessKey, secretKey);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  } catch (err: any) {
    throw new Error(`Kling API request failed: ${err.message || 'Unknown network error'}. This is likely a CORS issue. Please ensure you are running in development mode with the Vite proxy enabled.`);
  }

  const errData = await response.json().catch(() => ({}));
  if (!response.ok || (errData.code !== 0 && errData.code !== undefined)) {
    const code = errData.code || response.status;
    const msg = errData.message || 'Unknown error';
    
    if (code === 1201) {
      throw new Error(`[Kling Error 1201] Account balance not enough. Note: Web credits and API credits are separate. If you have "Standard" credits, try T2V (Text-to-Video) with 5s and 720p settings.`);
    }
    
    throw new Error(`Kling API Error (Code: ${code}): ${msg}`);
  }

  const taskId = errData.data?.task_id;

  if (!taskId) {
    throw new Error('No task ID returned from Kling');
  }

  return pollKlingTask(taskId, path, accessKey, secretKey);
}

async function pollKlingTask(taskId: string, baseTypePath: string, accessKey: string, secretKey: string): Promise<string> {
  const maxAttempts = 120; // Increased to 10 mins (5s * 120)
  const interval = 5000;
  const path = `${baseTypePath}/${taskId}`;
  const url = `${KLING_API_BASE}${path}`;

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise((r) => setTimeout(r, interval));

    const token = await generateKlingToken(accessKey, secretKey);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    } catch {
      continue;
    }

    if (!response.ok) continue;

    const data: KlingTaskResult = await response.json();
    const status = data.data?.task_status;

    if (status === 'succeed') {
      const videoUrl = data.data?.task_result?.videos?.[0]?.url;
      if (videoUrl) return videoUrl;
      throw new Error('Task succeeded but no video URL found');
    }

    if (status === 'failed') {
      throw new Error(data.message || 'Video generation failed');
    }

    // Keep polling for 'submitted' or 'processing'
  }

  throw new Error('Video generation timed out. You can check the status again later in the Developer Console.');
}

