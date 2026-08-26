/* HIVAI LOCAL VOICE // Kokoro-82M */
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.0/+esm";

const MODEL = "onnx-community/Kokoro-82M-v1.0-ONNX";
let tts = null;
let loading = null;
let currentAudio = null;
let audioContext = null;
let analyser = null;
let source = null;

export async function initHIVAIVoice(onProgress = () => {}) {
    if (tts) return tts;
    if (loading) return loading;

    loading = (async () => {
        onProgress({status:"LOADING",progress:0});
        const webgpu = !!navigator.gpu;
        tts = await KokoroTTS.from_pretrained(MODEL, {
            dtype: webgpu ? "fp16" : "q8",
            device: webgpu ? "webgpu" : "wasm"
        });
        onProgress({status:"READY",progress:100});
        return tts;
    })();

    try { return await loading; }
    finally { loading = null; }
}

export async function speakHIVAI(text, {
    voice = "am_michael",
    onStart = () => {},
    onEnd = () => {},
    onError = () => {}
} = {}) {
    if (!text?.trim()) return;

    try {
        await initHIVAIVoice();
        stopHIVAI();
        const result = await tts.generate(text, {voice});
        const wav = result.toWav();
        const blob = new Blob([wav], {type:"audio/wav"});
        const url = URL.createObjectURL(blob);

        currentAudio = new Audio(url);
        currentAudio.preload = "auto";
        currentAudio.volume = 1;

        currentAudio.onplay = () => {
            setupAnalyser(currentAudio);
            onStart();
        };

        currentAudio.onended = () => {
            URL.revokeObjectURL(url);
            currentAudio = null;
            onEnd();
        };

        currentAudio.onerror = (e) => {
            URL.revokeObjectURL(url);
            currentAudio = null;
            onError(e);
        };

        await currentAudio.play();
        return currentAudio;
    } catch (error) {
        onError(error);
        throw error;
    }
}

function setupAnalyser(audio) {
    try {
        if (!audioContext) audioContext = new AudioContext();
        if (audioContext.state === "suspended") audioContext.resume();
        if (!analyser) {
            analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = .75;
        }
        if (source) {
            try { source.disconnect(); } catch {}
        }
        source = audioContext.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(audioContext.destination);
    } catch (e) {
        console.warn("HIVAI voice analyser unavailable", e);
    }
}

export function getVoiceEnergy() {
    if (!analyser) return 0;
    const data = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(data);
    let total = 0;
    for (const value of data) total += value;
    return Math.min(1, total / data.length / 255);
}

export function stopHIVAI() {
    if (!currentAudio) return;
    try { currentAudio.pause(); currentAudio.currentTime = 0; } catch {}
    currentAudio = null;
}
