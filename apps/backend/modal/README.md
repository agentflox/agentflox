# AgentFlox Modal Python Runner (test)

Minimal Modal endpoint used by `CodeExecutor.executePythonModal`.

## 1. Install + login

```bash
pip install modal
modal setup
```

## 2. Create auth secret

Pick any long random token (same value goes in backend `.env`):

```bash
# PowerShell
$token = -join ((1..48) | ForEach-Object { '{0:x}' -f (Get-Random -Max 16) })
echo $token
modal secret create agentflox-python-runner MODAL_AUTH_TOKEN=$token
```

```bash
# bash
token=$(openssl rand -hex 24)
echo "$token"
modal secret create agentflox-python-runner MODAL_AUTH_TOKEN="$token"
```

If the secret already exists:

```bash
modal secret create agentflox-python-runner MODAL_AUTH_TOKEN="$token" --force
```

## 3. Deploy

From the repo root:

```bash
modal deploy apps/backend/modal/python_runner.py
```

Modal prints a URL like:

```text
https://<your-username>--agentflox-python-runner-fastapi-app.modal.run
```

## 4. Backend env

Add to `apps/backend/.env`:

```env
MODAL_PYTHON_EXEC_URL=https://<your-username>--agentflox-python-runner-fastapi-app.modal.run
MODAL_AUTH_TOKEN=<same-token-as-secret>
```

Restart the backend.

## 5. Test in the UI

1. Open a tool → **View code** → **Advanced**
2. Set backend to **modal**
3. **Save changes**
4. **Run tool**

## Quick curl check

```bash
curl -X POST "$MODAL_PYTHON_EXEC_URL/" \
  -H "Authorization: Bearer $MODAL_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"code\":\"result = {'ok': True, 'n': params.get('n', 1)}\",\"params\":{\"n\":3},\"steps\":{},\"packages\":[],\"runtimeCommands\":[]}"
```

Expected shape:

```json
{
  "success": true,
  "result": { "ok": true, "n": 3 },
  "logs": [],
  "error": null
}
```

## Notes

- `Helper` / `LLM` are stubs (same idea as local Docker runner) — good for execution plumbing tests, not live integrations.
- Packages listed in Advanced are installed per request via `pip` (slower, fine for testing).
- GPU / custom Modal resource sizing is not wired yet; defaults are 2 CPU / 2GB / 600s timeout.
