const DB_NAME='hivai-learning-db';
const DB_VERSION=1;
const STORE='knowledge';

export async function learnFromText(text,source='conversation'){
  const db=await openDB();
  const terms=extractTerms(text);
  await new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,'readwrite');
    for(const term of terms)tx.objectStore(STORE).put({term,source,example:text.slice(0,600),updatedAt:Date.now()});
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);
  });
  return {stored:terms.length,terms};
}

export async function getKnowledge(limit=50){
  const db=await openDB();
  return new Promise((resolve,reject)=>{const r=db.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result.sort((a,b)=>b.updatedAt-a.updatedAt).slice(0,limit));r.onerror=()=>reject(r.error)})
}

function extractTerms(text){
  return [...new Set(String(text).toLowerCase().split(/[^a-z0-9_+#.-]+/).filter(x=>x.length>=5).slice(0,20))];
}
function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,DB_VERSION);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'term'})};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)})}
