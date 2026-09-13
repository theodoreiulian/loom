# Loom — Project Context

## Project Overview
**Loom** is a node-based AI workflow editor for building image and video generation
pipelines. Users wire together prompt, reference-image, prompt-engineering and
generator nodes on a canvas. It is a pure browser app: keys live in `localStorage`
and requests go straight from the browser to each provider.

### Core Technologies
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Graph Engine**: [XYFlow](https://xyflow.com/)
- **Tests**: Vitest (`npm test`)
- **Icons**: Lucide React

## Architecture

### Model registry (`src/models/`)
Every generative model is one declarative `ModelSpec` — wire id, capabilities and
the parameters Loom should render. The registry drives the settings UI, the
request payload and validation, so adding a model is a catalog entry, not a code
path.

- `types.ts` — `ModelSpec`, `ParamSpec`, routing types
- `params.ts` — helpers for building parameter specs
- `catalog.image.ts` / `catalog.video.ts` — the models themselves
- `index.ts` — lookup, defaults, `normalizeValues`, route selection
- `migrate.ts` — maps pre-registry node payloads onto catalog models

Parameter `key`s must match the provider's wire field names; adapters forward
them verbatim. See `docs/models.md` for the schema sources and how to add a model.

### API layer (`src/api/`)
- `run.ts` — `runImageModel` / `runVideoModel`; validates inputs and keys, then
  dispatches to a provider adapter
- `providers/fal.ts` — generic fal.ai queue adapter (covers most of the catalog)
- `providers/google.ts` — Gemini image `generateContent` + Veo `predictLongRunning`
- `providers/openai.ts` — images and Sora videos
- `providers/kling.ts` — Kling 3.x official API (needs the dev proxy, no CORS)
- `providers/modelark.ts` — BytePlus Seedance / Seedream
- `keys.ts` — provider key registry (labels, storage keys, setup steps)
- `media.ts` — data-URL/blob helpers, best-effort inlining of result media
- `json.ts` — small helpers for reading loose provider JSON without `any`
- `gemini.ts` — prompt-engineering call and the default system prompts

### Graph (`src/graph/`)
- `handles.ts` — the handle→kind map, the per-role video handles and connection
  validation
- `resolve.ts` — pure resolution of a node's prompt and its images per role
  (start frame / end frame / references), including pass-through when a Prompt
  Engineer node hasn't run yet

Image inputs are role-based: `capabilities.images` lists the roles a model
accepts, the node renders one handle per role, and `routing.fields` maps each
role to its wire field. The connected roles choose the endpoint
(`reference` → `image` → `text`).

### Nodes (`src/nodes/`)
Generator nodes store `{ modelId, params }` only. `defaults.ts` builds node data
and migrates saved projects on load.

## Building and Running
- **Development**: `npm run dev` (also proxies `/api/kling`)
- **Build**: `npm run build`
- **Lint**: `npm run lint`
- **Test**: `npm test`

## Development Conventions
- **Component Pattern**: functional components with hooks.
- **State**: XYFlow's `useNodesState` / `useEdgesState` for graph state, React
  Context for UI state.
- **Type Safety**: no `any` in new code — use the helpers in `src/api/json.ts`
  when reading provider responses.
- **Node Handles**: keep the `-out` / `-in` naming and register every handle in
  `src/graph/handles.ts`.
- **Model changes**: transcribe enums and defaults from the provider's published
  schema, then run `npm test` — the catalog tests check that defaults are valid
  members of their own enums and that routing is complete.
- **Styling**: Tailwind CSS 4 utility classes; `clsx` for conditional classes.
