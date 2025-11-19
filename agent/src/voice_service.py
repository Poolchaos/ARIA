"""Voice service for speech recognition, synthesis, and LLM integration."""
import asyncio
from typing import Optional, Dict, Any
import os
import base64


class VoiceService:
    """Handles voice processing including STT, TTS, and LLM responses."""

    def __init__(self):
        self.claude_api_key = os.getenv("CLAUDE_API_KEY")
        self.gemini_api_key = os.getenv("GEMINI_API_KEY")
        self.openai_api_key = os.getenv("OPENAI_API_KEY")
        self.groq_api_key = os.getenv("GROQ_API_KEY")

    async def transcribe_audio(self, audio_data: bytes) -> str:
        """
        Convert speech audio to text using Groq Whisper API.

        Args:
            audio_data: Raw audio data in WebM format

        Returns:
            Transcribed text
        """
        if not self.groq_api_key:
            raise ValueError("GROQ_API_KEY not configured")

        try:
            import httpx

            # Groq Whisper API endpoint
            url = "https://api.groq.com/openai/v1/audio/transcriptions"

            files = {
                "file": ("audio.webm", audio_data, "audio/webm"),
                "model": (None, "whisper-large-v3"),
                "response_format": (None, "json"),
                "language": (None, "en"),
            }

            headers = {
                "Authorization": f"Bearer {self.groq_api_key}",
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, files=files, headers=headers)
                response.raise_for_status()
                result = response.json()

                return result.get("text", "")

        except Exception as e:
            print(f"Transcription error: {e}")
            raise Exception(f"Failed to transcribe audio: {str(e)}")

    async def get_llm_response(
        self,
        prompt: str,
        provider: str = "claude",
        context: Optional[Dict[str, Any]] = None,
    ) -> str:
        """
        Get LLM response to user input.

        Args:
            prompt: User's transcribed speech
            provider: LLM provider (claude, gemini, openai)
            context: User and household context

        Returns:
            LLM response text
        """
        if provider == "claude":
            return await self._get_claude_response(prompt, context)
        elif provider == "gemini":
            return await self._get_gemini_response(prompt, context)
        elif provider == "openai":
            return await self._get_openai_response(prompt, context)
        else:
            raise ValueError(f"Unknown LLM provider: {provider}")

    async def _get_claude_response(self, prompt: str, context: Optional[Dict] = None) -> str:
        """Get response from Claude API."""
        if not self.claude_api_key:
            raise ValueError("CLAUDE_API_KEY not configured")

        try:
            import httpx

            url = "https://api.anthropic.com/v1/messages"

            system_prompt = self._build_system_prompt(context)

            headers = {
                "x-api-key": self.claude_api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            }

            data = {
                "model": "claude-3-5-sonnet-20241022",
                "max_tokens": 1024,
                "system": system_prompt,
                "messages": [
                    {"role": "user", "content": prompt}
                ],
            }

            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(url, json=data, headers=headers)
                response.raise_for_status()
                result = response.json()

                return result["content"][0]["text"]

        except Exception as e:
            print(f"Claude API error: {e}")
            return "I'm sorry, I encountered an error processing your request."

    async def _get_gemini_response(self, prompt: str, context: Optional[Dict] = None) -> str:
        """Get response from Gemini API."""
        # Placeholder for Gemini implementation
        return "Gemini integration coming soon."

    async def _get_openai_response(self, prompt: str, context: Optional[Dict] = None) -> str:
        """Get response from OpenAI API."""
        # Placeholder for OpenAI implementation
        return "OpenAI integration coming soon."

    def _build_system_prompt(self, context: Optional[Dict] = None) -> str:
        """Build system prompt with user context."""
        base_prompt = (
            "You are ARIA, a helpful voice assistant for managing household tasks, "
            "calendar events, shopping lists, and budgets. You provide concise, "
            "natural responses optimized for voice interaction. Keep responses brief "
            "and conversational."
        )

        if context:
            user_name = context.get("userName", "there")
            base_prompt += f"\n\nYou are speaking with {user_name}."

        return base_prompt

    async def synthesize_speech(
        self,
        text: str,
        voice_name: str = "en-US-AriaNeural",
        pitch: float = 1.0,
        rate: float = 1.0,
        volume: float = 1.0,
    ) -> bytes:
        """
        Convert text to speech using edge-tts (Microsoft Edge TTS).

        Args:
            text: Text to convert to speech
            voice_name: Voice to use
            pitch: Pitch adjustment (0.5 - 2.0)
            rate: Speed adjustment (0.5 - 2.0)
            volume: Volume adjustment (0.0 - 1.0)

        Returns:
            Audio data in MP3 format
        """
        try:
            import edge_tts
            import tempfile

            # Create temporary file for audio
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_file:
                tmp_path = tmp_file.name

            # Convert parameters to SSML-style adjustments
            pitch_str = f"{int((pitch - 1.0) * 50):+d}Hz"
            rate_str = f"{int((rate - 1.0) * 100):+d}%"
            volume_str = f"{int(volume * 100)}%"

            # Generate speech
            communicate = edge_tts.Communicate(
                text,
                voice_name,
                pitch=pitch_str,
                rate=rate_str,
                volume=volume_str,
            )

            await communicate.save(tmp_path)

            # Read the generated audio
            with open(tmp_path, "rb") as f:
                audio_data = f.read()

            # Clean up
            os.unlink(tmp_path)

            return audio_data

        except Exception as e:
            print(f"TTS error: {e}")
            raise Exception(f"Failed to synthesize speech: {str(e)}")
