import httpx
from fastapi import HTTPException

from app.config import settings
from app.models import ChatMessage
from app.providers.base import Provider


class GroqProvider(Provider):
    name = "groq"

    async def chat(
        self,
        model: str,
        messages: list[ChatMessage],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        if not settings.GROQ_API_KEY:
            raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured on server")

        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [m.model_dump() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        # Groq's API shape is OpenAI-compatible, so this looks almost
        # identical to the OpenAI provider - that's expected, not a mistake.
        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(settings.GROQ_BASE_URL, headers=headers, json=payload)

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"Groq request failed ({response.status_code}): {response.text}",
            )

        data = response.json()
        usage = data.get("usage", {})

        return {
            "content": data["choices"][0]["message"]["content"],
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
