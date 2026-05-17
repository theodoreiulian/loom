# Loom

**Loom** is a modern, node-based AI workflow editor designed for creative professionals and developers. Orchestrate complex AI pipelines for image and video generation through an intuitive visual interface.

<p align="center">
  <img src="src/assets/logo.png" alt="Loom" width="120" />
</p>

## Demo

See Loom in action — building and running AI generation workflows:

https://github.com/user-attachments/assets/4409bccf-f4c1-4f6c-99e6-c681973ec66c

https://github.com/user-attachments/assets/275e0d03-d1ae-4cd5-9e8e-520b84480de8

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
- A Kling API Key (optional, for video generation)

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

## Technology Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Graph Engine**: [XYFlow](https://xyflow.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

## Contributing

Loom is open to collaboration. If you've built a meaningful improvement — a new node type, a new API integration, a UI enhancement — and think it belongs in the main repo, you're welcome to propose it.

All contributions go through a pull request review process and require approval before being merged.

### How to contribute

1. **Fork the repository** on GitHub.
2. **Create a branch** for your change:
   ```bash
   git checkout -b my-feature
   ```
3. **Make your changes**, keeping them focused and minimal — one feature or fix per pull request.
4. **Test your changes** locally with `npm run dev` and make sure `npm run build` passes without errors.
5. **Open a pull request** against the `main` branch with a clear description of what you changed and why.

Pull requests will be reviewed and merged at the maintainer's discretion.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
