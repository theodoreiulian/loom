# Model catalog

Loom's generators are driven by a declarative registry in `src/models/`. Each
entry describes a model's wire identifier, its capabilities, and the parameters
Loom should render — the settings panel, request payloads and validation are all
generated from it. Adding a model means adding one object, not a new code path.

- `src/models/catalog.image.ts` — 22 image models
- `src/models/catalog.video.ts` — 28 video models
- `src/api/providers/` — one adapter per backend
- `src/api/run.ts` — the dispatcher nodes call

## Backends

| Backend | Key | CORS | Covers |
| --- | --- | --- | --- |
| fal.ai | `Loom:api:fal` | yes | Most of the catalog: Seedance, Kling, Veo, Sora, Wan, MiniMax, FLUX, Seedream, GPT Image, Nano Banana, Ideogram, Recraft, Grok, LTX, PixVerse |
| Gemini API | `Loom:api:gemini` | yes | Nano Banana image models, Veo 3.1 video, prompt engineering |
| OpenAI API | `Loom:api:openai` | yes | GPT Image, Sora 2 |
| BytePlus ModelArk | `Loom:api:modelark` | yes | First-party Seedance video, Seedream image |
| Kling API | `Loom:api:kling` | **no** | Kling 3.0 / 3.0 Turbo / 2.6 — requires the `npm run dev` proxy |

Several models appear twice — once via fal.ai and once against the vendor's own
API — because both routes are useful: fal needs a single key for the whole
catalog, while the vendor route uses your own account and pricing. The model
picker tags each entry with the backend it calls (`fal.ai`, `gemini`, `openai`,
`modelark`, `kling`), and so does the node header.

## Image inputs

Generator nodes expose one handle per image role the selected model actually
supports, so nothing has to be inferred from connection order:

| Role | Handle | Meaning |
| --- | --- | --- |
| Prompt | `video-text-in` / `image-text-in` | Text from a Prompt or Prompt Engineer node |
| Start frame | `video-start-in` | First frame the video animates from |
| End frame | `video-end-in` | Final frame to interpolate towards |
| References | `video-ref-in` / `image-image-in` | Subject, character or style references |

Which handles appear is driven by `capabilities.images` in the catalog, and the
connected roles pick the endpoint: references route to the model's
reference-to-video endpoint, a start frame to image-to-video, otherwise
text-to-video. Switching a node's model drops edges into handles the new model
doesn't have, and projects saved before roles existed have their single video
image edge rewired to the start-frame handle on load.

## Video models

