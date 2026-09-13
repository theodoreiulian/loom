import type { ProviderId } from '../models/types';

/** Everything the UI needs to collect and store one provider credential. */
export interface ProviderKeyInfo {
  id: ProviderId;
  label: string;
  storageKey: string;
  placeholder: string;
  /** Where to create the key. */
  consoleUrl: string;
  /** Short note rendered under the input. */
  note: string;
  steps: string[];
}

export const PROVIDER_KEYS: ProviderKeyInfo[] = [
  {
    id: 'fal',
    label: 'fal.ai',
    storageKey: 'Loom:api:fal',
    placeholder: 'fal key',
    consoleUrl: 'https://fal.ai/dashboard/keys',
    note: 'One key unlocks most models in Loom — Seedance, Kling, Veo, Sora, FLUX, Seedream and more.',
    steps: [
      'Sign in at fal.ai and open Dashboard → Keys.',
      'Create a new API key and copy it (it is only shown once).',
      'Add billing in Dashboard → Billing; fal charges per generation.',
      'Paste the key here and click Save Keys.',
    ],
  },
  {
    id: 'google',
    label: 'Google Gemini',
    storageKey: 'Loom:api:gemini',
    placeholder: 'AIzaSy...',
    consoleUrl: 'https://aistudio.google.com/app/apikey',
    note: 'Used for prompt engineering, Nano Banana image models and Veo video.',
    steps: [
      'Open Google AI Studio → API keys and sign in.',
      'Click Create API key and pick (or create) a Cloud project.',
      'Enable billing on that project — Veo and 4K image output require it.',
      'Paste the key here and click Save Keys.',
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    storageKey: 'Loom:api:openai',
    placeholder: 'sk-...',
    consoleUrl: 'https://platform.openai.com/api-keys',
    note: 'Used for GPT Image and Sora when calling OpenAI directly.',
    steps: [
      'Open platform.openai.com → API keys and log in.',
      'Create a new secret key and copy it immediately.',
      'Add pre-paid credit under Billing — the API blocks requests at $0.',
      'Paste the key here and click Save Keys.',
    ],
  },
  {
    id: 'modelark',
    label: 'BytePlus ModelArk',
    storageKey: 'Loom:api:modelark',
    placeholder: 'ARK API key',
    consoleUrl: 'https://console.byteplus.com/ark',
    note: 'First-party Seedance video and Seedream image models.',
    steps: [
      'Sign in to the BytePlus ModelArk console.',
      'Activate the Seedance / Seedream models you want to use.',
      'Create an API key under API keys and copy it.',
      'Paste the key here and click Save Keys.',
    ],
  },
  {
    id: 'kling',
    label: 'Kling AI',
    storageKey: 'Loom:api:kling',
    placeholder: 'Kling API key',
    consoleUrl: 'https://app.klingai.com',
    note: 'Kling has no CORS support — direct Kling models only work while running `npm run dev`.',
    steps: [
      'Open the Kling AI console and sign in.',
      'Create a new API key and copy it (shown once).',
      'Buy API credits — they are separate from web credits.',
      'Paste the key here. Legacy "accessKey|secretKey" pairs still work.',
    ],
  },
];

const BY_PROVIDER = new Map(PROVIDER_KEYS.map((info) => [info.id, info]));

export function providerKeyInfo(provider: ProviderId): ProviderKeyInfo {
  const info = BY_PROVIDER.get(provider);
  if (!info) throw new Error(`Unknown provider: ${provider}`);
  return info;
}

export function getApiKey(provider: ProviderId): string | null {
  if (typeof localStorage === 'undefined') return null;
  const value = localStorage.getItem(providerKeyInfo(provider).storageKey);
  return value && value.trim() ? value.trim() : null;
}

export function setApiKey(provider: ProviderId, value: string): void {
  const { storageKey } = providerKeyInfo(provider);
  if (value.trim()) localStorage.setItem(storageKey, value.trim());
  else localStorage.removeItem(storageKey);
}

export function hasApiKey(provider: ProviderId): boolean {
  return getApiKey(provider) !== null;
}
