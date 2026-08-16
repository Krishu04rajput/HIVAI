export default function handler(request) {
    return new Response(
        JSON.stringify({
            status: "ok",
            system: "HiVAI",
            version: "1.2.1"
        }),
        {
            status: 200,
            headers: {
                "Content-Type": "application/json"
            }
        }
    );
}
