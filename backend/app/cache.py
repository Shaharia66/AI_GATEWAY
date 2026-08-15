import hashlib
import json
import time
from typing import Optional

from app.models import ChatMessage


class InMemoryCache:
    """
    Exact-match cache: if the same request (same provider choice, model,
    messages, temperature) comes in again within the TTL window, we skip
    calling the AI provider entirely and return the saved answer instantly.

    This is intentionally simple (no external services, no ML model to
    download) so it works the moment you run the server - no extra setup.

    NOTE: this is exact-match, not semantic. A true semantic cache (catching
    "what's 2+2" vs "what is two plus two" as the same question) needs an
    embeddings model to compare meaning, not just text. That's a documented
    future enhancement, not implemented here, to keep this phase dependency-free.
    """

    def __init__(self, max_size: int = 500, default_ttl_seconds: int = 3600):
        self._store: dict[str, tuple[float, dict]] = {}
        self.max_size = max_size
        self.default_ttl = default_ttl_seconds

    def _make_key(
        self,
        provider_key: str,
        model_key: str,
        messages: list[ChatMessage],
        temperature: float,
    ) -> str:
        # Normalize so trivial differences (extra whitespace, casing) still hit the cache
        normalized = json.dumps(
            {
                "provider_key": provider_key,
                "model_key": model_key,
                "messages": [
                    {"role": m.role, "content": m.content.strip().lower()} for m in messages
                ],
                "temperature": temperature,
            },
            sort_keys=True,
        )
        return hashlib.sha256(normalized.encode("utf-8")).hexdigest()

    def get(
        self,
        provider_key: str,
        model_key: str,
        messages: list[ChatMessage],
        temperature: float,
    ) -> Optional[dict]:
        key = self._make_key(provider_key, model_key, messages, temperature)
        entry = self._store.get(key)
        if entry is None:
            return None

        expires_at, value = entry
        if time.time() > expires_at:
            del self._store[key]  # expired, treat as a miss
            return None

        return value

    def set(
        self,
        provider_key: str,
        model_key: str,
        messages: list[ChatMessage],
        temperature: float,
        value: dict,
        ttl_seconds: Optional[int] = None,
    ) -> None:
        key = self._make_key(provider_key, model_key, messages, temperature)

        if len(self._store) >= self.max_size and key not in self._store:
            oldest_key = next(iter(self._store))  # simple FIFO eviction
            del self._store[oldest_key]

        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._store[key] = (time.time() + ttl, value)

    def stats(self) -> dict:
        now = time.time()
        live_entries = sum(1 for expires_at, _ in self._store.values() if expires_at > now)
        return {"entries": live_entries, "max_size": self.max_size}


# One shared cache instance for the whole app
cache = InMemoryCache()