export default {
  async fetch(request) {
    return new Response(
      JSON.stringify({
        status: "ok",
        system: "HiVAI",
        version: "1.2.1",
        gateway: "online"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
  }
};
