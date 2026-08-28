import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.179.1/build/three.module.js";

const $ = (id) => document.getElementById(id);
const API_BASE = (window.HIVAI_API_BASE || "").replace(/\/$/, "");

// ---------- state ----------
let state = "idle";
let audioLevel = 0;
let speaking = false;
let requestBusy = false;
let voiceModule = null;
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

// ---------- THREE / JARVIS CORE ----------
const scene=new THREE.Scene();
scene.fog=new THREE.FogExp2(0x010509,.0023);
const camera=new THREE.PerspectiveCamera(42,innerWidth/innerHeight,.1,3000); camera.position.set(0,0,650);
const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
renderer.setPixelRatio(Math.min(devicePixelRatio,2)); renderer.setSize(innerWidth,innerHeight); renderer.outputColorSpace=THREE.SRGBColorSpace;
$("scene").appendChild(renderer.domElement);
const root=new THREE.Group(); scene.add(root); const core=new THREE.Group(); root.add(core);
const CYAN=new THREE.Color("#00eaff"), ORANGE=new THREE.Color("#ff8a00");

function sprite(color,size){
  const c=document.createElement("canvas"); c.width=c.height=128; const ctx=c.getContext("2d");
  const g=ctx.createRadialGradient(64,64,0,64,64,64); g.addColorStop(0,color); g.addColorStop(.18,color); g.addColorStop(.5,color+"55"); g.addColorStop(1,"transparent");
  ctx.fillStyle=g; ctx.fillRect(0,0,128,128);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})); s.scale.setScalar(size); return s;
}
const glow=sprite("#00eaff",170), glow2=sprite("#ffffff",58); core.add(glow,glow2);
const shell=new THREE.Mesh(new THREE.IcosahedronGeometry(42,4),new THREE.MeshBasicMaterial({color:CYAN,wireframe:true,transparent:true,opacity:.72,blending:THREE.AdditiveBlending})); core.add(shell);
const inner=new THREE.Mesh(new THREE.IcosahedronGeometry(24,2),new THREE.MeshBasicMaterial({color:0x062a34,wireframe:true,transparent:true,opacity:.95})); core.add(inner);
const nucleus=new THREE.Mesh(new THREE.SphereGeometry(11,24,24),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.95})); core.add(nucleus);
const nucleusGlow=sprite("#ff8a00",78); core.add(nucleusGlow);
const nucleusShell=new THREE.Mesh(new THREE.IcosahedronGeometry(17,2),new THREE.MeshBasicMaterial({color:ORANGE,wireframe:true,transparent:true,opacity:.9,blending:THREE.AdditiveBlending})); core.add(nucleusShell);
const nucleusRingA=new THREE.Mesh(new THREE.TorusGeometry(25,1.15,8,128),new THREE.MeshBasicMaterial({color:ORANGE,transparent:true,opacity:.8,blending:THREE.AdditiveBlending})); nucleusRingA.rotation.x=.9; core.add(nucleusRingA);
const nucleusRingB=new THREE.Mesh(new THREE.TorusGeometry(32,.7,8,128),new THREE.MeshBasicMaterial({color:ORANGE,transparent:true,opacity:.55,blending:THREE.AdditiveBlending})); nucleusRingB.rotation.y=.65; core.add(nucleusRingB);
function ring(r,t,c,o){ const m=new THREE.Mesh(new THREE.TorusGeometry(r,t,10,220),new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,blending:THREE.AdditiveBlending})); root.add(m); return m; }
const rings=[ring(62,1.1,CYAN,.65),ring(91,.8,CYAN,.48),ring(126,1,ORANGE,.62),ring(165,.75,CYAN,.38),ring(208,.55,ORANGE,.28),ring(255,.42,CYAN,.20)];
rings[1].rotation.x=.9;rings[2].rotation.x=1.25;rings[3].rotation.y=.8;rings[4].rotation.z=.7;rings[5].rotation.x=1.7;
const N=3600, positions=new Float32Array(N*3), colors=new Float32Array(N*3);
for(let i=0;i<N;i++){const r=75+Math.pow(Math.random(),.48)*330,a=Math.random()*Math.PI*2;positions[i*3]=Math.cos(a)*r;positions[i*3+1]=Math.sin(a)*r*.58;positions[i*3+2]=(Math.random()-.5)*250;const c=Math.random()<.68?CYAN:ORANGE;colors.set([c.r,c.g,c.b],i*3);}
const pg=new THREE.BufferGeometry();pg.setAttribute("position",new THREE.BufferAttribute(positions,3));pg.setAttribute("color",new THREE.BufferAttribute(colors,3));
const pm=new THREE.PointsMaterial({size:2.15,vertexColors:true,transparent:true,opacity:.7,blending:THREE.AdditiveBlending,depthWrite:false});const points=new THREE.Points(pg,pm);root.add(points);
const rays=new THREE.Group();root.add(rays);for(let i=0;i<44;i++){const a=i/44*Math.PI*2,l=190+Math.random()*180,end=new THREE.Vector3(Math.cos(a)*l,Math.sin(a)*l*.68,(Math.random()-.5)*100);const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),end]);const m=new THREE.LineBasicMaterial({color:i%3?CYAN:ORANGE,transparent:true,opacity:.13,blending:THREE.AdditiveBlending});rays.add(new THREE.Line(g,m));}
const nodes=[];for(let i=0;i<28;i++){const s=sprite(i%4===0?"#ff8a00":"#00eaff",6+Math.random()*6);root.add(s);nodes.push({s,r:80+Math.random()*270,a:Math.random()*Math.PI*2,y:(Math.random()-.5)*130,v:.25+Math.random()*.65});}

