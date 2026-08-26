export default function handler(request) {
    return new Response(JSON.stringify({
        status:"ok",
        system:"HIVAI",
        name:"Hive Intelligence Virtual AI System",
        version:"1.5.0",
        gateway:"online",
        core:"3d-nucleus",
        voice:"kokoro-local",
        secure:true
    }), {
        status:200,
        headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
    });
}
