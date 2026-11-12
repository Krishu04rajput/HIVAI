# HIVAI Local Models

This directory is intentionally model-only. HIVAI Local V2 does **not** download model weights at runtime.

Place a Transformers.js-compatible local model under:

`local-v2/models/Qwen2.5-0.5B-Instruct/`

The folder must contain the model files/tokenizer/config expected by Transformers.js.

For the first prototype we use Qwen2.5-0.5B-Instruct in 4-bit WebGPU mode because the same browser architecture can later be swapped to a larger local model on stronger hardware.

Once the model files are present, HIVAI can run inference with network access disabled.
