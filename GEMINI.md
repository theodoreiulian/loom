# GEMINI.md - Loom Project Context

## Project Overview
**Loom** is a node-based AI workflow editor designed to create complex pipelines for AI-driven image and video generation. It provides a visual interface where users can connect various AI functional blocks (nodes) to orchestrate sophisticated creative workflows.

### Core Technologies
- **Framework**: React 19
- **Build Tool**: Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Graph Engine**: [XYFlow](https://xyflow.com/) (formerly React Flow)
- **AI Integrations**: 
    - **Gemini**: Used for image generation (`gemini-3.1-flash-image-preview`) and prompt engineering (`gemini-3.1-flash-lite-preview`).
    - **Kling/Veo**: Integration placeholders for video generation.
- **Icons**: Lucide React

## Architecture
The application follows a centralized state management pattern using XYFlow's built-in hooks within a React context.

- **Main Entry**: `src/App.tsx` manages the global state of nodes and edges, as well as the main interaction logic (drag-and-drop, connection handling).
- **Node System**: Located in `src/nodes/`. Each node is a custom React component registered in `nodeTypes` (`src/nodes/index.ts`).
    - `PromptNode`: Entry point for user input (text prompts and reference images).
    - `PromptEngineerNode`: Uses LLMs to enhance and refine prompts for better results.
    - `ImageGenNode`: Interfaces with image generation APIs.
    - `VideoGenNode`: Interfaces with video generation APIs.
- **API Layer**: `src/api/` contains the service logic for communicating with external AI providers.
- **Type System**: `src/types.ts` provides centralized TypeScript interfaces for node data, API keys, and configuration.
- **Templates**: `src/templates.ts` defines pre-configured node/edge layouts (e.g., Image Pipeline, Video Pipeline).

## Building and Running
- **Development**: `npm run dev` starts the Vite development server.
- **Build**: `npm run build` performs type checking and builds the production assets.
- **Linting**: `npm run lint` executes ESLint rules.
- **Preview**: `npm run preview` serves the production build locally.

## Development Conventions
- **Component Pattern**: Use functional components with hooks.
- **State Management**: Prefer XYFlow's `useNodesState` and `useEdgesState` for graph-related state. Use React Context (`src/context/`) for secondary state like UI settings.
- **Type Safety**: Maintain strict typing for all node data objects. New node types should be added to `NodeData` in `src/types.ts`.
- **Node Handles**: Ensure consistent naming conventions for handles (e.g., `-out` and `-in` suffixes) to facilitate predictable connections in templates.
- **Styling**: Use Tailwind CSS 4 utility classes. Prefer the `clsx` utility for conditional classes.

## Future Roadmap (Inferred)
- Completion of Kling and Veo video generation integrations.
- Persistence layer for saving and loading custom workflows.
- Real-time execution status tracking across complex graphs.
