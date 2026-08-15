from typing import Literal, Optional

from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    provider: Optional[Literal["openai", "groq", "google", "cerebras", "mistral"]] = Field(
        default=None,
        description="Force a specific provider. Leave unset to let the gateway auto-route.",
    )
    model: Optional[str] = Field(
        default=None, description="Model name. Leave unset to use the provider's default model."
    )
    task_type: Optional[Literal["chat", "code", "fast"]] = Field(
        default="chat", description="Hints the router toward providers suited for this kind of task."
    )
    strict: bool = Field(
        default=False,
        description="If true and `provider` is set, never fall back to another provider on failure.",
    )
    use_cache: bool = Field(
        default=True,
        description="If true, identical requests within the cache TTL return instantly with no provider call.",
    )
    messages: list[ChatMessage]
    temperature: float = 0.7
    max_tokens: int = 512


class ChatResponse(BaseModel):
    provider: str
    model: str
    content: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    fallback_used: bool = Field(
        description="True if the first-choice provider failed and a backup handled the request instead."
    )
    providers_tried: list[str] = Field(
        description="Every provider attempted, in order, including the one that finally succeeded."
    )
    cache_hit: bool = Field(
        default=False, description="True if this response came from cache instead of calling a provider."
    )
    estimated_cost_usd: float = Field(
        default=0.0, description="Approximate cost of this request. Always 0 on a cache hit."
    )