from typing import Optional

# Order matters: these are tried left-to-right until one succeeds.
# Based on what's actually been reliable on the free tier during testing -
# Groq and Mistral first, since they're confirmed working; the others
# are kept in the chain so the architecture still demonstrates full
# multi-provider fallback even if their free-tier access is inconsistent.
DEFAULT_PROVIDER_ORDER = ["groq", "mistral", "google", "cerebras", "openai"]

# Simple rule-based routing. This is intentionally NOT machine learning -
# it's an explicit, readable rulebook, which is exactly what most real
# production routers start as before anyone adds anything fancier.
TASK_PROVIDER_PREFERENCE: dict[str, list[str]] = {
    "fast": ["groq", "cerebras", "mistral", "google", "openai"],
    "code": ["mistral", "groq", "google", "cerebras", "openai"],
    "chat": DEFAULT_PROVIDER_ORDER,
}

# Used when the client doesn't specify a model - keeps the API usable
# with just {"messages": [...]} and nothing else.
DEFAULT_MODELS: dict[str, str] = {
    "groq": "llama-3.3-70b-versatile",
    "mistral": "mistral-small-latest",
    "google": "gemini-2.5-flash",
    "cerebras": "zai-glm-4.7",
    "openai": "gpt-4o-mini",
}


def get_provider_order(task_type: Optional[str]) -> list[str]:
    """Returns the provider trial order for a given task type."""
    if task_type and task_type in TASK_PROVIDER_PREFERENCE:
        return TASK_PROVIDER_PREFERENCE[task_type]
    return DEFAULT_PROVIDER_ORDER


def build_trial_order(requested_provider: Optional[str], task_type: Optional[str]) -> list[str]:
    """
    Decides the full list of providers to attempt, in order.

    - If the client asked for a specific provider, that goes first
      (respecting their choice), then the rest of the task's preference
      list fills in as fallback options.
    - If the client didn't specify one, we just use the task's preference
      list as-is.
    """
    preference = get_provider_order(task_type)

    if requested_provider:
        rest = [p for p in preference if p != requested_provider]
        return [requested_provider] + rest

    return preference

