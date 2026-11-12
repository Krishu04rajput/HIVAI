import { createHIVAICore } from "./js/neural-core.js";

const $ = (id) => document.getElementById(id);
const API_BASE = (window.HIVAI_API_BASE || "").replace(/\/$/, "");

// ---------- state ----------
let state = "idle";
let audioLevel = 0;
let speaking = false;
let requestBusy = false;
let voiceModule = null;
let voiceReady = false;
let ambientOn = false;
let ambientNodes = null;
let recognition = null;
let micAnalyser = null;
let micSource = null;
let micStream = null;
let audioCtx = null;

const MEMORY_KEY = "hivai_conversation_v3";
const SESSION_KEY = "hivai_session_v3";
let chatHistory = [];
try { chatHistory = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]"); } catch { chatHistory = []; }
if (!Array.isArray(chatHistory)) chatHistory = [];
const sessionId = localStorage.getItem(SESSION_KEY) || (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
localStorage.setItem(SESSION_KEY, sessionId);

function persistMemory(){
  chatHistory = chatHistory.slice(-24);
  try { localStorage.setItem(MEMORY_KEY, JSON.stringify(chatHistory)); } catch {}
}
function safe(v){ return String(v).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
function addLog(type, msg){
  const e=document.createElement("div");
  e.innerHTML=`[${new Date().toLocaleTimeString([], {hour12:false})}] <b>${safe(type)}</b> ${safe(msg)}`;
  $("log").prepend(e);
  while($("log").children.length>18) $("log").lastChild.remove();
}
function addMessage(who,text,save=true){
  const e=document.createElement("div");
  e.innerHTML=`<b>${safe(who)}:</b> ${safe(text)}`;
  $("messages").appendChild(e);
  $("messages").scrollTop=$("messages").scrollHeight;
  if(save){ chatHistory.push({role:who==="YOU"?"user":"assistant",content:String(text)}); persistMemory(); }
}
function renderMemory(){
  $("messages").innerHTML="";
  if(!chatHistory.length){ addMessage("HIVAI","Core is sleeping. Press WAKE CORE or speak to activate me.",false); return; }
  for(const m of chatHistory) addMessage(m.role==="user"?"YOU":"HIVAI",m.content,false);
}

// ---------- audio unlock ----------
function unlockAudio(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if(audioCtx.state === "suspended") audioCtx.resume();
  }catch{}
}
function startAmbient(){
  unlockAudio();
  if(ambientOn || !audioCtx) return;
  try{
    const master=audioCtx.createGain(); master.gain.value=0.0001; master.connect(audioCtx.destination);
    const osc1=audioCtx.createOscillator(); const osc2=audioCtx.createOscillator();
    const lfo=audioCtx.createOscillator(); const lfoGain=audioCtx.createGain();
    osc1.type="sine"; osc1.frequency.value=48;
    osc2.type="triangle"; osc2.frequency.value=96;
    lfo.frequency.value=.09; lfoGain.gain.value=.012;
    lfo.connect(lfoGain); lfoGain.connect(master.gain);
    osc1.connect(master); osc2.connect(master); osc1.start(); osc2.start(); lfo.start();
    master.gain.exponentialRampToValueAtTime(0.018,audioCtx.currentTime+1.2);
    ambientNodes={master,osc1,osc2,lfo,lfoGain}; ambientOn=true;
    $("ambientBtn")?.classList.add("active"); $("ambientBtn")?.setAttribute("aria-pressed","true");
    $("ambientStatus") && ($("ambientStatus").textContent="AMBIENT // ON");
    addLog("AUDIO","Reactor ambience enabled");
  }catch(e){ console.warn(e); }
}
function stopAmbient(){
  if(!ambientNodes) return;
  try{
    const n=ambientNodes; n.master.gain.exponentialRampToValueAtTime(.0001,audioCtx.currentTime+.5);
    setTimeout(()=>{ try{n.osc1.stop();n.osc2.stop();n.lfo.stop();n.master.disconnect();}catch{} },600);
  }catch{}
  ambientNodes=null; ambientOn=false;
  $("ambientBtn")?.classList.remove("active"); $("ambientBtn")?.setAttribute("aria-pressed","false");
  $("ambientStatus") && ($("ambientStatus").textContent="AMBIENT // OFF");
}
function toggleAmbient(){ if(ambientOn) stopAmbient(); else startAmbient(); }
function tone(freq,duration,type="sine",gain=.025){
  try{
    unlockAudio(); const o=audioCtx.createOscillator(), g=audioCtx.createGain();
    o.type=type; o.frequency.value=freq; g.gain.value=gain; o.connect(g); g.connect(audioCtx.destination);
    const now=audioCtx.currentTime; g.gain.setValueAtTime(0,now); g.gain.linearRampToValueAtTime(gain,now+.01); g.gain.exponentialRampToValueAtTime(.0001,now+duration);
    o.start(now); o.stop(now+duration+.02);
  }catch{}
}
const wakeSound=()=>{tone(260,.12,"sine",.035);setTimeout(()=>tone(520,.18,"sine",.03),100);};
const sleepSound=()=>tone(180,.2,"sine",.025);
const thinkSound=()=>tone(90,.08,"triangle",.012);
const listenSound=()=>tone(420,.08,"sine",.018);

// ---------- THREE / NEURAL GALAXY CORE ----------
const coreEngine = createHIVAICore($("scene"), ({ energy, load }) => {
  $("energy").textContent = energy + "%";
  $("energyBar").style.width = energy + "%";
  $("load").textContent = load + "%";
});

function setState(next){
  state=next; coreEngine.setState(next); const d={idle:["SLEEP","SLEEPING // AWAITING COMMAND"],wake:["AWAKE","CORE AWAKE // AWAITING COMMAND"],listen:["LISTENING","LISTENING // VOICE LINK ACTIVE"],think:["THINKING","THINKING // PROCESSING"],speak:["SPEAKING","SPEAKING // RESPONSE ACTIVE"]}[next]; if(!d)return;
  $("mode").textContent=d[0];$("state").textContent=d[1];$("status").textContent=d[0];$("coreStatus").textContent=d[0];$("brainStatus").textContent=next==="idle"?"STANDBY":next.toUpperCase();
  ["idle","wakeState","listen","think","speak"].forEach(id=>$(id)?.classList.remove("active")); const active=next==="wake"?"wakeState":next; $(active)?.classList.add("active");
}
function wakeCore(){unlockAudio();setState("wake");wakeSound();startAmbient();addLog("CORE","Wake sequence complete // orange nucleus online");$("vs").textContent=voiceReady?"VOICE LINK // READY":"VOICE LINK // TAP SPEAK TO LOAD";}
function sleepCore(){stopVoice();setState("idle");sleepSound();stopAmbient();addLog("CORE","Sleep sequence complete // cyan low-energy nucleus");}

// ---------- Kokoro (lazy + non-blocking) ----------
async function loadVoice(){
  if(voiceModule) return voiceModule;
  try{
    voiceModule=await import("./js/hivai-voice.js");
    return voiceModule;
  }catch(e){
    console.error("Kokoro wrapper load failed",e);
    addLog("VOICE","Kokoro module failed to load");
    throw e;
  }
}
async function prepareVoice(){
  if(voiceReady) return true;
  $("vs").textContent="VOICE MODEL // LOADING";
  try{
    const v=await loadVoice();
    await v.initHIVAIVoice?.(({status})=>{ if(status==="LOADING") $("vs").textContent="VOICE MODEL // LOADING"; });
    voiceReady=true; $("vs").textContent="VOICE LINK // READY";
    addLog("VOICE","Kokoro local male voice ready // am_michael");
    return true;
  }catch(e){
    voiceReady=false; $("vs").textContent="VOICE // UNAVAILABLE";
    addLog("VOICE",`Kokoro failed: ${e?.message||e}`);
    return false;
  }
}
async function speak(text){
  if(!text)return;
  const ready=await prepareVoice(); if(!ready)return;
  speaking=true;setState("speak");
  try{const v=await loadVoice();await v.speakHIVAI(text,{voice:"am_michael",onStart(){speaking=true;coreEngine.setAudioLevel(0.32);setState("speak");$("vs").textContent="VOICE // SPEAKING";},onEnd(){speaking=false;coreEngine.setAudioLevel(0);$("vs").textContent="VOICE LINK // READY";if(state==="speak")setState("wake");},onError(e){console.error(e);speaking=false;coreEngine.setAudioLevel(0);$("vs").textContent="VOICE // ERROR";if(state==="speak")setState("wake");}});}catch(e){speaking=false;console.error(e);addLog("VOICE","Playback failed");if(state==="speak")setState("wake");}
}
function stopVoice(){if(voiceModule?.stopHIVAI)voiceModule.stopHIVAI();speaking=false;coreEngine.setAudioLevel(0);if(state==="speak")setState("wake");}

// ---------- commands/chat ----------
function command(text){
  const v=text.toLowerCase().trim();
  if(/^(wake|wake up|activate|activate core|hivai wake)(\s+hivai)?$/.test(v)){wakeCore();const r="Core awake, Sir. All primary systems are online.";addMessage("HIVAI",r);speak(r);return true;}
  if(/^(sleep|sleep mode|go to sleep|standby|sleep core)$/.test(v)){sleepCore();addMessage("HIVAI","Entering sleep mode, Sir.");return true;}
  if(v==="system status"){wakeCore();const r=`Core is online. Gateway is ${$("gateway").textContent}. Voice is local Kokoro. Memory is stored in this browser.`;addMessage("HIVAI",r);speak(r);return true;}
  if(v==="run a core diagnostic"){wakeCore();const r="Diagnostic complete. 3D nucleus, local memory, microphone channel and chat gateway are operational.";addMessage("HIVAI",r);speak(r);return true;}
  return false;
}
async function ask(text){
  if(!text?.trim()||requestBusy)return;
  unlockAudio(); const clean=text.trim(); addMessage("YOU",clean); if(command(clean))return;
  if(state==="idle")wakeCore();setState("think");thinkSound();$("gateway").textContent="PROCESSING";$("brainStatus").textContent="THINKING";addLog("BRAIN","Secure request transmitted");requestBusy=true;const started=performance.now();
  try{
    const r=await fetch(`${API_BASE}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message:clean,messages:chatHistory.slice(-24),session_id:sessionId})});
    const data=await r.json().catch(()=>({})); if(!r.ok||data.ok!==true)throw new Error(data.error||`Gateway HTTP ${r.status}`);
    $("gateway").textContent="ONLINE";$("latency").textContent=`${Math.round(performance.now()-started)} MS`;const reply=String(data.reply||"").trim()||"I received the request but the AI returned no text.";addMessage("HIVAI",reply);addLog("CORE","Response received // context retained");await speak(reply);
    if(state==="speak")setState("wake");
  }catch(e){console.error(e);$("gateway").textContent="ERROR";$("brainStatus").textContent="ERROR";addLog("ERROR",e.message||"Chat request failed");const msg=e.message?.includes("OPENAI_API_KEY")?"My AI brain is not configured on the server yet. Add OPENAI_API_KEY in Vercel, then redeploy.":"I couldn't reach the AI brain. The 3D core is still online; check the /api/chat deployment.";addMessage("HIVAI",msg);setState("wake");}
  finally{requestBusy=false;}
}

// ---------- controls ----------
$("wakeBtn").onclick=()=>{wakeCore();prepareVoice();};
$("ambientBtn")?.addEventListener("click",toggleAmbient);
$("send").onclick=()=>{const t=$("input").value.trim();if(!t)return;$("input").value="";ask(t);};
$("input").addEventListener("keydown",e=>{if(e.key==="Enter")$("send").click();});
document.querySelectorAll(".quick button").forEach(b=>b.onclick=()=>ask(b.dataset.cmd));

// ---------- speech recognition ----------
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){
  recognition=new Recognition();recognition.lang="en-IN";recognition.interimResults=true;recognition.continuous=false;
  recognition.onstart=()=>{unlockAudio();if(state==="idle")wakeCore();stopVoice();setState("listen");listenSound();$("mic").classList.add("active");$("vs").textContent="LISTENING // SPEAK NOW";addLog("VOICE","Microphone channel active");};
  recognition.onresult=e=>{let t="";for(const x of e.results)t+=x[0].transcript;if(e.results[e.results.length-1].isFinal){$("vs").textContent="INPUT CAPTURED";ask(t.trim());}};
  recognition.onerror=e=>{console.warn(e);$("vs").textContent="VOICE INPUT // ERROR";$("mic").classList.remove("active");if(state==="listen")setState("wake");};
  recognition.onend=()=>{$("mic").classList.remove("active");if(state==="listen")setState("wake");if(!speaking)$("vs").textContent="VOICE LINK // READY";audioLevel=0;};
  $("mic").onclick=()=>{unlockAudio();prepareVoice();try{recognition.start();}catch{try{recognition.stop();}catch{}}};
}else{$("vs").textContent="VOICE INPUT // BROWSER UNSUPPORTED";$("mic").disabled=true;}

// ---------- mic visualizer ----------
async function setupMicMeter(){
  if(micAnalyser||!navigator.mediaDevices?.getUserMedia)return;
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});unlockAudio();micAnalyser=audioCtx.createAnalyser();micAnalyser.fftSize=256;micSource=audioCtx.createMediaStreamSource(micStream);micSource.connect(micAnalyser);const data=new Uint8Array(micAnalyser.frequencyBinCount);const loop=()=>{requestAnimationFrame(loop);if(!micAnalyser)return;micAnalyser.getByteFrequencyData(data);let t=0;for(const n of data)t+=n;audioLevel=Math.min(1,t/data.length/105);coreEngine.setAudioLevel(audioLevel);};loop();}catch(e){console.warn(e);}
}
$("mic").addEventListener("click",setupMicMeter);

// ---------- boot ----------
function updateClock(){$("clock").textContent=new Date().toLocaleTimeString([], {hour12:false});} updateClock();setInterval(updateClock,1000);
renderMemory();setState("idle");
fetch(`${API_BASE}/api/health`,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{$("gateway").textContent=d.status==="ok"?"ONLINE":"OFFLINE";addLog("GATEWAY","Health check passed // AI gateway ready");}).catch(()=>{$("gateway").textContent="OFFLINE";addLog("GATEWAY","/api/health unavailable // 3D core remains active");});
document.addEventListener("pointerdown",unlockAudio,{once:true});
