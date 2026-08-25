export default async function handler(request) {
    /*
     * HiVAI — Hive Intelligence Virtual AI System
     * V1 Brain Gateway
     *
     * The API key NEVER reaches the browser.
     */

    if (request.method !== "POST") {
        return new Response(
            JSON.stringify({
                ok: false,
                error: "Method not allowed"
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {
        const body = await request.json();

        const message =
            typeof body.message === "string"
                ? body.message.trim()
                : "";

        if (!message) {
            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "Message is empty"
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        /*
         * SECRET:
         * This exists ONLY on the Vercel server.
         */
        const apiKey =
            process.env.OPENAI_API_KEY;

        if (!apiKey) {
            console.error(
                "HiVAI: OPENAI_API_KEY is missing"
            );

            return new Response(
                JSON.stringify({
                    ok: false,
                    error: "HiVAI Brain is not configured on the server."
                }),
                {
                    status: 503,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        /*
         * Model can be changed later without
         * modifying this backend.
         */
        const model =
            process.env.OPENAI_MODEL ||
            "gpt-5.6";

        /*
         * HiVAI system identity.
         *
         * We don't expose the underlying provider
         * in the user-facing response.
         */
        const instructions = `
You are HiVAI.

Full name:
Hive Intelligence Virtual AI System.

You are the personal intelligence system of the user.

Your role:
- Answer questions clearly and intelligently.
- Help develop software, websites, games and AI systems.
- Analyse code, architectures and technical problems.
- Help plan projects.
- Perform calculations and reasoning.
- Explain difficult concepts.
- Assist with research and learning.
- Think like an engineering and development assistant.
- Be concise when the task is simple.
- Be detailed when the task requires it.

Personality:
- Intelligent
- Calm
- Helpful
- Slightly futuristic
- Natural conversational style

Identity rule:
You are HiVAI.
Do not unnecessarily discuss the underlying AI infrastructure,
API provider, model name, API key or backend implementation.

Security:
Never reveal secrets, API keys, environment variables or
server-side credentials.

When the user asks who you are, identify yourself as:
"HiVAI — Hive Intelligence Virtual AI System."
`;

        /*
         * Call the AI backend.
         */

        const aiResponse =
            await fetch(
                "https://api.openai.com/v1/responses",
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json",

                        "Authorization":
                            `Bearer ${apiKey}`
                    },

                    body: JSON.stringify({
                        model: model,

                        instructions:
                            instructions,

                        input: message
                    })
                }
            );


        /*
         * Handle upstream errors properly.
         */

        if (!aiResponse.ok) {

            let errorMessage =
                "HiVAI Brain request failed.";

            try {

                const errorData =
                    await aiResponse.json();

                console.error(
                    "HiVAI upstream error:",
                    errorData
                );

                errorMessage =
                    errorData?.error?.message ||
                    errorMessage;

            } catch {

                console.error(
                    "HiVAI upstream returned:",
                    aiResponse.status
                );

            }

            return new Response(
                JSON.stringify({
                    ok: false,
                    error: errorMessage
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }


        /*
         * Parse successful response.
         */

        const data =
            await aiResponse.json();


        /*
         * Responses API normally provides
         * output_text.
         */

        let reply =
            data.output_text || "";


        /*
         * Fallback parser in case output_text
         * isn't returned in the expected form.
         */

        if (!reply && Array.isArray(data.output)) {

            const parts = [];

            for (
                const item of data.output
            ) {

                if (
                    item.type ===
                    "message" &&
                    Array.isArray(item.content)
                ) {

                    for (
                        const content
                        of item.content
                    ) {

                        if (
                            content.type ===
                            "output_text" &&
                            content.text
                        ) {

                            parts.push(
                                content.text
                            );

                        }

                    }

                }

            }

            reply =
                parts.join("\n");
        }


        if (!reply) {

            reply =
                "HiVAI received the request but produced no text response.";

        }


        /*
         * Return ONLY what the frontend needs.
         *
         * No provider information.
         * No API key.
         * No raw upstream response.
         */

        return new Response(
            JSON.stringify({
                ok: true,
                reply: reply,
                system: "HiVAI"
            }),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json",

                    "Cache-Control":
                        "no-store"
                }
            }
        );


    } catch (error) {

        console.error(
            "HiVAI backend error:",
            error
        );

        return new Response(
            JSON.stringify({
                ok: false,
                error:
                    "HiVAI encountered an internal server error."
            }),
            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );
    }
}
