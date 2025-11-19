"""Voice interface routes for real-time speech interaction."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, HTTPException
from typing import Dict, Any
import json
import base64
import asyncio
from datetime import datetime

from .voice_service import VoiceService
from .redis_client import get_redis

router = APIRouter(prefix="/voice", tags=["voice"])
voice_service = VoiceService()

# Track active WebSocket connections
active_connections: Dict[str, WebSocket] = {}


@router.websocket("/stream")
async def voice_stream(websocket: WebSocket):
    """WebSocket endpoint for bidirectional voice streaming."""
    await websocket.accept()
    connection_id = id(websocket)
    active_connections[str(connection_id)] = websocket

    user_context = None
    redis_client = await get_redis()

    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)

            msg_type = message.get("type")

            if msg_type == "context":
                # Store user context for personalization
                user_context = message.get("data", {})
                user_id = user_context.get("userId")

                # Load conversation history from Redis
                if user_id:
                    history_key = f"conversation:{user_id}"
                    history = await redis_client.lrange(history_key, -10, -1)
                    conversation_history = [json.loads(msg) for msg in history]
                else:
                    conversation_history = []

                await websocket.send_json({
                    "type": "ready",
                    "message": "Voice service ready",
                })

            elif msg_type == "audio":
                # Process incoming audio from user
                await websocket.send_json({
                    "type": "processing",
                    "status": "start",
                })

                try:
                    # Decode base64 audio
                    audio_data = base64.b64decode(message.get("data"))

                    # Speech-to-Text
                    transcript = await voice_service.transcribe_audio(audio_data)

                    await websocket.send_json({
                        "type": "transcript",
                        "text": transcript,
                    })

                    # Save user message to Redis
                    if user_context and user_context.get("userId"):
                        user_id = user_context["userId"]
                        history_key = f"conversation:{user_id}"
                        await redis_client.rpush(
                            history_key,
                            json.dumps({
                                "role": "user",
                                "content": transcript,
                                "timestamp": datetime.utcnow().isoformat(),
                            })
                        )
                        await redis_client.expire(history_key, 86400)  # 24 hours

                    # Get LLM response
                    llm_provider = user_context.get("llmProvider", "claude") if user_context else "claude"
                    response_text = await voice_service.get_llm_response(
                        transcript,
                        provider=llm_provider,
                        context=user_context,
                    )

                    await websocket.send_json({
                        "type": "response",
                        "text": response_text,
                    })

                    # Save assistant message to Redis
                    if user_context and user_context.get("userId"):
                        await redis_client.rpush(
                            history_key,
                            json.dumps({
                                "role": "assistant",
                                "content": response_text,
                                "timestamp": datetime.utcnow().isoformat(),
                            })
                        )

                    # Text-to-Speech
                    voice_prefs = user_context.get("voicePreferences", {}) if user_context else {}
                    audio_response = await voice_service.synthesize_speech(
                        response_text,
                        voice_name=voice_prefs.get("name", "en-US-AriaNeural"),
                        pitch=voice_prefs.get("pitch", 1.0),
                        rate=voice_prefs.get("rate", 1.0),
                        volume=voice_prefs.get("volume", 1.0),
                    )

                    # Send audio back to client
                    audio_base64 = base64.b64encode(audio_response).decode('utf-8')
                    await websocket.send_json({
                        "type": "audio",
                        "audio": audio_base64,
                    })

                except Exception as e:
                    await websocket.send_json({
                        "type": "error",
                        "message": str(e),
                    })

                finally:
                    await websocket.send_json({
                        "type": "processing",
                        "status": "end",
                    })

    except WebSocketDisconnect:
        active_connections.pop(str(connection_id), None)
    except Exception as e:
        print(f"WebSocket error: {e}")
        await websocket.send_json({
            "type": "error",
            "message": "Internal server error",
        })
        active_connections.pop(str(connection_id), None)


@router.post("/test-tts")
async def test_text_to_speech(text: str, voice_name: str = "en-US-AriaNeural"):
    """Test endpoint for text-to-speech."""
    try:
        audio_data = await voice_service.synthesize_speech(text, voice_name=voice_name)
        audio_base64 = base64.b64encode(audio_data).decode('utf-8')
        return {
            "success": True,
            "audio": audio_base64,
            "format": "mp3",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
