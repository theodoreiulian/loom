# Loom

**Loom** is a modern, node-based AI workflow editor designed for creative professionals and developers. Orchestrate complex AI pipelines for image and video generation through an intuitive visual interface.

## Features

- **Visual Workflow Builder**: Connect nodes to create sophisticated AI generation logic using [XYFlow](https://xyflow.com/).
- **Multi-Model Integration**:
  - **Gemini 3.1 Flash**: High-performance image generation and intelligent prompt engineering.
  - **Kling & Veo**: Native integration placeholders for next-gen video generation.
- **Smart Prompt Engineering**: Built-in nodes to refine, expand, and optimize your creative prompts using LLMs.
- **Interactive Node Settings**: Fine-tune aspect ratios, resolutions, and model parameters on the fly.
- **Modern Tech Stack**: Powered by React 19, Vite, and Tailwind CSS 4.

## Quick Start

### Prerequisites
- Node.js (v18+)
- npm or yarn
- A Gemini API Key (for image/text generation)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/theodoreiulian/loom.git
   cd loom
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Add your API Key**
   Click the **Settings** icon in the header to enter your Gemini API key.

## Modifying Loom

Loom is designed to be highly extensible. Here's how you can add your own modifications:

### Adding a New Node Type
1. Create a new component in `src/nodes/` (e.g., `CustomNode.tsx`).
2. Register your node in `src/nodes/index.ts`.
3. Add the corresponding data interface in `src/types.ts`.
4. Update the `Sidebar` to include your new node for drag-and-drop.

### Customizing Templates
Existing layouts are defined in `src/templates.ts`. You can add new pre-configured workflows by adding a new template definition to the `TEMPLATES` object.

## Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Graph Engine**: [XYFlow](https://xyflow.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
