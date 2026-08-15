# AI Gateway — Usage Dashboard

A React dashboard that visualizes live usage and cost data from the AI Gateway
backend (Phase 3) via its `/v1/usage` and `/v1/usage/recent` endpoints.

Shows: total requests, estimated cost, cache hit rate, fallback rate, a
per-provider bar chart, and a live-updating log of recent requests.

## Setup

1. Install dependencies:

   ```bash
   cd frontend
   npm install
   ```

2. Make sure the gateway backend is running first (in a separate terminal,
   from the `ai-gateway` project folder):

   ```bash
   uvicorn app.main:app --reload
   ```

   The backend must have CORS enabled (already included in `app/main.py`
   from Phase 3) so the browser can call it from a different port.

3. Start the dashboard:

   ```bash
   npm run dev
   ```

4. Open the URL shown in the terminal (usually `http://localhost:5173`).

The dashboard defaults to connecting to `http://localhost:8000` with the API
key `dev-key-123` — both fields are editable directly in the UI if your setup
differs.

## What it shows

- **Total requests** — how many requests have gone through the gateway
- **Total cost** — estimated spend based on `app/pricing.py`'s rate table
- **Cache hit rate** — percentage of requests served instantly from cache
  (no provider call, no cost)
- **Fallback rate** — percentage of requests where the first-choice provider
  failed and a backup handled it automatically
- **Requests by provider** — bar chart breakdown
- **Recent requests** — live log, color-coded per provider, with badges for
  cached and fallback requests

Data refreshes automatically every 5 seconds.

## Build for production

```bash
npm run build
```

Outputs static files to `dist/`, which you can serve with any static host.
