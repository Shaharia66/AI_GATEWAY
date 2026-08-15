import httpx
from fastapi import HTTPException

from app.config import settings
from app.models import ChatMessage
from app.providers.base import Provider


class OpenAIProvider(Provider):
    name = "openai"

    async def chat(
        self,
        model: str,
        messages: list[ChatMessage],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        if not settings.OPENAI_API_KEY:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured on server")

        headers = {
            "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [m.model_dump() for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        async with httpx.AsyncClient(timeout=settings.REQUEST_TIMEOUT_SECONDS) as client:
            response = await client.post(settings.OPENAI_BASE_URL, headers=headers, json=payload)

        if response.status_code != 200:
            raise HTTPException(
                status_code=502,
                detail=f"OpenAI request failed ({response.status_code}): {response.text}",
            )

        data = response.json()
        usage = data.get("usage", {})

        return {
            "content": data["choices"][0]["message"]["content"],
            "prompt_tokens": usage.get("prompt_tokens", 0),
            "completion_tokens": usage.get("completion_tokens", 0),
            "total_tokens": usage.get("total_tokens", 0),
        }
