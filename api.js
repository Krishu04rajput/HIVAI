// HIVAI V1.3
// Same-origin gateway bridge.
// The API key NEVER exists in this file.

const HIVAI_CONFIG = {
    API_URL: ""
};

async function askHiVAI(message){

    if(!message || !message.trim()){
        throw new Error("Empty message");
    }

    const response =
        await fetch(
            `${HIVAI_CONFIG.API_URL}/api/chat`,
            {
                method:"POST",

                headers:{
                    "Content-Type":
                        "application/json"
                },

                body:JSON.stringify({
                    message:message.trim(),
                    session_id:"web"
                })
            }
        );

    let data;

    try{
        data = await response.json();
    }catch{
        throw new Error(
            `Gateway returned HTTP ${response.status}`
        );
    }

    if(!response.ok || !data.ok){

        throw new Error(
            data?.error ||
            `HiVAI Gateway Error: ${response.status}`
        );

    }

    return data;
}


async function checkHiVAI(){

    try{

        const response =
            await fetch(
                "/api/health",
                {
                    cache:"no-store"
                }
            );

        if(!response.ok){
            return false;
        }

        const data =
            await response.json();

        return data.status === "ok";

    }catch{

        return false;

    }

}
