/* HIVAI // Kokoro browser TTS adapter */
let tts=null, loading=null, currentAudio=null, audioContext=null, analyser=null, source=null;

const MODEL="onnx-community/Kokoro-82M-v1.0-ONNX";

export async function initHIVAIVoice(onProgress=()=>{}){
  if(tts) return tts;
  if(loading) return loading;

  loading=(async()=>{
    const mod=await import("https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/dist/kokoro.web.js");
    const KokoroTTS=mod.KokoroTTS;
    if(!KokoroTTS) throw new Error("KokoroTTS export not found");

    onProgress({status:"LOADING",progress:0});

    // WebGPU first. Kokoro's docs recommend fp32 for WebGPU; q8 is the
    // practical fallback for WASM.
    if(navigator.gpu){
      try{
        tts=await KokoroTTS.from_pretrained(MODEL,{
          dtype:"fp32",
          device:"webgpu"
        });
        onProgress({status:"READY",progress:100});
        return tts;
      }catch(e){
        console.warn("Kokoro WebGPU failed; falling back to WASM",e);
      }
    }

    tts=await KokoroTTS.from_pretrained(MODEL,{
      dtype:"q8",
      device:"wasm"
    });
    onProgress({status:"READY",progress:100});
    return tts;
  })();

  try{return await loading;}
  finally{loading=null;}
}

export async function speakHIVAI(
  text,
  {voice="am_michael",onStart=()=>{},onEnd=()=>{},onError=()=>{}}={}
){
  if(!text?.trim()) return;

  try{
    await initHIVAIVoice();
    stopHIVAI();

    const result=await tts.generate(text,{voice});
    const wav=result.toWav();
    const blob=new Blob([wav],{type:"audio/wav"});
    const url=URL.createObjectURL(blob);

    currentAudio=new Audio(url);
    currentAudio.preload="auto";
    currentAudio.volume=1;

    currentAudio.onplay=()=>{
      setupAnalyser(currentAudio);
      onStart();
    };

    currentAudio.onended=()=>{
      URL.revokeObjectURL(url);
      currentAudio=null;
      onEnd();
    };

    currentAudio.onerror=(e)=>{
      URL.revokeObjectURL(url);
      currentAudio=null;
      onError(e);
    };

    await currentAudio.play();
    return currentAudio;
  }catch(e){
    onError(e);
    throw e;
  }
}

function setupAnalyser(audio){
  try{
    audioContext=audioContext||new(window.AudioContext||window.webkitAudioContext)();
    if(audioContext.state==="suspended") audioContext.resume();

    // A MediaElementSource can only be created once for a given element.
    analyser=audioContext.createAnalyser();
    analyser.fftSize=256;
    source=audioContext.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(audioContext.destination);
  }catch(e){
    console.warn("Voice analyser unavailable",e);
  }
}

export function getVoiceEnergy(){
  if(!analyser) return 0;
  const data=new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(data);
  let total=0;
  for(const n of data) total+=n;
  return Math.min(1,total/data.length/255);
}

export function stopHIVAI(){
  if(currentAudio){
    try{currentAudio.pause();currentAudio.currentTime=0;}catch{}
    try{currentAudio.src="";}catch{}
    currentAudio=null;
  }
}
