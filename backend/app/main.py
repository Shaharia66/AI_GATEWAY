import logging

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.auth import verify_api_key
from app.cache import cache
from app.models import ChatRequest, ChatResponse
from app.pricing import estimate_cost_usd
from app.providers import PROVIDERS
from app.router import DEFAULT_MODELS, build_trial_order
from app.usage import get_recent_requests, get_usage_summary, init_db, log_request

logger = logging.getLogger("ai_gateway")

# Safety net: create the table immediately on import (idempotent), in
# addition to the startup event below - guarantees the DB is ready no
# matter how the app gets instantiated (uvicorn, tests, etc.)
init_db()

app = FastAPI(
    title="AI Gateway",
    description="A unified API in front of multiple LLM providers, with routing, fallback, caching, and cost tracking.",
    version="0.3.0",
)

# Allows the dashboard (running in your browser, a different origin than
# the API) to fetch data from this server. Open to any origin for local
# development - if you ever deploy this publicly, restrict allow_origins
# to your actual dashboard's domain instead of "*".
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    init_db()


@app.get("/health")
async def health():
    """Simple check to confirm the server is alive."""
    return {"status": "ok"}


@app.post("/v1/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, api_key: str = Depends(verify_api_key)):
    """
    The one endpoint every client talks to, no matter which AI provider
    ends up handling the request behind the scenes.

    Phase 3 adds two things on top of Phase 2's routing/fallback:
    - Caching: identical requests within the TTL return instantly, no
      provider call, no cost.
    - Usage tracking: every request (cache hit or not) is logged to
      SQLite for the /v1/usage endpoints.
    """
    # The cache key represents "this exact request", not "this exact provider" -
    # so if auto-routing picked Groq the first time, a repeat of the same
    # request hits the cache regardless of which provider would run next.
    cache_provider_key = request.provider or f"auto:{request.task_type}"
    cache_model_key = request.model or "default"

    if request.use_cache:
        cached = cache.get(cache_provider_key, cache_model_key, request.messages, request.temperature)
        if cached is not None:
            log_request(
                provider=cached["provider"],
                model=cached["model"],
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
                estimated_cost_usd=0.0,
                cache_hit=True,
                fallback_used=False,
            )
            return ChatResponse(
                **cached,
                fallback_used=False,
                providers_tried=["cache"],
                cache_hit=True,
                estimated_cost_usd=0.0,
            )

    # Strict mode: honor exactly what the client asked for, no fallback.
    if request.strict and request.provider:
        trial_order = [request.provider]
    else:
        trial_order = build_trial_order(request.provider, request.task_type)

    errors: dict[str, str] = {}

    for provider_name in trial_order:
        provider = PROVIDERS.get(provider_name)
        if provider is None:
            continue

        model = request.model or DEFAULT_MODELS.get(provider_name, "")

        try:
            result = await provider.chat(
                model=model,
                messages=request.messages,
                temperature=request.temperature,
                max_tokens=request.max_tokens,
            )

            cost = estimate_cost_usd(provider_name, result["prompt_tokens"], result["completion_tokens"])
            fallback_used = provider_name != trial_order[0]

            log_request(
                provider=provider.name,
                model=model,
                prompt_tokens=result["prompt_tokens"],
                completion_tokens=result["completion_tokens"],
                total_tokens=result["total_tokens"],
                estimated_cost_usd=cost,
                cache_hit=False,
                fallback_used=fallback_used,
            )

            cache_payload = {
                "provider": provider.name,
                "model": model,
                "content": result["content"],
                "prompt_tokens": result["prompt_tokens"],
                "completion_tokens": result["completion_tokens"],
                "total_tokens": result["total_tokens"],
            }
            if request.use_cache:
                cache.set(cache_provider_key, cache_model_key, request.messages, request.temperature, cache_payload)

            return ChatResponse(
                **cache_payload,
                fallback_used=fallback_used,
                providers_tried=list(errors.keys()) + [provider_name],
                cache_hit=False,
                estimated_cost_usd=cost,
            )
        except HTTPException as e:
            logger.warning("Provider '%s' failed: %s", provider_name, e.detail)
            errors[provider_name] = str(e.detail)
            continue
        except Exception as e:
            logger.warning("Provider '%s' raised an unexpected error: %s", provider_name, e)
            errors[provider_name] = str(e)
            continue

    raise HTTPException(
        status_code=502,
        detail={
            "message": "All providers in the trial order failed.",
            "providers_tried": trial_order,
            "errors": errors,
        },
    )


@app.get("/v1/usage")
async def usage_summary(api_key: str = Depends(verify_api_key)):
    """Totals per provider: request count, tokens, estimated cost, cache hits, fallback count."""
    return {
        "summary": get_usage_summary(),
        "cache_stats": cache.stats(),
    }


@app.get("/v1/usage/recent")
async def usage_recent(limit: int = 20, api_key: str = Depends(verify_api_key)):
    """The most recent individual requests, newest first - useful for a live log view."""
    return {"requests": get_recent_requests(limit)}