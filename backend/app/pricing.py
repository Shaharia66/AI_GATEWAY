# Approximate USD per 1,000,000 tokens, for the cost-tracking demo.
# These are illustrative estimates, not guaranteed accurate - provider
# pricing changes over time. If you want exact figures for a real report,
# check each provider's official pricing page before relying on this data.
COST_PER_MILLION_TOKENS: dict[str, dict[str, float]] = {
    "groq": {"input": 0.05, "output": 0.08},
    "mistral": {"input": 0.10, "output": 0.30},
    "google": {"input": 0.10, "output": 0.40},
    "cerebras": {"input": 0.10, "output": 0.10},
    "openai": {"input": 0.15, "output": 0.60},
}


def estimate_cost_usd(provider: str, prompt_tokens: int, completion_tokens: int) -> float:
    """
    Rough cost estimate for a single request. Returns 0.0 for unknown
    providers rather than raising - cost tracking should never be the
    reason a request fails.
    """
    rates = COST_PER_MILLION_TOKENS.get(provider)
    if not rates:
        return 0.0

    input_cost = (prompt_tokens / 1_000_000) * rates["input"]
    output_cost = (completion_tokens / 1_000_000) * rates["output"]
    return round(input_cost + output_cost, 8)