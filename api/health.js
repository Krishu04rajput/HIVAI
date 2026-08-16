export default function handler(req, res) {
    res.status(200).json({
        status: "ok",
        system: "HiVAI",
        version: "1.2.1",
        gateway: "online"
    });
}
