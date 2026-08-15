# AI Gateway — Phase 1

A single, unified API that sits in front of multiple LLM providers (OpenAI, Groq).
Any app can call **one endpoint** instead of learning each provider's API separately.

This is Phase 1 of the full project: a working gateway with auth and 2 providers.
Later phases add: automatic routing, semantic caching, cost tracking dashboard,
fallback on provider failure, and guardrails.

## What this phase does

- One endpoint: `POST /v1/chat`
- Client picks the provider (`openai` or `groq`) per request
- Gateway authenticates the client with its own API key (separate from the real
  OpenAI/Groq keys, which never leave the server)
- Returns a consistent response shape regardless of which provider answered

## Project structure

```
ai-gateway/
├── app/
│   ├── main.py              # FastAPI app + /v1/chat endpoint
│   ├── auth.py               # Validates the client's gateway API key
│   ├── config.py             # Loads settings from .env
│   ├── models.py             # Request/response schemas
│   └── providers/
│       ├── base.py           # Shared interface all providers implement
│       ├── openai_provider.py
│       ├── groq_provider.py
│       └── __init__.py       # Registry of available providers
├── requirements.txt
├── .env.example
└── README.md
```

## Setup

1. Create a virtual environment and install dependencies:

   ```bash
   cd ai-gateway
   python -m venv venv
   source venv/bin/activate      # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

2. Copy `.env.example` to `.env` and fill in your real keys:

   ```bash
   cp .env.example .env
   ```

   - `OPENAI_API_KEY` — from https://platform.openai.com/api-keys
   - `GROQ_API_KEY` — from https://console.groq.com/keys (has a free tier, good for testing)
   - `GATEWAY_API_KEYS` — make up your own key(s), these are what YOUR clients use

3. Run the server:

   ```bash
   uvicorn app.main:app --reload
   ```

4. Check it's alive:

   ```bash
   curl http://localhost:8000/health
   ```

## Example request

```bash
curl -X POST http://localhost:8000/v1/chat \
  -H "Authorization: Bearer dev-key-123" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "groq",
    "model": "llama-3.3-70b-versatile",
    "messages": [
      {"role": "user", "content": "Say hello in one short sentence."}
    ]
  }'
```

Expected response:

```json
{
  "provider": "groq",
  "model": "llama-3.3-70b-versatile",
  "content": "Hello there!",
  "prompt_tokens": 12,
  "completion_tokens": 4,
  "total_tokens": 16
}
```

Try the same request with `"provider": "openai"` and `"model": "gpt-4o-mini"` —
same shape of response, different provider underneath. That's the whole point
of a gateway: the caller doesn't need to know or care which AI actually answered.

## Interactive docs

FastAPI gives you a free interactive API tester at:

```
http://localhost:8000/docs
```

## What's next (Phase 2)

- Replace the manual `"provider": "openai"` field with an automatic router
- Add fallback: if one provider fails, retry with another without the client noticing
