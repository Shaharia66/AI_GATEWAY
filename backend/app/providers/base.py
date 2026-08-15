from abc import ABC, abstractmethod

from app.models import ChatMessage


class Provider(ABC):
    """
    Every AI provider (OpenAI, Groq, ...) implements this same interface.
    This is what makes the gateway "unified" - the rest of the app never
    needs to know which provider it's talking to, it just calls .chat().

    Adding a new provider later (Anthropic, etc.) means writing one new
    class here - nothing else in the app changes. That's the whole point
    of designing it this way.
    """

    name: str

    @abstractmethod
    async def chat(
        self,
        model: str,
        messages: list[ChatMessage],
        temperature: float,
        max_tokens: int,
    ) -> dict:
        """
        Must return a dict shaped like:
        {
            "content": str,
            "prompt_tokens": int,
            "completion_tokens": int,
            "total_tokens": int,
        }
        """
        raise NotImplementedError
