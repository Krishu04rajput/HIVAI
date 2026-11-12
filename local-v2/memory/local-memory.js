const DB_NAME='hivai-local-db';
const DB_VERSION=1;
const STORE='memory';

export class LocalMemory{
  constructor(){this.db=null}
  async init(){
    this.db=await new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(STORE))db.createObjectStore(STORE,{keyPath:'id',autoIncrement:true})};
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async add(item){
    return this.tx('readwrite',store=>store.add({...item,createdAt:Date.now()}));
  }
  async getRecent(limit=20){
    const rows=await this.tx('readonly',store=>store.getAll());
    return rows.sort((a,b)=>a.createdAt-b.createdAt).slice(-limit);
  }
  async clear(){return this.tx('readwrite',store=>store.clear())}
  async getContext(){
    const rows=await this.getRecent(12);
    return rows.map(({role,content})=>({role,content}));
  }
  tx(mode,operation){
    return new Promise((resolve,reject)=>{
      const tx=this.db.transaction(STORE,mode); const store=tx.objectStore(STORE); const req=operation(store);
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
}
