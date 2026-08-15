import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    """
    Central place for all configuration.
    Everything is read from environment variables (see .env.example).
    """

    # Keys for the actual AI providers (your gateway uses these to call them)
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")
    CEREBRAS_API_KEY: str = os.getenv("CEREBRAS_API_KEY", "")
    MISTRAL_API_KEY: str = os.getenv("MISTRAL_API_KEY", "")

    # Keys YOUR gateway hands out to clients who are allowed to use it.
    # Comma separated in .env, e.g. GATEWAY_API_KEYS=key1,key2
    GATEWAY_API_KEYS: set[str] = set(
        k.strip() for k in os.getenv("GATEWAY_API_KEYS", "").split(",") if k.strip()
    )

    OPENAI_BASE_URL: str = "https://api.openai.com/v1/chat/completions"
    # Groq exposes an OpenAI-compatible endpoint, which keeps our provider code simple
    GROQ_BASE_URL: str = "https://api.groq.com/openai/v1/chat/completions"
    # Google AI Studio also exposes an OpenAI-compatible endpoint
    GOOGLE_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
    # Cerebras and Mistral are also OpenAI-compatible
    CEREBRAS_BASE_URL: str = "https://api.cerebras.ai/v1/chat/completions"
    MISTRAL_BASE_URL: str = "https://api.mistral.ai/v1/chat/completions"

    REQUEST_TIMEOUT_SECONDS: float = 30.0


settings = Settings()