| Model | Vendor | Called through | Image inputs | Notes |
| --- | --- | --- | --- | --- |
| `fal:seedance-2.5` — Seedance 2.5 | ByteDance | fal.ai | start + end + references×10 | Latest Seedance. Up to 30s, native audio, 1080p, first/last frame and multi-reference. |
| `fal:seedance-2.0` — Seedance 2.0 | ByteDance | fal.ai | start + end + references×10 | Previous-generation Seedance with 4K output, native audio and multi-reference. |
| `fal:kling-v3-pro` — Kling v3 Pro **PRO** | Kuaishou | fal.ai | start + end | Kling 3.0 Pro with native audio, shot control and first/last frames. |
| `fal:kling-v3-standard` — Kling v3 Standard | Kuaishou | fal.ai | start + end | Cheaper Kling 3.0 tier with the same controls as Pro. |
| `fal:kling-o3-pro` — Kling O3 Pro **PRO** | Kuaishou | fal.ai | start + end + references×4 | Kling O3 reasoning-driven cinematography, with frames or references. |
| `fal:veo-3.1` — Veo 3.1 | Google | fal.ai | start + references×3 | Google's Veo 3.1 with synced audio, up to 4K, and up to 3 asset references. |
| `fal:veo-3.1-fast` — Veo 3.1 Fast **FAST** | Google | fal.ai | start + references×3 | Lower-latency, lower-cost Veo 3.1. |
| `fal:veo-3.1-lite` — Veo 3.1 Lite **BUDGET** | Google | fal.ai | start | Cheapest Veo 3.1 tier, 720p or 1080p. |
| `fal:gemini-omni-flash-1.1` — Gemini Omni Flash 1.1 | Google | fal.ai | start + end + references×4 | Gemini Omni Flash video: 3–10s up to 4K, frames or references. |
| `fal:sora-2` — Sora 2 | OpenAI | fal.ai | start | OpenAI Sora 2 with dialogue and sound, 4–20s. |
| `fal:minimax-h3-max` — MiniMax H3 Max | MiniMax | fal.ai | start + end + references×4 | H3 Max — MiniMax flagship, strong prompt adherence, 5–15s. |
| `fal:minimax-h3` — MiniMax H3 | MiniMax | fal.ai | start + end + references×4 | MiniMax H3 with 2K/4K output. |
| `fal:hailuo-2.3` — Hailuo 2.3 **BUDGET** | MiniMax | fal.ai | start | Hailuo 2.3 standard — quick, inexpensive 6s or 10s clips. |
| `fal:wan-3.0` — Wan 3.0 | Alibaba | fal.ai | start + end + references×4 | Wan 3.0 with audio, prompt expansion and 2–30s durations. |
| `fal:wan-3.0-prime` — Wan 3.0 Prime **PRO** | Alibaba | fal.ai | start + end + references×4 | Highest-quality Wan 3.0 tier. |
| `fal:grok-imagine-video-1.5` — Grok Imagine Video 1.5 | xAI | fal.ai | start + references×4 | xAI Grok Imagine 1.5 — fast, wide aspect-ratio coverage. |
| `fal:flux-3-video` — FLUX 3 Video | Black Forest Labs | fal.ai | start | FLUX 3 video generation with audio, 5–20s. |
| `fal:ltx-2.3` — LTX Video 2.3 | Lightricks | fal.ai | start + end | LTX 2.3 Pro — up to 2160p at 24–50 fps with audio. |
| `fal:pixverse-v6` — PixVerse V6 | PixVerse | fal.ai | start + references×4 | PixVerse V6 with styles, multi-clip and 1–15s durations. |
| `google:veo-3.1` — Veo 3.1 | Google | Gemini API | start + end + references×3 | Veo 3.1 straight from the Gemini API: first/last frame plus up to 3 asset references. |
| `google:veo-3.1-lite` — Veo 3.1 Lite **BUDGET** | Google | Gemini API | start + end | Cheapest Veo 3.1 tier from the Gemini API, with first/last frame. |
| `openai:sora-2` — Sora 2 | OpenAI | OpenAI API | start | Sora 2 through the OpenAI videos API using your OpenAI key. |
| `openai:sora-2-pro` — Sora 2 Pro **PRO** | OpenAI | OpenAI API | start | Higher-fidelity Sora 2 tier. |
| `modelark:seedance-2.5` — Seedance 2.5 | ByteDance | BytePlus ModelArk | start + end + references×4 | Seedance 2.5 straight from BytePlus ModelArk. |
| `modelark:seedance-2.0` — Seedance 2.0 | ByteDance | BytePlus ModelArk | start + end + references×4 | Seedance 2.0 from BytePlus ModelArk. |
| `kling:3.0` — Kling 3.0 | Kuaishou | Kling API | start + end | Kling 3.0 via the official API. Needs the local dev proxy (no CORS). |
| `kling:3.0-turbo` — Kling 3.0 Turbo **FAST** | Kuaishou | Kling API | start + end | Faster Kling 3.0 tier via the official API (dev proxy required). |
| `kling:2.6` — Kling 2.6 | Kuaishou | Kling API | start + end | Kling 2.6 via the official API (dev proxy required). |

## Image models

