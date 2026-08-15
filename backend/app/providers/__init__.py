from app.providers.cerebras_provider import CerebrasProvider
from app.providers.google_provider import GoogleProvider
from app.providers.groq_provider import GroqProvider
from app.providers.mistral_provider import MistralProvider
from app.providers.openai_provider import OpenAIProvider

# Registry: this is the ONE place that knows about all providers.
# Phase 2 (the router) will pick a key from this dict automatically
# instead of the client having to specify "provider" manually.
PROVIDERS = {
    "openai": OpenAIProvider(),
    "groq": GroqProvider(),
    "google": GoogleProvider(),
    "cerebras": CerebrasProvider(),
    "mistral": MistralProvider(),
}