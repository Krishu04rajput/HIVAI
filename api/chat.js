export default async function handler(request) {
    // HiVAI Brain Gateway
    // Provider details stay server-side.

    if (request.method !== "POST") {
        return new Response(
            JSON.stringify({ error: "Method not allowed" }),
            {
                status: 405,
                headers: { "Content-Type": "application/json" }
            }
        );
    }

    try {
        const body = await request.json();
        const message = String(body.message || "").trim();

        if (!message) {
            return new Response(
                JSON.stringify({ error: "Empty message" }),
                {
                    status: 400,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const apiKey = process.env.OPENAI_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error: "HiVAI Brain is not configured yet."
                }),
                {
                    status: 503,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const response = await fetch(
            "https://api.openai.com/v1/responses",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: process.env.OPENAI_MODEL || "gpt-5.6",
                    instructions:
                        "You are HiVAI, Hive Intelligence Virtual AI System. " +
                        "Respond naturally as HiVAI. Never mention the underlying " +
                        "AI provider unless the user explicitly asks about the " +
                        "technical architecture.",
                    input: message
                })
            }
        );

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    error: "HiVAI Brain failed to respond."
                }),
                {
                    status: 502,
                    headers: { "Content-Type": "application/json" }
                }
            );
        }

        const data = await response.json();

        return new Response(
            JSON.stringify({
                reply: data.output_text || "HiVAI could not generate a response."
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

    } catch {
        return new Response(
            JSON.stringify({
                error: "HiVAI gateway encountered an internal error."
            }),
            {
                status: 500,
                headers: { "Content-Type": "application/json" }
            }
        );
    }
}
