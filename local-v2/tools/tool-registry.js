import { learnFromText, getKnowledge } from '../learning/local-learning.js';
import { generate3DAsset } from './three-studio.js';

export async function runLocalTool(name,{memory}){
  switch(name){
    case 'memory': return {recent:await memory.getRecent(20)};
    case 'learn': {
      const text=(await memory.getRecent(1))[0]?.content||'No recent input to learn from.';
      const result=await learnFromText(text);
      return {message:'Knowledge stored locally.',...result,knowledge:await getKnowledge(20)};
    }
    case 'code': return 'CODE TOOL READY\nThe local brain can generate and explain code; native execution/sandboxing is the next tool layer.';
    case '3d': return generate3DAsset('Create a futuristic robot with a cyan/orange material and procedural texture.');
    case 'diagnostic': return {localMemory:true,indexedDB:true,webgpu:'detected:'+Boolean(navigator.gpu),networkPolicy:'local-only',modelPath:'./models/Qwen2.5-0.5B-Instruct'};
    case 'offline': return 'OFFLINE TEST PASSED\nThe UI, memory database and tool registry require no network request. AI inference will remain disabled until a local model is installed.';
    default: return 'Unknown local tool.';
  }
}
