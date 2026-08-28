/* HIVAI // Kokoro local male voice. Loaded lazily by main.js. */
let tts=null, loading=null, currentAudio=null, audioContext=null, analyser=null, source=null;
const MODEL="onnx-community/Kokoro-82M-v1.0-ONNX";
export async function initHIVAIVoice(onProgress=()=>{}){
  if(tts)return tts; if(loading)return loading;
  loading=(async()=>{
    const {KokoroTTS}=await import("https://esm.sh/kokoro-js@1.2.0?target=es2022");
    onProgress({status:"LOADING",progress:0});
    if(navigator.gpu){
      try{tts=await KokoroTTS.from_pretrained(MODEL,{dtype:"q8",device:"webgpu"});return tts;}catch(e){console.warn("Kokoro WebGPU failed; using WASM",e);}
    }
    tts=await KokoroTTS.from_pretrained(MODEL,{dtype:"q8",device:"wasm"});return tts;
  })();
  try{return await loading;}finally{loading=null;}
}
export async function speakHIVAI(text,{voice="am_michael",onStart=()=>{},onEnd=()=>{},onError=()=>{}}={}){
  if(!text?.trim())return;
  try{
    await initHIVAIVoice(); stopHIVAI(); const result=await tts.generate(text,{voice}); const wav=result.toWav(); const url=URL.createObjectURL(new Blob([wav],{type:"audio/wav"}));
    currentAudio=new Audio(url);currentAudio.preload="auto";currentAudio.volume=1;
    currentAudio.onplay=()=>{setupAnalyser(currentAudio);onStart();};
    currentAudio.onended=()=>{URL.revokeObjectURL(url);currentAudio=null;onEnd();};
    currentAudio.onerror=e=>{URL.revokeObjectURL(url);currentAudio=null;onError(e);};
    await currentAudio.play(); return currentAudio;
  }catch(e){onError(e);throw e;}
}
function setupAnalyser(audio){try{audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();if(audioContext.state==="suspended")audioContext.resume();analyser=analyser||audioContext.createAnalyser();analyser.fftSize=256;if(source)try{source.disconnect();}catch{}source=audioContext.createMediaElementSource(audio);source.connect(analyser);analyser.connect(audioContext.destination);}catch(e){console.warn("Voice analyser unavailable",e);}}
export function getVoiceEnergy(){if(!analyser)return 0;const data=new Uint8Array(analyser.frequencyBinCount);analyser.getByteFrequencyData(data);let t=0;for(const n of data)t+=n;return Math.min(1,t/data.length/255);}
export function stopHIVAI(){if(currentAudio){try{currentAudio.pause();currentAudio.currentTime=0;}catch{}currentAudio=null;}}
