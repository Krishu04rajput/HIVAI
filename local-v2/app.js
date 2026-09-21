import { LocalBrain } from './brain/local-brain.js';
import { LocalMemory } from './memory/local-memory.js';
import { runLocalTool } from './tools/tool-registry.js';

const $ = (id) => document.getElementById(id);
const memory = new LocalMemory();
const brain = new LocalBrain({
  modelPath: 'Qwen2.5-0.5B-Instruct',
  onStatus: (status) => {
    $('modelStatus').textContent = status.model;
    $('inference').textContent = status.inference;
    $('networkStatus').textContent = status.network;
    $('coreState').textContent = status.core;
    addLog(status.message);
  }
});

function addLog(message){
  const row=document.createElement('div');
  row.textContent=`[${new Date().toLocaleTimeString([], {hour12:false})}] ${message}`;
  $('log').prepend(row);
  while($('log').children.length>20) $('log').lastElementChild.remove();
}
function addMessage(role,text){
  const el=document.createElement('div');
  el.innerHTML=`<b>${role}:</b> ${escapeHtml(text)}`;
  $('messages').appendChild(el);
  $('messages').scrollTop=$('messages').scrollHeight;
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

async function boot(){
  addLog('HIVAI Local V2 booting');
  addLog('Network access is disabled for model inference');
  await memory.init();
  const history=await memory.getRecent(12);
  for(const item of history) addMessage(item.role==='user'?'YOU':'HIVAI',item.content);
  if(history.length) addLog(`Restored ${history.length} local messages`);
  $('memoryStatus').textContent='LOCAL // READY';
}

$('chatForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const input=$('prompt');
  const text=input.value.trim();
  if(!text)return;
  input.value='';
  addMessage('YOU',text);
  await memory.add({role:'user',content:text});
  $('coreState').textContent='THINKING // LOCAL';
  try{
    const response=await brain.chat(text, await memory.getContext());
    addMessage('HIVAI',response);
    await memory.add({role:'assistant',content:response});
    $('coreState').textContent='AWAKE // LOCAL';
  }catch(error){
    addMessage('HIVAI',`Local brain is not loaded yet. ${error.message}`);
    $('coreState').textContent='SLEEP // MODEL REQUIRED';
  }
});

for(const button of document.querySelectorAll('[data-tool]')){
  button.addEventListener('click',async()=>{
    const result=await runLocalTool(button.dataset.tool,{memory,brain});
    $('toolOutput').textContent=typeof result==='string'?result:JSON.stringify(result,null,2);
    addLog(`Tool executed: ${button.dataset.tool}`);
  });
}

boot();
