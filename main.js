

import * as THREE from "three";
let voiceModule = null;

async function loadVoiceModule(){
    if(voiceModule) return voiceModule;
    voiceModule = await import("./js/hivai-voice.js");
    return voiceModule;
}


const $ =
id => document.getElementById(id);


const API_BASE =
(window.HIVAI_API_BASE || "")
.replace(/\/$/,"");


/* =========================================================
   THREE.JS
========================================================= */

const scene =
new THREE.Scene();

scene.fog =
new THREE.FogExp2(
0x010509,
.0023
);


const camera =
new THREE.PerspectiveCamera(
42,
1,
.1,
3000
);

camera.position.set(
0,
0,
650
);


const renderer =
new THREE.WebGLRenderer({

antialias:true,

alpha:true,

powerPreference:
"high-performance"

});


renderer.setPixelRatio(
Math.min(devicePixelRatio,2)
);

renderer.setSize(
innerWidth,
innerHeight
);

renderer.outputColorSpace =
THREE.SRGBColorSpace;


$("scene")
.appendChild(
renderer.domElement
);


const root =
new THREE.Group();

scene.add(root);


const core =
new THREE.Group();

root.add(core);


const CYAN =
new THREE.Color("#00eaff");

const ORANGE =
new THREE.Color("#ff8a00");


/* =========================================================
   GLOW SPRITES
========================================================= */

function sprite(color,size){

const canvas =
document.createElement("canvas");

canvas.width =
canvas.height =
128;

const ctx =
canvas.getContext("2d");

const gradient =
ctx.createRadialGradient(
64,
64,
0,
64,
64,
64
);

gradient.addColorStop(
0,
color
);

gradient.addColorStop(
.18,
color
);

gradient.addColorStop(
.5,
color+"55"
);

gradient.addColorStop(
1,
"transparent"
);

ctx.fillStyle =
gradient;

ctx.fillRect(
0,
0,
128,
128
);

const texture =
new THREE.CanvasTexture(
canvas
);

const material =
new THREE.SpriteMaterial({

map:texture,

transparent:true,

depthWrite:false,

blending:
THREE.AdditiveBlending

});

const sprite =
new THREE.Sprite(material);

sprite.scale.setScalar(
size
);

return sprite;

}


/* =========================================================
   CORE OBJECTS
========================================================= */

const glow =
sprite(
"#00eaff",
170
);

const glow2 =
sprite(
"#ffffff",
58
);

core.add(
glow,
glow2
);


const shell =
new THREE.Mesh(

new THREE.IcosahedronGeometry(
42,
4
),

new THREE.MeshBasicMaterial({

color:CYAN,

wireframe:true,

transparent:true,

opacity:.72,

blending:
THREE.AdditiveBlending

})

);

core.add(shell);


const inner =
new THREE.Mesh(

new THREE.IcosahedronGeometry(
24,
2
),

new THREE.MeshBasicMaterial({

color:0x062a34,

wireframe:true,

transparent:true,

opacity:.95

})

);

core.add(inner);


const nucleus =
new THREE.Mesh(

new THREE.SphereGeometry(
11,
24,
24
),

new THREE.MeshBasicMaterial({

color:0xffffff,

transparent:true,

opacity:.95

})

);

core.add(nucleus);

/* =========================================================
   JARVIS-STYLE ORANGE NUCLEUS
========================================================= */
const nucleusGlow = sprite("#ff8a00", 78);
nucleusGlow.material.opacity = .88;
core.add(nucleusGlow);

const nucleusShell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(17, 2),
    new THREE.MeshBasicMaterial({
        color: ORANGE,
        wireframe: true,
        transparent: true,
        opacity: .9,
        blending: THREE.AdditiveBlending
    })
);
core.add(nucleusShell);

const nucleusRingA = new THREE.Mesh(
    new THREE.TorusGeometry(25, 1.15, 8, 128),
    new THREE.MeshBasicMaterial({
        color: ORANGE,
        transparent: true,
        opacity: .8,
        blending: THREE.AdditiveBlending
    })
);
nucleusRingA.rotation.x = .9;
core.add(nucleusRingA);

