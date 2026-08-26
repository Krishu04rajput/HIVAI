import { KokoroTTS } from "kokoro-js";

const MODEL =
    "onnx-community/Kokoro-82M-ONNX";

let tts = null;
let loading = null;
let currentAudio = null;

let audioContext = null;
let analyser = null;
let source = null;

export async function initHIVAIVoice(
    onProgress = () => {}
) {

    if (tts) {
        return tts;
    }

    if (loading) {
        return loading;
    }

    loading = (async () => {

        onProgress({
            status: "LOADING",
            progress: 0
        });

        const useWebGPU =
            !!navigator.gpu;

        console.log(
            "HIVAI VOICE:",
            useWebGPU
                ? "WebGPU"
                : "WASM"
        );

        tts =
            await KokoroTTS.from_pretrained(
                MODEL,
                {
                    dtype: useWebGPU
                        ? "fp16"
                        : "q8",

                    device: useWebGPU
                        ? "webgpu"
                        : "wasm"
                }
            );

        onProgress({
            status: "READY",
            progress: 100
        });

        return tts;

    })();

    try {

        return await loading;

    } finally {

        loading = null;

    }
}


/* =========================================================
   SPEAK
========================================================= */

export async function speakHIVAI(
    text,
    {
        voice = "am_michael",
        onStart = () => {},
        onEnd = () => {},
        onError = () => {}
    } = {}
) {

    if (!text?.trim()) {
        return;
    }

    try {

        await initHIVAIVoice();

        stopHIVAI();

        onStart();

        const audio =
            await tts.generate(
                text,
                {
                    voice
                }
            );

        /*
         * Kokoro returns audio data.
         */

        const wav =
            audio.toWav();

        const blob =
            new Blob(
                [wav],
                {
                    type: "audio/wav"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        currentAudio =
            new Audio(url);

        currentAudio.preload =
            "auto";

        currentAudio.volume =
            1.0;

        currentAudio.onended =
            () => {

                URL.revokeObjectURL(
                    url
                );

                currentAudio =
                    null;

                onEnd();

            };

        currentAudio.onerror =
            error => {

                console.error(
                    "HIVAI voice playback error:",
                    error
                );

                URL.revokeObjectURL(
                    url
                );

                currentAudio =
                    null;

                onError(error);

            };

        await currentAudio.play();

        return currentAudio;

    }
    catch(error) {

        console.error(
            "HIVAI TTS ERROR:",
            error
        );

        onError(error);

        throw error;

    }

}


/* =========================================================
   STOP
========================================================= */

export function stopHIVAI() {

    if (!currentAudio) {
        return;
    }

    try {

        currentAudio.pause();

        currentAudio.currentTime =
            0;

    }
    catch {}

    currentAudio =
        null;

}


/* =========================================================
   AUDIO ANALYSER
   Used later to make the 3D core react to voice.
========================================================= */

export function connectVoiceAnalyser(
    audioElement
) {

    if (!audioElement) {
        return null;
    }

    if (!audioContext) {

        audioContext =
            new AudioContext();

    }

    if (!analyser) {

        analyser =
            audioContext
                .createAnalyser();

        analyser.fftSize =
            256;

        analyser.smoothingTimeConstant =
            0.75;

    }

    try {

        source =
            audioContext
                .createMediaElementSource(
                    audioElement
                );

        source.connect(
            analyser
        );

        analyser.connect(
            audioContext.destination
        );

    }
    catch(error) {

        console.warn(
            "HIVAI analyser:",
            error
        );

    }

    return analyser;

}


/* =========================================================
   AUDIO ENERGY
========================================================= */

export function getVoiceEnergy() {

    if (!analyser) {
        return 0;
    }

    const data =
        new Uint8Array(
            analyser.frequencyBinCount
        );

    analyser.getByteFrequencyData(
        data
    );

    let total = 0;

    for (
        let i = 0;
        i < data.length;
        i++
    ) {

        total +=
            data[i];

    }

    return (
        total /
        data.length /
        255
    );

}