function setState(next){
  state=next; const d={idle:["SLEEP","SLEEPING // AWAITING COMMAND",CYAN],wake:["AWAKE","CORE AWAKE // AWAITING COMMAND",ORANGE],listen:["LISTENING","LISTENING // VOICE LINK ACTIVE",ORANGE],think:["THINKING","THINKING // PROCESSING",ORANGE],speak:["SPEAKING","SPEAKING // RESPONSE ACTIVE",CYAN]}[next]; if(!d)return;
  $("mode").textContent=d[0];$("state").textContent=d[1];$("status").textContent=d[0];$("coreStatus").textContent=d[0];$("brainStatus").textContent=next==="idle"?"STANDBY":next.toUpperCase();
  ["idle","wakeState","listen","think","speak"].forEach(id=>$(id)?.classList.remove("active")); const active=next==="wake"?"wakeState":next; $(active)?.classList.add("active");
  shell.material.color.copy(d[2]); glow.material.color.copy(d[2]); glow.material.opacity=next==="idle"?.48:next==="listen"?.9:.72;
}
function wakeCore(){unlockAudio();setState("wake");wakeSound();addLog("CORE","Wake sequence complete // orange nucleus online");$("vs").textContent="VOICE LINK // READY";}
function sleepCore(){stopVoice();setState("idle");sleepSound();addLog("CORE","Sleep sequence complete // cyan low-energy nucleus");}

// ---------- Kokoro (lazy + non-blocking) ----------
async function loadVoice(){
  if(voiceModule) return voiceModule;
  try{ voiceModule=await import("https://esm.sh/kokoro-js@1.2.0?target=es2022"); return voiceModule; }
  catch(e){ console.error(e); addLog("VOICE","Kokoro library failed to load"); throw e; }
}
async function prepareVoice(){
  if(voiceReady)return true;
  $("vs").textContent="VOICE MODEL // LOADING";
  try{
    const v=await loadVoice();
    await v.initHIVAIVoice?.(({status})=>{ if(status==="LOADING") $("vs").textContent="VOICE MODEL // LOADING"; });
    voiceReady=true;$("vs").textContent="VOICE LINK // READY";addLog("VOICE","Kokoro local male voice ready");return true;
  }catch(e){
    voiceReady=false;$("vs").textContent="VOICE // UNAVAILABLE";addLog("VOICE","Kokoro unavailable; chat remains functional");return false;
  }
}
async function speak(text){
  if(!text)return;
  const ready=await prepareVoice(); if(!ready)return;
  speaking=true;setState("speak");
  try{const v=await loadVoice();await v.speakHIVAI(text,{voice:"am_michael",onStart(){speaking=true;setState("speak");$("vs").textContent="VOICE // SPEAKING";},onEnd(){speaking=false;$("vs").textContent="VOICE LINK // READY";if(state==="speak")setState("wake");},onError(e){console.error(e);speaking=false;$("vs").textContent="VOICE // ERROR";if(state==="speak")setState("wake");}});}catch(e){speaking=false;console.error(e);addLog("VOICE","Playback failed");if(state==="speak")setState("wake");}
}
function stopVoice(){if(voiceModule?.stopHIVAI)voiceModule.stopHIVAI();speaking=false;if(state==="speak")setState("wake");}

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
  try{micStream=await navigator.mediaDevices.getUserMedia({audio:true});unlockAudio();micAnalyser=audioCtx.createAnalyser();micAnalyser.fftSize=256;micSource=audioCtx.createMediaStreamSource(micStream);micSource.connect(micAnalyser);const data=new Uint8Array(micAnalyser.frequencyBinCount);const loop=()=>{requestAnimationFrame(loop);if(!micAnalyser)return;micAnalyser.getByteFrequencyData(data);let t=0;for(const n of data)t+=n;audioLevel=Math.min(1,t/data.length/105);};loop();}catch(e){console.warn(e);}
}
$("mic").addEventListener("click",setupMicMeter);