const nucleusRingB = new THREE.Mesh(
    new THREE.TorusGeometry(32, .7, 8, 128),
    new THREE.MeshBasicMaterial({
        color: ORANGE,
        transparent: true,
        opacity: .55,
        blending: THREE.AdditiveBlending
    })
);
nucleusRingB.rotation.y = .65;
core.add(nucleusRingB);


/* =========================================================
   ORBITAL RINGS
========================================================= */

function ring(
radius,
thickness,
color,
opacity
){

const mesh =
new THREE.Mesh(

new THREE.TorusGeometry(
radius,
thickness,
10,
220
),

new THREE.MeshBasicMaterial({

color,

transparent:true,

opacity,

blending:
THREE.AdditiveBlending

})

);

root.add(mesh);

return mesh;

}


const rings = [

ring(62,1.1,CYAN,.65),

ring(91,.8,CYAN,.48),

ring(126,1,ORANGE,.62),

ring(165,.75,CYAN,.38),

ring(208,.55,ORANGE,.28),

ring(255,.42,CYAN,.20)

];


rings[1].rotation.x=.9;
rings[2].rotation.x=1.25;
rings[3].rotation.y=.8;
rings[4].rotation.z=.7;
rings[5].rotation.x=1.7;


/* =========================================================
   PARTICLES
========================================================= */

const particlesN =
5000;

const positions =
new Float32Array(
particlesN*3
);

const colors =
new Float32Array(
particlesN*3
);


for(
let i=0;
i<particlesN;
i++
){

const radius =
75 +
Math.pow(
Math.random(),
.48
)*330;

const angle =
Math.random()*Math.PI*2;

const z =
(Math.random()-.5)*250;

positions[i*3] =
Math.cos(angle)*radius;

positions[i*3+1] =
Math.sin(angle)*radius*.58;

positions[i*3+2] =
z;


const color =
Math.random()<.68
?
CYAN
:
ORANGE;

colors.set(
[
color.r,
color.g,
color.b
],
i*3
);

}


const particleGeometry =
new THREE.BufferGeometry();

particleGeometry.setAttribute(
"position",
new THREE.BufferAttribute(
positions,
3
)
);

particleGeometry.setAttribute(
"color",
new THREE.BufferAttribute(
colors,
3
)
);


const particleMaterial =
new THREE.PointsMaterial({

size:2.15,

vertexColors:true,

transparent:true,

opacity:.7,

blending:
THREE.AdditiveBlending,

depthWrite:false

});


const points =
new THREE.Points(
particleGeometry,
particleMaterial
);

root.add(points);


/* =========================================================
   ENERGY RAYS
========================================================= */

const rays =
new THREE.Group();

root.add(rays);


for(
let i=0;
i<44;
i++
){

const angle =
i/44*Math.PI*2;

const length =
190 +
Math.random()*180;

const end =
new THREE.Vector3(

Math.cos(angle)*length,

Math.sin(angle)*length*.68,

(Math.random()-.5)*100

);


const geometry =
new THREE.BufferGeometry()
.setFromPoints([

new THREE.Vector3(),

end

]);


const material =
new THREE.LineBasicMaterial({

color:
i%3
?
CYAN
:
ORANGE,

transparent:true,

opacity:.13,

blending:
THREE.AdditiveBlending

});


rays.add(
new THREE.Line(
geometry,
material
)
);

}


/* =========================================================
   ENERGY NODES
========================================================= */

const nodes=[];


for(
let i=0;
i<28;
i++
){

const s =
sprite(

i%4===0
?
"#ff8a00"
:
"#00eaff",

6 +
Math.random()*6

);

root.add(s);


nodes.push({

s,

r:
80+
Math.random()*270,

a:
Math.random()*Math.PI*2,

y:
(Math.random()-.5)*130,

v:
.25+
Math.random()*.65

});

}


/* =========================================================
   STATE + HIVAI MEMORY
========================================================= */

