import { pipeline, env } from '@huggingface/transformers';

// LOCAL-ONLY policy: never fetch a model from the Hub at runtime.
env.allowRemoteModels = false;
env.allowLocalModels = true;
env.useBrowserCache = true;
env.localModelPath = '/models/';

export class LocalBrain {
  constructor({modelPath,onStatus}){
    this.modelPath=modelPath;
    this.onStatus=onStatus||(()=>{});
    this.generator=null;
    this.loading=null;
    this.onStatus({model:'LOCAL MODEL',inference:'OFFLINE',network:'DISABLED',core:'SLEEP // LOCAL',message:'Local-only brain policy enabled'});
  }

  async load(){
    if(this.generator)return this.generator;
    if(this.loading)return this.loading;
    this.loading=(async()=>{
      this.onStatus({model:'LOADING LOCAL',inference:'LOADING',network:'DISABLED',core:'AWAKE // LOADING',message:'Loading model from device storage'});
      this.generator=await pipeline('text-generation',this.modelPath,{device:'webgpu',dtype:'q4'});
      this.onStatus({model:'LOCAL MODEL READY',inference:'READY',network:'DISABLED',core:'AWAKE // LOCAL',message:'Local LLM loaded on device'});
      return this.generator;
    })();
    try{return await this.loading}finally{this.loading=null}
  }

  async chat(userText,context=[]){
    const generator=await this.load();
    const messages=[
      {role:'system',content:'You are HIVAI, a private local AI assistant. Use the supplied memory as context. Learn useful new concepts by storing knowledge and analyzing prior interactions; do not claim that every chat retrains the neural model. You can reason, code, plan projects, and use local tools.'},
      ...context,
      {role:'user',content:userText}
    ];
    const output=await generator(messages,{max_new_tokens:512,temperature:.7,do_sample:true});
    const text=output?.[0]?.generated_text;
    if(Array.isArray(text))return text.at(-1)?.content||'';
    return String(text||'').replace(/^.*?assistant\s*[:：]\s*/i,'').trim();
  }
}
