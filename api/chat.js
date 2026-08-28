export default async function handler(request) {
  const headers={"Content-Type":"application/json","Cache-Control":"no-store"};
  if(request.method!=="POST") return new Response(JSON.stringify({ok:false,error:"Method not allowed"}),{status:405,headers});
  try{
    const body=await request.json();
    const message=typeof body.message==="string"?body.message.trim():"";
    if(!message)return new Response(JSON.stringify({ok:false,error:"Message is empty"}),{status:400,headers});
    if(message.length>12000)return new Response(JSON.stringify({ok:false,error:"Message is too large"}),{status:413,headers});
    const key=process.env.OPENAI_API_KEY;
    if(!key)return new Response(JSON.stringify({ok:false,error:"OPENAI_API_KEY is missing in Vercel Environment Variables."}),{status:503,headers});
    const model=process.env.OPENAI_MODEL||"gpt-5.6-luna";
    const incoming=Array.isArray(body.messages)?body.messages:[];
    const history=incoming.filter(x=>x&&(x.role==="user"||x.role==="assistant")&&typeof x.content==="string"&&x.content.trim()).slice(-20).map(x=>({role:x.role,content:x.content.slice(0,12000)}));
    if(!history.length || history[history.length-1].role!=="user" || history[history.length-1].content!==message)history.push({role:"user",content:message});
    const response=await fetch("https://api.openai.com/v1/responses",{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},body:JSON.stringify({model,instructions:"You are HIVAI (Hive Intelligence Virtual AI System), the user's personal AI assistant. Be useful, natural and technically capable. Address the user as Sir when appropriate. Help with programming, apps, games, AI, projects, mathematics, science and analysis. Give practical answers and complete code when requested. Never reveal secrets or API keys. Do not claim permanent memory; recent conversation is supplied by the app. Do not unnecessarily mention the underlying provider.",input:history,store:false})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok){
  console.error("OpenAI",response.status,data);
  const apiMessage=data?.error?.message || data?.error?.code || "Unknown OpenAI API error";
  return new Response(JSON.stringify({
    ok:false,
    error:`OpenAI ${response.status}: ${apiMessage}`
  }),{status:502,headers});
}
    let reply=data.output_text||"";
    if(!reply&&Array.isArray(data.output))for(const item of data.output)for(const c of (item.content||[]))if(c.type==="output_text")reply+=(reply?"\n":"")+(c.text||"");
    reply=String(reply).trim();
    if(!reply)reply="I received the request but the AI returned no text.";
    return new Response(JSON.stringify({ok:true,reply,system:"HIVAI",session_id:typeof body.session_id==="string"?body.session_id.slice(0,100):"web"}),{status:200,headers});
  }catch(e){console.error(e);return new Response(JSON.stringify({ok:false,error:"HIVAI gateway error. Check the Vercel function logs."}),{status:500,headers});}
}