let state = "idle";
let audioLevel = 0;
let awake = false;
let voiceReady = false;
let speaking = false;

const MEMORY_KEY = "hivai_conversation_v2";
const SESSION_KEY = "hivai_session_v2";

let chatHistory = [];

try {
    chatHistory = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
    if (!Array.isArray(chatHistory)) chatHistory = [];
} catch {
    chatHistory = [];
}

const sessionId = localStorage.getItem(SESSION_KEY) ||
    (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()));
localStorage.setItem(SESSION_KEY, sessionId);

function persistMemory(){
    chatHistory = chatHistory.slice(-24);
    localStorage.setItem(MEMORY_KEY, JSON.stringify(chatHistory));
}

function setState(next){
    state = next;
    awake = next !== "idle";

    const data = {
        idle:["SLEEP","SLEEPING // AWAITING COMMAND",CYAN],
        wake:["AWAKE","CORE AWAKE // AWAITING COMMAND",ORANGE],
        listen:["LISTENING","LISTENING // VOICE LINK ACTIVE",ORANGE],
        think:["THINKING","THINKING // PROCESSING",ORANGE],
        speak:["SPEAKING","SPEAKING // RESPONSE ACTIVE",CYAN]
    }[next];

    if(!data) return;

    $("mode").textContent = data[0];
    $("state").textContent = data[1];
    $("status").textContent = data[0];
    $("coreStatus").textContent = data[0];
    $("brainStatus").textContent = next === "idle" ? "STANDBY" : next.toUpperCase();

    ["idle","wakeState","listen","think","speak"].forEach(id => $(id).classList.remove("active"));
    $(next === "wake" ? "wakeState" : next).classList.add("active");

    shell.material.color.copy(data[2]);
    glow.material.opacity = next === "idle" ? .48 : next === "listen" ? .9 : .72;
    glow.material.color.set(data[2]);
}

