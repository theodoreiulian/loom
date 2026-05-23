# Loom

A node-based editor for chaining AI image, video, and text generation. Runs entirely in your browser — you bring your own API keys, and requests go straight from your browser to the provider. No backend, no accounts, no credits to buy.

<p align="center">
  <img src="src/assets/logo.png" alt="Loom" width="80" />
</p>

## Why

Most hosted node editors for AI generation resell API access at a markup and lock your work behind their billing. If you're already paying OpenAI or Google directly, there's no reason to also pay someone else's per-credit fee on top.

Loom is the editor without that part. Your keys live in `localStorage`.

## What works today

- **Image:** GPT Image 2, Gemini (Pro/Flash)
- **Video:** Kling, Veo
- **Text:** Gemini 3.1 (Flash/Lite)

You can chain these however you want — e.g. text node refines a prompt → image node generates → that image feeds a video node as a reference.

## Running it

```bash
git clone https://github.com/theodoreiulian/loom.git
cd loom
npm install
npm run dev
```

Needs Node 18+. Open the settings panel in the header to paste your API keys. There are short walkthroughs in the app for each provider if you haven't generated a key before.

## Demos

Setup and key management:

https://github.com/user-attachments/assets/54312b8a-7c8e-4186-bdd7-82488e327a9b

Text-to-image with an LLM prompt-refiner in the middle:

https://github.com/user-attachments/assets/f0d4b4b1-77a1-4002-8830-0262a492d682

Text + reference image to image:

https://github.com/user-attachments/assets/96f41ce9-bc4b-49e2-8ada-4a445058f225

## Stack

React 19, Vite, TypeScript, XYFlow for the graph, Tailwind 4 for styling.

## Contributing

Loom only covers a handful of providers right now. If you've been wanting Replicate, Runway, Midjourney, Luma, local SDXL via a server URL, audio models, whatever — open a PR!

Beyond new providers, there's plenty of room for ideas that change how the editor itself works: batch runs, looping nodes, conditional branches, saving/loading graphs, sharing presets, better caching of intermediate outputs.