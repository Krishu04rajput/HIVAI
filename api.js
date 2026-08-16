// HiVAI Web Brain Bridge
// V1.2 — browser-side gateway client

const HIVAI_CONFIG = {
    // Replace this later with the deployed HiVAI gateway.
    API_URL: "YOUR_HIVAI_GATEWAY_URL"
};

async function askHiVAI(message) {
    if (!message || !message.trim()) {
        throw new Error("Empty message");
    }

    const response = await fetch(`${HIVAI_CONFIG.API_URL}/api/chat`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            message: message.trim(),
            session_id: "web"
        })
    });

    if (!response.ok) {
        throw new Error(`HiVAI Gateway Error: ${response.status}`);
    }

    return await response.json();
}


// Optional helper for the UI
async function checkHiVAI() {
    try {
        const response = await fetch(
            `${HIVAI_CONFIG.API_URL}/api/health`
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        return data.status === "ok";
    } catch {
        return false;
    }
}