function safe(value){
    return String(value).replace(/[&<>]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;"}[c]));
}

function addLog(type,message){
    const element = document.createElement("div");
    element.innerHTML = "[" + new Date().toLocaleTimeString([], {hour12:false}) + "] <b>" + safe(type) + "</b> " + safe(message);
    $("log").prepend(element);
    while($("log").children.length > 18) $("log").lastChild.remove();
}

function addMessage(who,text,save=true){
    const element = document.createElement("div");
    element.innerHTML = "<b>" + safe(who) + ":</b> " + safe(text);
    $("messages").appendChild(element);
    $("messages").scrollTop = $("messages").scrollHeight;

    if(save){
        chatHistory.push({
            role: who === "YOU" ? "user" : "assistant",
            content: String(text)
        });
        persistMemory();
    }
}

function renderMemory(){
    $("messages").innerHTML = "";
    if(!chatHistory.length){
        addMessage("HIVAI","Core is sleeping. Press WAKE CORE or speak to activate me.",false);
        return;
    }
    chatHistory.forEach(item => addMessage(item.role === "user" ? "YOU" : "HIVAI", item.content, false));
}

renderMemory();

/* =========================================================
   LOCAL KOKORO VOICE
========================================================= */

async function prepareVoice(){
    if(voiceReady) return true;
    try{
        $("vs").textContent = "VOICE MODEL // LOADING";
        addLog("VOICE","Loading local Kokoro neural voice");
        const voice = await loadVoiceModule();
        await voice.initHIVAIVoice(progress => {
            if(progress.status === "READY") $("vs").textContent = "VOICE LINK // READY";
        });
        voiceReady = true;
        $("vs").textContent = "VOICE LINK // READY";
        addLog("VOICE","Kokoro local voice online");
        return true;
    }catch(error){
        console.error(error);
        $("vs").textContent = "VOICE // MODEL ERROR";
        addLog("VOICE","Kokoro could not initialize; text chat remains available");
        return false;
    }
}

async function speak(text){
    if(!text) return;

    const ready = await prepareVoice();
    if(!ready) return;

    speaking = true;
    setState("speak");
    $("vs").textContent = "VOICE // SPEAKING";

    try{
        const voice = await loadVoiceModule();
        await voice.speakHIVAI(text, {
            voice: "am_michael",
            onStart(){
                speaking = true;
                setState("speak");
                $("vs").textContent = "VOICE // SPEAKING";
            },
            onEnd(){
                speaking = false;
                $("vs").textContent = "VOICE LINK // READY";
                if(state === "speak") setState("wake");
            },
            onError(error){
                console.error(error);
                speaking = false;
                $("vs").textContent = "VOICE // PLAYBACK ERROR";
                if(state === "speak") setState("wake");
            }
        });
    }catch(error){
        speaking = false;
        console.error(error);
        $("vs").textContent = "VOICE // UNAVAILABLE";
        if(state === "speak") setState("wake");
    }
}

function stopVoice(){
    if(voiceModule?.stopHIVAI) voiceModule.stopHIVAI();
    speaking = false;
    if(state === "speak") setState("wake");
}

/* =========================================================
   CORE COMMANDS
========================================================= */

function wakeCore(){
    unlockAudio();
    setState("wake");
    wakeSound();
    addLog("CORE","Wake sequence complete // nucleus expanded");
    $("vs").textContent = "VOICE LINK // READY";
}

function sleepCore(){
    stopVoice();
    setState("idle");
    sleepSound();
    addLog("CORE","Sleep sequence complete // cyan low-energy nucleus");
}

function command(text){
    const value = text.toLowerCase().trim();

    if(/^(wake|wake up|activate|activate core|hivai wake)(\s+hivai)?$/.test(value)){
        wakeCore();
        const reply = "Core awake, Sir. All primary systems are online.";
        addMessage("HIVAI",reply);
        speak(reply);
        return true;
    }

    if(/^(sleep|sleep mode|go to sleep|standby|sleep core)$/.test(value)){
        sleepCore();
        addMessage("HIVAI","Entering sleep mode, Sir.");
        return true;
    }

    if(value === "system status"){
        wakeCore();
        const reply = "Core is online. Neural gateway is " + $("gateway").textContent + ". Voice is local Kokoro. Memory is stored locally in this browser.";
        addMessage("HIVAI",reply);
        speak(reply);
        return true;
    }

    if(value === "run a core diagnostic"){
        wakeCore();
        const reply = "Diagnostic complete. Three dimensional core, local memory, microphone channel and chat gateway are operational.";
        addMessage("HIVAI",reply);
        speak(reply);
        return true;
    }

    return false;
}

/* =========================================================
   REAL AI CHAT
========================================================= */

let requestBusy = false;

async function ask(text){
    if(!text || requestBusy) return;

    unlockAudio();
    addMessage("YOU",text);

    if(command(text)) return;

    if(state === "idle") wakeCore();
    setState("think");
    thinkSound();
    $("gateway").textContent = "PROCESSING";
    $("brainStatus").textContent = "THINKING";
    addLog("BRAIN","Secure request transmitted");

    requestBusy = true;
    const started = performance.now();

    try{
        const response = await fetch(API_BASE + "/api/chat", {
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
                message:text,
                messages:chatHistory.slice(-24),
                session_id:sessionId
            })
        });

        const data = await response.json().catch(() => ({}));

        if(!response.ok || data.ok === false){
            throw new Error(data.error || "HIVAI gateway request failed");
        }

        $("gateway").textContent = "ONLINE";
        $("latency").textContent = Math.round(performance.now() - started) + " MS";

        const reply = String(data.reply || "I received that, Sir, but no response text was returned.");
        addMessage("HIVAI",reply);
        addLog("CORE","Response received // conversation context retained");

        await speak(reply);

        if(state === "speak") setState("wake");

    }catch(error){
        console.error(error);
        $("gateway").textContent = "ERROR";
        $("brainStatus").textContent = "ERROR";

        const friendly = "I couldn't reach my brain gateway right now. The 3D core is still online. Please check the Vercel /api/chat deployment and OPENAI_API_KEY.";
        addMessage("HIVAI",friendly);
        addLog("ERROR",error.message || "Gateway request failed");
        setState("wake");
    }finally{
        requestBusy = false;
    }
}