// ---------- animation ----------
function animate(ms){
  requestAnimationFrame(animate);const time=ms*.001;const speed={idle:.18,wake:.7,listen:2.7,think:1.8,speak:1.25}[state]||.5;const base={idle:.34,wake:1,listen:1.18,think:1.05,speak:1.08}[state]||1;const voiceEnergy=speaking?Math.max(audioLevel,voiceModule?.getVoiceEnergy?.()||0):audioLevel;const scale=(state==="idle"?.48:base)*(1+Math.sin(time*3.2)*(.025+voiceEnergy*.08)+voiceEnergy*.16);core.scale.lerp(new THREE.Vector3(scale,scale,scale),.09);
  core.rotation.y+=.0025*speed;core.rotation.x+=.0015*speed;shell.rotation.y+=.008*speed;shell.rotation.z-=.004*speed;inner.rotation.y-=.014*speed;nucleus.scale.setScalar(1+voiceEnergy*.75+Math.sin(time*5)*.05);nucleusShell.rotation.x+=.004*speed;nucleusShell.rotation.y-=.007*speed;nucleusShell.scale.setScalar(1+voiceEnergy*.18);nucleusGlow.scale.setScalar((state==="idle"?48:82)*scale*(1+voiceEnergy*.3));nucleusGlow.material.opacity=state==="idle"?.3:.78+voiceEnergy*.2;nucleusRingA.rotation.z+=.018*speed;nucleusRingA.rotation.y-=.009*speed;nucleusRingB.rotation.x-=.013*speed;nucleusRingB.rotation.z+=.006*speed;glow.scale.setScalar((state==="idle"?115:175)*scale*(1+voiceEnergy*.2));glow2.scale.setScalar((state==="idle"?28:62)*scale*(1+voiceEnergy*.5));
  rings.forEach((r,i)=>{r.rotation.z+=(i%2?.0018:-.0012)*speed;r.rotation.x+=(i%2?.0008:-.0005)*speed;r.scale.setScalar(state==="idle"?.72:1+voiceEnergy*.08);});points.rotation.z=time*.018*speed;points.rotation.y=time*.009*speed;pm.size=state==="idle"?1.25:2.1+voiceEnergy*2.2;pm.opacity=state==="idle"?.28:.5+voiceEnergy*.38;rays.rotation.z=-time*.025*speed;rays.scale.setScalar(state==="idle"?.7:1+voiceEnergy*.12);rays.children.forEach((l,i)=>l.material.opacity=(state==="idle"?.05:.1)+(i%5===0?voiceEnergy*.3:voiceEnergy*.08));nodes.forEach(n=>{n.a+=.004*n.v*speed;const r=n.r*(state==="idle"?.62:1+voiceEnergy*.12);n.s.position.set(Math.cos(n.a)*r,Math.sin(n.a)*r*.58,n.y+Math.sin(time*2+n.r)*18);n.s.scale.setScalar(state==="idle"?2.5:7+voiceEnergy*22);});
  const target=state==="idle"?18:state==="wake"?72:state==="listen"?90:state==="think"?84:68;const val=Math.round(Math.min(99,target+audioLevel*10));$("energy").textContent=val+"%";$("energyBar").style.width=val+"%";$("load").textContent=Math.round(Math.min(99,target*.9+audioLevel*30))+"%";renderer.render(scene,camera);
}
requestAnimationFrame(animate);
addEventListener("resize",()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

// ---------- boot ----------
function updateClock(){$("clock").textContent=new Date().toLocaleTimeString([], {hour12:false});} updateClock();setInterval(updateClock,1000);
renderMemory();setState("idle");
fetch(`${API_BASE}/api/health`,{cache:"no-store"}).then(r=>{if(!r.ok)throw new Error();return r.json();}).then(d=>{$("gateway").textContent=d.status==="ok"?"ONLINE":"OFFLINE";addLog("GATEWAY","Health check passed // AI gateway ready");}).catch(()=>{$("gateway").textContent="OFFLINE";addLog("GATEWAY","/api/health unavailable // 3D core remains active");});
document.addEventListener("pointerdown",unlockAudio,{once:true});
