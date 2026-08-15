from fastapi import Header, HTTPException, status

from app.config import settings


async def verify_api_key(authorization: str = Header(default="")) -> str:
    """
    Every request must include: Authorization: Bearer <gateway_api_key>

    This checks the key against the list of keys YOU issued (GATEWAY_API_KEYS),
    NOT against OpenAI/Groq's keys. Those stay hidden on the server side —
    clients of your gateway never see the real provider keys. That's the point
    of a gateway: you control who can use it and how much they can spend.
    """
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header. Expected: Bearer <api_key>",
        )

    api_key = authorization.removeprefix("Bearer ").strip()

    if not settings.GATEWAY_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Server misconfigured: no GATEWAY_API_KEYS set in .env",
        )

    if api_key not in settings.GATEWAY_API_KEYS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )

    return api_key