| Model | Vendor | Called through | Image inputs | Notes |
| --- | --- | --- | --- | --- |
| `fal:nano-banana-2` — Nano Banana 2 | Google | fal.ai | references×14 | Gemini 3.1 Flash Image — fast, excellent text rendering, up to 4K. |
| `fal:nano-banana-pro` — Nano Banana Pro | Google | fal.ai | references×14 | Gemini 3 Pro Image — highest-fidelity Google image model. |
| `fal:gpt-image-2` — GPT Image 2 | OpenAI | fal.ai | references×10 | OpenAI GPT Image 2 with transparency and quality control. |
| `fal:gpt-image-2.5-flare` — GPT Image 2.5 Flare | OpenAI | fal.ai | references×10 | GPT Image 2.5 Flare — newest OpenAI image model, up to "max" quality. |
| `fal:gpt-image-2.5-sunburst` — GPT Image 2.5 Sunburst | OpenAI | fal.ai | references×10 | GPT Image 2.5 Sunburst variant — alternate aesthetic tuning. |
| `fal:flux-2-pro` — FLUX 2 Pro | Black Forest Labs | fal.ai | references×10 | FLUX 2 Pro — photoreal detail with multi-reference editing. |
| `fal:flux-2-max` — FLUX 2 Max **PRO** | Black Forest Labs | fal.ai | references×10 | Top FLUX 2 tier for maximum fidelity. |
| `fal:seedream-5-pro` — Seedream 5.0 Pro | ByteDance | fal.ai | references×10 | Seedream 5.0 Pro — flagship ByteDance image model with strong editing. |
| `fal:seedream-4.5` — Seedream 4.5 | ByteDance | fal.ai | references×10 | Seedream 4.5 — fast, high-resolution generation and editing. |
| `fal:qwen-image-3` — Qwen Image 3 | Alibaba | fal.ai | references×10 | Qwen Image 3 with prompt expansion and negative prompts. |
| `fal:ideogram-v4` — Ideogram V4 | Ideogram | fal.ai | prompt only | Ideogram V4 — best-in-class typography and poster layouts. |
| `fal:recraft-v4.1` — Recraft V4.1 | Recraft | fal.ai | prompt only | Recraft V4.1 — brand-consistent vectors, icons and illustration. |
| `fal:krea-2` — Krea 2 Large | Krea | fal.ai | prompt only | Krea 2 Large — art-directed aesthetics with creativity control. |
| `fal:grok-imagine-image-2` — Grok Imagine Image 2.0 | xAI | fal.ai | references×4 | xAI Grok Imagine 2.0 — fast generation and editing. |
| `google:gemini-3-pro-image` — Nano Banana Pro | Google | Gemini API | references×14 | Gemini 3 Pro Image straight from the Gemini API. |
| `google:gemini-3.1-flash-image` — Nano Banana 2 | Google | Gemini API | references×14 | Gemini 3.1 Flash Image straight from the Gemini API. |
| `google:gemini-3.1-flash-lite-image` — Nano Banana 2 Lite **BUDGET** | Google | Gemini API | references×14 | Cheapest Gemini image model, 512px–2K. |
| `openai:gpt-image-2` — GPT Image 2 | OpenAI | OpenAI API | references×10 | GPT Image 2 through the OpenAI images API using your OpenAI key. |
| `openai:gpt-image-2.5-flare` — GPT Image 2.5 Flare | OpenAI | OpenAI API | references×10 | GPT Image 2.5 Flare through the OpenAI images API. |
| `modelark:seedream-5-pro` — Seedream 5.0 Pro | ByteDance | BytePlus ModelArk | references×10 | Seedream 5.0 Pro straight from BytePlus ModelArk. |
| `modelark:seedream-4.5` — Seedream 4.5 | ByteDance | BytePlus ModelArk | references×10 | Seedream 4.5 from BytePlus ModelArk, with batch generation. |
| `kling:image-v3` — Kling Image v3 | Kuaishou | Kling API | references×1 | Kling v3 image generation via the official API (dev proxy required). |

## Where the parameters come from

Every enum, default and field name below was transcribed from the provider's
published schema at the time of writing:

- fal.ai per-endpoint OpenAPI: `https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=<id>`
- Gemini image generation: https://ai.google.dev/gemini-api/docs/image-generation
- Veo: https://ai.google.dev/gemini-api/docs/veo
- OpenAI images and videos: https://github.com/openai/openai-openapi
- Kling 3.0 / 2.6: https://kling.ai/document-api/api/video/3-0-omni/text-to-video
- BytePlus ModelArk video: https://docs.byteplus.com/en/docs/ModelArk/1520757
- BytePlus ModelArk image: https://docs.byteplus.com/en/docs/ModelArk/1541523

## Verifying the catalog

```bash
npm run verify:models
```

Fetches fal's live OpenAPI schema for every fal-hosted endpoint in the catalog
and checks that the endpoint still exists, that each declared parameter is a
real input field, that our enum values are still accepted, and that the
reference-image fields we populate exist. It hits the network, so it is not part
of `npm test`. The vendor-API models are transcribed from the sources above
and covered by unit tests over their request builders.

## Adding a model

1. Fetch the endpoint schema (for fal, the OpenAPI URL above prints every field).
2. Append a `ModelSpec` to the right catalog file. Parameter `key`s must match
   the wire field names — adapters forward them verbatim.
3. For fal endpoints, set `routing.imageKey` / `imagesKey` / `endImageKey` so
   reference images land in the right field, and `routing.imageSize` when the
   endpoint sizes output via `image_size` instead of an aspect-ratio enum.
4. Run `npm test` — `src/models/catalog.test.ts` checks defaults are valid
   members of their own enums, keys are unique, and routing is complete.
