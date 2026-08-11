# Platform Helpers

Relevance-style built-ins for Python/JS tool steps (`Helper("…").call(...)`, `LLM(...)`, etc.).

## Architecture

```
Sandbox (Python/JS)
  → Helper / LLM / prompt_completion / insert_temp_file / …
  → Helper bridge (localhost) OR POST /v1/internal/helpers/call
  → callPlatformHelper → registry → implementation
  → SSRF / timeout / size / retry / usage hooks
```

Code lives under `apps/backend/src/services/platformHelpers/`.

## V1 helpers

| Name | Status | Notes |
|------|--------|--------|
| `file_to_text_llm_friendly` (`file_to_text`) | Real | PDF/DOCX/TXT/CSV/HTML; Drive URL rewrite; SSRF + download cap |
| `serper_google_search` | Real | Needs `SERPER_API_KEY` |
| `firecrawl` | Real | Needs `FIRECRAWL_API_KEY`; SSRF on target URL |
| `prompt_completion` | Real | Platform OpenAI client |
| `llm` | Real | `LLM(model).chat.completions.create(...)` |
| `insert_temp_file` | Real | Supabase storage (`SUPABASE_*`, `HELPER_TEMP_BUCKET`) |
| `insert_data` / `retrieve_data` / `retrieve_all` | Not configured | Clear error until datasets product exists |
| `run_step` | Limited | Prefer sequential builder steps |
| `integration_api_call` | Not configured | OAuth vault not wired |

List at runtime: `GET /v1/platform-helpers` (JWT).

## Sandbox wiring

- **Local / Docker Python**: ephemeral `127.0.0.1` helper bridge + scoped Bearer token; Docker uses `host.docker.internal`.
- **JS (isolated-vm / Piscina)**: `_platformHelperCall` Reference → `callPlatformHelper` on the host.
- **Modal**: payload includes `helperBridgeUrl` + scoped token pointing at `HELPER_PUBLIC_BASE_URL/v1/internal/helpers/call`.

## Security

### SSRF
Outbound user URLs (`file_to_text`, `firecrawl`) go through `security/ssrf.ts`: http(s) only, DNS resolve, block loopback/private/link-local/metadata. Redirects re-validated.

### Scoped tokens
Per run: HMAC token `{ userId, runId, toolId?, exp }` (default TTL 15m). Bridge and internal API require `Authorization: Bearer <token>`. Sign with `HELPER_TOKEN_SECRET` (or `HELPER_INTERNAL_SECRET` / `JWT_SECRET`).

### Timeouts / retries / size
- Default helper timeout 30s (`HELPER_DEFAULT_TIMEOUT_MS`); per-helper overrides in registry.
- Serper/Firecrawl: up to 2 retries on 429/5xx/network.
- Downloads capped (~15MB) and text truncated (see `policy/limits.ts`).

### Usage
Billable helpers call `recordHelperUsage` → `updateAgentUsage` (LLM tokens; Serper/Firecrawl/file_to_text estimated tokens).

## Auth / API keys

Helpers prefer **user-supplied keys from tool inputs** (passed into `Helper(...).call` / `LLM(...).create` as `api_key` / `*_api_key`), then fall back to platform env (`SERPER_API_KEY`, `FIRECRAWL_API_KEY`, `OPENAI_API_KEY`).

When the AI tool builder generates a tool that uses Serper, Firecrawl, LLM, or another third-party API, it must create required inputs such as `serper_api_key`, `firecrawl_api_key`, or `openai_api_key` (UI type `api_key`) and wire them from `params` into the helper call.

## Env

| Variable | Purpose |
|----------|---------|
| `HELPER_TOKEN_SECRET` | Sign scoped tokens |
| `HELPER_PUBLIC_BASE_URL` | Public API origin for Modal → internal helpers |
| `HELPER_DEFAULT_TIMEOUT_MS` | Global timeout |
| `SERPER_API_KEY` | Optional platform fallback for Google search |
| `FIRECRAWL_API_KEY` | Optional platform fallback for scrape/crawl |
| `OPENAI_API_KEY` | Platform fallback for LLM (user may pass `openai_api_key`) |
| `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` | Temp files |
| `HELPER_TEMP_BUCKET` | Storage bucket (default `temp-files`) |

## HTTP API

```http
GET /v1/platform-helpers
Authorization: Bearer <user JWT>
```

```http
POST /v1/internal/helpers/call
Authorization: Bearer <scoped helper token>
Content-Type: application/json

{ "name": "file_to_text_llm_friendly", "args": { "file_url": "https://…" } }
```

## Adding a helper

1. Implement `helpers/myHelper.ts` returning `HelperResult`.
2. Register in `registry.ts` (name, aliases, timeout, billable, handler).
3. Call `recordHelperUsage` for billable paths.
4. Document here + SDK prompts (`python_sdk.md` / `javascript_sdk.md`).

## Example (Python tool step)

```python
extraction = Helper("file_to_text_llm_friendly").call(file_url=params["pdf_file_url"])
pdf_text = extraction["text"]
response = LLM("openai-gpt-4.1").chat.completions.create(
    messages=[{"role": "user", "content": f"Summarize: {pdf_text}"}]
)
result = {"summary": response["choices"][0]["message"]["content"]}
```
