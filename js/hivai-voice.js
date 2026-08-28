/* HIVAI local Kokoro voice engine. No ElevenLabs/API key. */
let tts = null;
let loading = null;
let currentAudio = null;
let audioContext = null;
let analyser = null;
let source = null;

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
const VOICE = "am_michael";

export async function initHIVAIVoice(onProgress = () => {}) {
  if (tts) return tts;
  if (loading) return loading;

  loading = (async () => {
    onProgress({ status: "LOADING", progress: 0 });
    const mod = await import("https://esm.sh/kokoro-js@1.2.0?target=es2022");
    const KokoroTTS = mod.KokoroTTS;
    if (!KokoroTTS) throw new Error("KokoroTTS export not found");

    // WASM first for maximum browser compatibility. WebGPU can be enabled later.
    try {
      tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "q8", device: "wasm" });
    } catch (wasmError) {
      if (!navigator.gpu) throw wasmError;
      tts = await KokoroTTS.from_pretrained(MODEL, { dtype: "fp32", device: "webgpu" });
    }

    const voices = typeof tts.list_voices === "function" ? tts.list_voices() : [];
    if (voices.length && !voices.includes(VOICE)) {
      throw new Error(`Kokoro voice ${VOICE} is unavailable`);
    }
    onProgress({ status: "READY", progress: 100 });
    return tts;
  })();

  try { return await loading; }
  finally { loading = null; }
}

function wavBlob(audio) {
  if (typeof audio.toBlob === "function") return audio.toBlob();
  if (audio.buffer) return new Blob([audio.buffer], { type: "audio/wav" });
  throw new Error("Kokoro returned audio in an unsupported format");
}

export async function speakHIVAI(text, { voice = VOICE, onStart = () => {}, onEnd = () => {}, onError = () => {} } = {}) {
  if (!text?.trim()) return;
  try {
    const engine = await initHIVAIVoice();
    stopHIVAI();
    const result = await engine.generate(text.slice(0, 5000), { voice });
    const blob = wavBlob(result);
    const url = URL.createObjectURL(blob);
    const audio = new Audio();
    audio.preload = "auto";
    audio.volume = 1;
    currentAudio = audio;

    audio.onplay = () => { setupAnalyser(audio); onStart(); };
    audio.onended = () => { URL.revokeObjectURL(url); if (currentAudio === audio) currentAudio = null; onEnd(); };
    audio.onerror = (e) => { URL.revokeObjectURL(url); if (currentAudio === audio) currentAudio = null; onError(e); };
    audio.src = url;
    await audio.play();
    return audio;
  } catch (e) {
    onError(e);
    throw e;
  }
}

function setupAnalyser(audio) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    analyser ||= audioContext.createAnalyser();
    analyser.fftSize = 256;
    if (source) { try { source.disconnect(); } catch {} }
    source = audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  } catch (e) { console.warn("HIVAI voice analyser unavailable", e); }
}

export function getVoiceEnergy() {
  if (!analyser) return 0;
  const data = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  let total = 0; for (const n of data) total += n;
  return Math.min(1, total / data.length / 255);
}

export function stopHIVAI() {
  if (!currentAudio) return;
  try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {}
  currentAudio = null;
}
