# HIVAI Local V2

HIVAI Local V2 is the new local-first architecture based on the specification in the project notes.

## Core rule

AI inference is local. There is no AI API key, AI backend, or cloud inference path.

The model is loaded from device-local files through Transformers.js + WebGPU. Transformers.js supports browser inference without a server and can use WebGPU for acceleration. See the official documentation for the runtime details.

## Current foundation

- Futuristic cyan/orange HIVAI HUD
- Local-only brain boundary
- WebGPU LLM runtime
- IndexedDB persistent conversation memory
- Local self-learning knowledge store
- Local tool registry
- Procedural 3D studio foundation
- Offline diagnostic
- Responsive desktop/iPad-oriented UI

## Self-learning definition

HIVAI's learning system is broader than remembering the user. It can store useful concepts and knowledge extracted from conversations, code, local files, and future local datasets. Later phases can use those local datasets for model adaptation/fine-tuning.

It does **not** pretend that storing a memory automatically retrains the neural network.

## 3D system

The first 3D layer is procedural and local: HIVAI can generate geometry/material recipes and render them with Three.js. A later phase can add a local text-to-3D model for true generative meshes/textures.

## Development

```bash
cd local-v2
npm install
npm run dev
```

Then open the local Vite address shown by the terminal.

## Model

The repository does not contain model weights. Put a compatible local model in `models/Qwen2.5-0.5B-Instruct/` and keep the runtime in local-only mode.

The first-load model acquisition is an installation step, not a runtime AI service. After the model is installed, the application is designed to run with networking disabled.
