const HIVAI_CONFIG={API_URL:""};
export async function askHiVAI(message,messages=[],session_id="web"){
 const r=await fetch(`${HIVAI_CONFIG.API_URL}/api/chat`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({message,messages,session_id})});
 const d=await r.json().catch(()=>({})); if(!r.ok||!d.ok)throw new Error(d.error||`Gateway HTTP ${r.status}`); return d;
}
export async function checkHiVAI(){try{const r=await fetch("/api/health",{cache:"no-store"});return r.ok&&(await r.json()).status==="ok";}catch{return false;}}