/* =========================================================
   CONTROLS
========================================================= */

$("wakeBtn").onclick = () => {
    unlockAudio();
    wakeCore();
    prepareVoice();
};

$("send").onclick = () => {
    const text = $("input").value.trim();
    $("input").value = "";
    ask(text);
};

$("input").addEventListener("keydown", event => {
    if(event.key === "Enter") $("send").click();
});

document.querySelectorAll(".quick button").forEach(button => {
    button.onclick = () => ask(button.dataset.cmd);
});

/* =========================================================
   SPEECH RECOGNITION
========================================================= */

const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition;

if(Recognition){
    recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.interimResults = true;
    recognition.continuous = false;

    recognition.onstart = () => {
        unlockAudio();
        if(state === "idle") wakeCore();
        stopVoice();
        setState("listen");
        listenSound();
        $("mic").classList.add("active");
        $("vs").textContent = "LISTENING // SPEAK NOW";
        addLog("VOICE","Microphone channel active");
    };

    recognition.onresult = event => {
        let text = "";
        for(const result of event.results) text += result[0].transcript;
        if(event.results[event.results.length - 1].isFinal){
            $("vs").textContent = "INPUT CAPTURED";
            addLog("USER",text);
            ask(text.trim());
        }
    };

    recognition.onerror = event => {
        console.warn(event);
        $("vs").textContent = "VOICE LINK // ERROR";
        setState(awake ? "wake" : "idle");
    };

    recognition.onend = () => {
        $("mic").classList.remove("active");
        if(state === "listen") setState("wake");
        $("vs").textContent = "VOICE LINK // READY";
        audioLevel = 0;
    };

    $("mic").onclick = () => {
        unlockAudio();
        prepareVoice();
        try { recognition.start(); } catch { try { recognition.stop(); } catch {} }
    };
}else{
    $("vs").textContent = "VOICE INPUT // USE CHROME OR EDGE";
}

/* =========================================================
   MICROPHONE VISUALIZER
========================================================= */

let analyser;
let micSource;
let micStream;

async function setupMicMeter(){
    if(analyser) return;
    try{
        micStream = await navigator.mediaDevices.getUserMedia({audio:true});
        unlockAudio();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        micSource = audioCtx.createMediaStreamSource(micStream);
        micSource.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);
        (function meter(){
            requestAnimationFrame(meter);
            if(!analyser) return;
            analyser.getByteFrequencyData(data);
            let total = 0;
            for(const value of data) total += value;
            audioLevel = Math.min(1,total/data.length/105);
        })();
    }catch(error){
        console.warn("Microphone visualizer unavailable",error);
    }
}

$("mic").addEventListener("click",setupMicMeter);

/* =========================================================
   ANIMATION
========================================================= */

function energy(){
    const target = state === "idle" ? 18 : state === "wake" ? 72 : state === "listen" ? 90 : state === "think" ? 84 : 68;
    const value = Math.round(Math.min(99,target + audioLevel * 10));
    $("energy").textContent = value + "%";
    $("energyBar").style.width = value + "%";
    $("load").textContent = Math.round(Math.min(99,target*.9 + audioLevel*30)) + "%";
}

