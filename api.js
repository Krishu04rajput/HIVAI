/* HIVAI same-origin gateway helper */
const HIVAI_CONFIG = { API_URL: "" };

async function askHiVAI(message, messages = [], session_id = "web") {
    if (!message?.trim()) throw new Error("Empty message");
    const response = await fetch(`${HIVAI_CONFIG.API_URL}/api/chat`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({message:message.trim(),messages,session_id})
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok) throw new Error(data?.error || `HIVAI Gateway Error: ${response.status}`);
    return data;
}

async function checkHiVAI() {
    try {
        const response = await fetch("/api/health", {cache:"no-store"});
        if (!response.ok) return false;
        const data = await response.json();
        return data.status === "ok";
    } catch { return false; }
}
