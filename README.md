<p align="center">
  <img src="src/assets/logo.png" alt="Loom" width="120" />
</p>

<h1 align="center">Loom ✦ The Zero-Markup AI Workflow Builder</h1>

<p align="center">
  <strong>Stop paying 300% markups on AI generation. Bring your own keys and build complex node-based visual pipelines for exactly what the API costs.</strong>
</p>

---

## The Problem with AI Wrappers
Node-based AI editors are powerful, but the current ecosystem is fundamentally flawed. Most platforms (like hosted ComfyUI services or proprietary node editors) act as middlemen. They force you to buy "credits" on their platform, charging you massive markups on top of the base compute/API costs. You lose control of your billing, pay inflated prices, and get locked into their ecosystem.

## The Solution: Bring Your Own Key (BYOK)
**Loom** is a completely open-source, beautifully designed node editor built for the BYOK era. 

There is no backend. There is no database. There is no Loom subscription.

You plug your API keys directly into your browser's local storage. Your browser talks directly to Google, OpenAI, or Kling. You pay exactly what the API costs, directly to the provider, with **zero middleman markup**.

### ✨ Features
- **100% Client-Side & Private**: Your API keys never leave your browser. They are stored securely in `localStorage`.
- **Zero Markups**: By connecting directly to the model APIs, you pay base developer costs.
- **Visual Node Workflows**: Drag, drop, and connect nodes to create infinitely complex, non-linear generation pipelines.
- **Multi-Model Magic**: 
  - 🎨 **Image Generation**: OpenAI (DALL-E) & Google Gemini
  - 🎬 **Video Generation**: Kling AI & Google Veo 
  - 🧠 **Prompt Engineering**: Use LLMs as nodes to auto-refine and enhance your prompts before passing them to generators.
- **Export & Share**: Download all generated assets locally in one click.

---

## 🎥 Demos

**The Zero-Markup "BYOK" Setup**
Local, completely private API key integration with built-in guides:

https://github.com/user-attachments/assets/54312b8a-7c8e-4186-bdd7-82488e327a9b

**Text-to-Image Pipeline**
Using an LLM Prompt Engineer node to automatically refine a basic prompt into a high-quality generation prompt:

https://github.com/user-attachments/assets/f0d4b4b1-77a1-4002-8830-0262a492d682

**Text + Reference Image to Image**
Combining text input with a reference image to guide generation style and content:

https://github.com/user-attachments/assets/96f41ce9-bc4b-49e2-8ada-4a445058f225

---

## 🚀 Quick Start

Run Loom locally in less than a minute.

### Prerequisites
- Node.js (v18+)
- API Keys for the providers you want to use (Gemini, OpenAI, Kling). 

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

4. **Add your API Keys**
   Click the **Settings** icon in the header. Enter your keys. Loom includes step-by-step guides inside the app if you don't know how to generate an API key for a specific provider!

---

## 🛠️ Architecture & Tech Stack

Loom is built to be blisteringly fast and highly extensible.

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Graph Engine**: [XYFlow](https://xyflow.com/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)

### Adding Custom Nodes
Loom's architecture makes it trivial to add new integrations. 
1. Create your component in `src/nodes/`.
2. Register it in `src/nodes/index.ts`.
3. Add the type definition in `src/types.ts`.
4. Drop it into the `Sidebar.tsx`.

## 🤝 Contributing

We are building the definitive open-source node editor for AI. If you want to add integrations for Midjourney, RunPod, Replicate, or local SDXL inference—we want your PRs.

1. **Fork the repository**.
2. **Create a branch** (`git checkout -b feature/amazing-new-node`).
3. **Commit your changes**.
4. **Open a Pull Request**.

Please ensure your code passes `npm run lint` and `npm run build` before submitting.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---
*If Loom saves you money on your AI workflows, please consider giving the repo a ⭐ to help others find it!*
