# Graph Report - bratislava  (2026-09-12)

## Corpus Check
- Corpus is ~22,881 words - fits in a single context window. You may not need a graph.

## Summary
- 240 nodes · 481 edges · 17 communities (11 shown, 6 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 14 edges (avg confidence: 0.85)
- Token cost: 7,735 input · 1,724 output

## Community Hubs (Navigation)
- Provider APIs and Settings
- Canvas and Project UI
- Package and Lint Config
- Node Defaults and Templates
- Browser TypeScript Config
- Shared UI Components
- Build TypeScript Config
- Developer Tooling
- Runtime Dependencies
- Kling Video API
- Empty Canvas Actions
- TypeScript Project References
- HTML Entry Point
- Project Documentation
- Project Architecture
- API Integration Layer
- XYFlow Graph Engine

## God Nodes (most connected - your core abstractions)
1. `react` - 19 edges
2. `compilerOptions` - 17 edges
3. `compilerOptions` - 16 edges
4. `lucide-react` - 15 edges
5. `@xyflow/react` - 11 edges
6. `getProjects()` - 11 edges
7. `ProjectDashboard()` - 9 edges
8. `useSettingsPanel()` - 9 edges
9. `usePreventCanvasZoom()` - 9 edges
10. `createProject()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `Loom README` --references--> `Loom Logo`  [EXTRACTED]
  README.md → src/assets/logo.png
- `Index HTML` --references--> `Loom Favicon`  [EXTRACTED]
  index.html → public/favicon.png
- `VideoGenNode()` --calls--> `generateVideoWithKling()`  [EXTRACTED]
  src/nodes/VideoGenNode.tsx → src/api/kling.ts
- `ApiKeyModal()` --calls--> `usePreventCanvasZoom()`  [EXTRACTED]
  src/components/ApiKeyModal.tsx → src/hooks/usePreventCanvasZoom.ts
- `ImageGenSettings()` --calls--> `usePreventCanvasZoom()`  [EXTRACTED]
  src/components/NodeSettingsPanel.tsx → src/hooks/usePreventCanvasZoom.ts

## Import Cycles
- None detected.

## Communities (17 total, 6 thin omitted)

### Community 0 - "Provider APIs and Settings"
Cohesion: 0.11
Nodes (35): lucide-react, react-dom, @xyflow/react, enhancePromptWithGemini(), generateImageWithGemini(), dataUrlToBlob(), generateImageWithOpenAI(), getOpenAISize() (+27 more)

### Community 1 - "Canvas and Project UI"
Cohesion: 0.13
Nodes (36): App(), Flow(), getId(), HANDLE_KIND, HandleKind, isValidConnection(), MainContent(), Loom Sub-logo (+28 more)

### Community 2 - "Package and Lint Config"
Cohesion: 0.08
Nodes (28): author, description, keywords, license, name, private, scripts, build (+20 more)

### Community 3 - "Node Defaults and Templates"
Cohesion: 0.15
Nodes (14): DEFAULT_IMAGE_SYSTEM_PROMPT, DEFAULT_VIDEO_SYSTEM_PROMPT, createDragPreview(), createTemplateDragPreview(), isLightTheme(), NODE_WIDTHS, nodeTypes, Sidebar() (+6 more)

### Community 4 - "Browser TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection, moduleResolution (+10 more)

### Community 5 - "Shared UI Components"
Cohesion: 0.16
Nodes (12): react, ApiKeyModal(), ApiKeyModalProps, ProviderGuide, ConfirmDialog(), ConfirmDialogProps, EdgeContextMenu(), EdgeContextMenuProps (+4 more)

### Community 6 - "Build TypeScript Config"
Cohesion: 0.11
Nodes (17): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+9 more)

### Community 7 - "Developer Tooling"
Cohesion: 0.15
Nodes (13): devDependencies, eslint, @eslint/js, eslint-plugin-react-hooks, eslint-plugin-react-refresh, globals, @types/node, @types/react (+5 more)

### Community 8 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, clsx, lucide-react, react, react-dom, tailwindcss, @tailwindcss/vite, @xyflow/react

### Community 9 - "Kling Video API"
Cohesion: 0.48
Nodes (6): generateKlingToken(), generateVideoWithKling(), KlingTaskResponse, KlingTaskResult, parseKlingKey(), pollKlingTask()

### Community 10 - "Empty Canvas Actions"
Cohesion: 0.50
Nodes (3): EmptyState(), EmptyStateProps, nodeButtons

## Knowledge Gaps
- **104 isolated node(s):** `name`, `description`, `version`, `private`, `author` (+99 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 109 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Shared UI Components` to `Provider APIs and Settings`, `Canvas and Project UI`, `Package and Lint Config`?**
  _High betweenness centrality (0.129) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `Provider APIs and Settings` to `Canvas and Project UI`, `Package and Lint Config`, `Node Defaults and Templates`, `Shared UI Components`, `Empty Canvas Actions`?**
  _High betweenness centrality (0.103) - this node is a cross-community bridge._
- **Why does `@xyflow/react` connect `Provider APIs and Settings` to `Canvas and Project UI`, `Package and Lint Config`, `Node Defaults and Templates`, `Shared UI Components`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `name`, `description`, `version` to the rest of the system?**
  _104 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Provider APIs and Settings` be split into smaller, more focused modules?**
  _Cohesion score 0.1054421768707483 - nodes in this community are weakly interconnected._
- **Should `Canvas and Project UI` be split into smaller, more focused modules?**
  _Cohesion score 0.1273532668881506 - nodes in this community are weakly interconnected._
- **Should `Package and Lint Config` be split into smaller, more focused modules?**
  _Cohesion score 0.07741935483870968 - nodes in this community are weakly interconnected._