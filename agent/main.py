from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import os

app = FastAPI(title="ARIA Agent", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3004")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    message: str
    userId: str
    householdId: str
    conversationId: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    conversationId: str
    toolCalls: Optional[List[Dict[str, Any]]] = None


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "ARIA Agent",
        "version": "1.0.0",
    }


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Process user message and return AI response

    TODO: Implement LLM integration with tool calling
    - Load conversation context from Redis
    - Call appropriate LLM provider (Claude/Gemini/OpenAI)
    - Execute tools based on agent decisions
    - Store conversation history
    """
    # Placeholder response
    return ChatResponse(
        response=f"Echo: {request.message} (LLM integration pending)",
        conversationId=request.conversationId or "temp-conversation-id",
        toolCalls=None,
    )


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "ARIA Agent",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "chat": "/chat",
        },
    }


if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", "8000"))
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info",
    )
