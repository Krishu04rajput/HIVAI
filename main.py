from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from backend.core.brain import generate_reply

app = FastAPI(title="HiVAI Gateway", version="1.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8000", "http://127.0.0.1:8000"],
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)

class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=8000)
    session_id: str = Field(default="local", min_length=1, max_length=128)

class ChatResponse(BaseModel):
    reply: str
    state: str
    session_id: str
    provider: str

@app.get("/api/health")
def health():
    return {"status": "ok", "system": "HiVAI", "version": "1.2.0"}

@app.post("/api/chat", response_model=ChatResponse)
def chat(request: ChatRequest):
    result = generate_reply(request.message)
    return ChatResponse(
        reply=result["reply"],
        state="speaking",
        session_id=request.session_id,
        provider=result["provider"],
    )