function animate(ms){
    requestAnimationFrame(animate);
    const time = ms*.001;
    const stateSpeed = {idle:.18,wake:.7,listen:2.7,think:1.8,speak:1.25}[state] || .5;
    const base = {idle:.34,wake:1,listen:1.18,think:1.05,speak:1.08}[state] || 1;
    const targetScale = state === "idle" ? .48 : base;
    const voiceEnergy = speaking ? Math.max(audioLevel,voiceModule?.getVoiceEnergy ? voiceModule.getVoiceEnergy() : 0) : audioLevel;
    const pulse = targetScale*(1 + Math.sin(time*3.2)*(.025+voiceEnergy*.08) + voiceEnergy*.16);
    const target = new THREE.Vector3(pulse,pulse,pulse);
    core.scale.lerp(target,.09);
    core.rotation.y += .0025*stateSpeed;
    core.rotation.x += .0015*stateSpeed;
    shell.rotation.y += .008*stateSpeed;
    shell.rotation.z -= .004*stateSpeed;
    inner.rotation.y -= .014*stateSpeed;
    nucleus.scale.setScalar(1 + voiceEnergy*.75 + Math.sin(time*5)*.05);
    nucleusShell.rotation.x += .004*stateSpeed;
    nucleusShell.rotation.y -= .007*stateSpeed;
    nucleusShell.scale.setScalar(1 + voiceEnergy*.18);
    nucleusGlow.scale.setScalar((state === "idle" ? 48 : 82)*pulse*(1+voiceEnergy*.3));
    nucleusGlow.material.opacity = state === "idle" ? .3 : .78 + voiceEnergy*.2;
    nucleusRingA.rotation.z += .018*stateSpeed;
    nucleusRingA.rotation.y -= .009*stateSpeed;
    nucleusRingA.scale.setScalar(1 + voiceEnergy*.12);
    nucleusRingB.rotation.x -= .013*stateSpeed;
    nucleusRingB.rotation.z += .006*stateSpeed;
    glow.scale.setScalar((state === "idle" ? 115 : 175)*pulse*(1+voiceEnergy*.2));
    glow2.scale.setScalar((state === "idle" ? 28 : 62)*pulse*(1+voiceEnergy*.5));
    rings.forEach((r,index)=>{
        r.rotation.z += (index%2 ? .0018 : -.0012)*stateSpeed;
        r.rotation.x += (index%2 ? .0008 : -.0005)*stateSpeed;
        r.scale.setScalar(state === "idle" ? .72 : 1 + voiceEnergy*.08);
    });
    points.rotation.z = time*.018*stateSpeed;
    points.rotation.y = time*.009*stateSpeed;
    particleMaterial.size = state === "idle" ? 1.25 : 2.1 + voiceEnergy*2.2;
    particleMaterial.opacity = state === "idle" ? .28 : .5 + voiceEnergy*.38;
    rays.rotation.z = -time*.025*stateSpeed;
    rays.scale.setScalar(state === "idle" ? .7 : 1 + voiceEnergy*.12);
    rays.children.forEach((line,index)=>{
        line.material.opacity = (state === "idle" ? .05 : .1) + (index%5===0 ? voiceEnergy*.3 : voiceEnergy*.08);
    });
    nodes.forEach(node=>{
        node.a += .004*node.v*stateSpeed;
        const radius = node.r*(state === "idle" ? .62 : 1+voiceEnergy*.12);
        node.s.position.set(Math.cos(node.a)*radius,Math.sin(node.a)*radius*.58,node.y+Math.sin(time*2+node.r)*18);
        node.s.scale.setScalar(state === "idle" ? 2.5 : 7+voiceEnergy*22);
    });
    energy();
    renderer.render(scene,camera);
}
requestAnimationFrame(animate);

/* RESIZE */
function resize(){
    camera.aspect = innerWidth/innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(innerWidth,innerHeight);
}
addEventListener("resize",resize);

/* CLOCK */
function updateClock(){ $("clock").textContent = new Date().toLocaleTimeString([],{hour12:false}); }
updateClock();
setInterval(updateClock,1000);

/* BACKEND HEALTH */
fetch(API_BASE + "/api/health",{cache:"no-store"})
.then(response=>{ if(!response.ok) throw 0; return response.json(); })
.then(()=>{
    $("gateway").textContent = "ONLINE";
    addLog("GATEWAY","Health check passed // chat brain ready");
})
.catch(()=>{
    $("gateway").textContent = "OFFLINE";
    addLog("GATEWAY","Chat backend not detected // 3D core remains active");
});

setState("idle");

document.addEventListener("pointerdown",()=>{
    try{ unlockAudio(); }catch(_){ }
},{once:true});

