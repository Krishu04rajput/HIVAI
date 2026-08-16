import os
import httpx

SYSTEM_PROMPT = """You are HiVAI, Hive Intelligence Virtual AI System.
You are a personal AI assistant. Be useful, accurate, concise and transparent.
Do not claim to have used tools, memory or web research unless they were actually used.
Never reveal server secrets, API keys or internal environment variables.
"""

def _fallback(message: str) -> dict:
    return {
        "reply": (
            "HiVAI Core is online, but no AI provider is configured yet. "
            "The secure gateway received your command successfully. "
            "Configure AI_API_URL, AI_API_KEY and AI_MODEL on the backend to activate the external AI brain."
        ),
        "provider": "fallback",
    }

def generate_reply(message: str) -> dict:
    api_url = os.getenv("AI_API_URL", "").strip()
    api_key = os.getenv("AI_API_KEY", "").strip()
    model = os.getenv("AI_MODEL", "").strip()

    if not (api_url and api_key and model):
        return _fallback(message)

    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": message},
        ],
        "temperature": 0.4,
    }

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    try:
        with httpx.Client(timeout=45.0) as client:
            response = client.post(api_url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        text = data["choices"][0]["message"]["content"].strip()
        return {"reply": text, "provider": model}
    except Exception:
        return {
            "reply": "HiVAI reached the brain gateway, but the configured AI provider did not return a usable response.",
            "provider": "provider-error",
        }
