"""
AgentFlox Modal Python runner — test endpoint for tool code execution.

Deploy:
  pip install modal
  modal setup
  modal secret create agentflox-python-runner MODAL_AUTH_TOKEN=your-long-random-secret
  modal deploy apps/backend/modal/python_runner.py

Then set in apps/backend/.env (use the URL Modal prints for `fastapi_app`):
  MODAL_PYTHON_EXEC_URL=https://<you>--agentflox-python-runner-fastapi-app.modal.run
  MODAL_AUTH_TOKEN=your-long-random-secret
  HELPER_PUBLIC_BASE_URL=https://<your-backend-public-origin>
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import traceback
import urllib.error
import urllib.request
from io import StringIO
from typing import Any

import modal

app = modal.App("agentflox-python-runner")

image = (
    modal.Image.debian_slim(python_version="3.11")
    .pip_install("fastapi[standard]")
)


def _check_auth(authorization: str | None) -> bool:
    expected = os.environ.get("MODAL_AUTH_TOKEN", "").strip()
    if not expected or not authorization:
        return False
    token = authorization.removeprefix("Bearer ").strip()
    return token == expected


def _normalize_code(code: str) -> str:
    return re.sub(r"^(\s*)return\s+(.+)$", r"\1result = \2", code, flags=re.MULTILINE)


def _run_setup(packages: list[str], runtime_commands: list[str], logs: list[str]) -> None:
    for cmd in runtime_commands:
        cmd = (cmd or "").strip()
        if not cmd:
            continue
        logs.append(f"[setup] $ {cmd}")
        completed = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=False)
        if completed.stdout:
            logs.append(completed.stdout.rstrip())
        if completed.stderr:
            logs.append(f"stderr: {completed.stderr.rstrip()}")
        if completed.returncode != 0:
            raise RuntimeError(f"Runtime command failed ({completed.returncode}): {cmd}")

    cleaned = [p.strip() for p in packages if isinstance(p, str) and p.strip()]
    if cleaned:
        logs.append(f"[setup] Installing packages: {', '.join(cleaned)}")
        completed = subprocess.run(
            [sys.executable, "-m", "pip", "install", "--no-cache-dir", *cleaned],
            capture_output=True,
            text=True,
            check=False,
        )
        if completed.stdout:
            logs.append(completed.stdout.rstrip())
        if completed.stderr:
            logs.append(f"stderr: {completed.stderr.rstrip()}")
        if completed.returncode != 0:
            raise RuntimeError(f"pip install failed: {cleaned}")


def _helper_http(name: str, args: dict[str, Any], bridge: str, token: str) -> dict[str, Any]:
    if not bridge:
        return {
            "__helper": name,
            "__input": args,
            "status": "error",
            "text": "",
            "tables": [],
            "error": "Helper bridge not configured (set HELPER_PUBLIC_BASE_URL on backend)",
        }
    payload = json.dumps({"name": name, "args": args}).encode("utf-8")
    req = urllib.request.Request(
        bridge,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=180) as resp:
            data = json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace") if e.fp else ""
        try:
            data = json.loads(body) if body else {}
        except Exception:
            data = {"status": "error", "error": body or str(e)}
        if "status" not in data:
            data = {"status": "error", "error": data.get("error") or str(e), **data}
    if not isinstance(data, dict):
        data = {"result": data}
    return data


def _build_globals(
    params: dict[str, Any],
    steps: dict[str, Any],
    helper_bridge_url: str,
    helper_bridge_token: str,
) -> dict[str, Any]:
    class _HelperResult(dict):
        def __getattr__(self, item: str) -> Any:
            try:
                return self[item]
            except KeyError as exc:
                raise AttributeError(item) from exc

    class _Helper:
        def __init__(self, name: str):
            self._name = name

        def call(self, **kwargs: Any) -> _HelperResult:
            return _HelperResult(_helper_http(self._name, kwargs, helper_bridge_url, helper_bridge_token))

    def Helper(name: str) -> _Helper:
        return _Helper(name)

    class _LLMCompletions:
        def __init__(self, model: str):
            self._model = model

        def create(self, messages: list[dict[str, Any]] | None = None, **kwargs: Any) -> dict[str, Any]:
            data = _helper_http(
                "llm",
                {"model": self._model, "messages": messages or [], **kwargs},
                helper_bridge_url,
                helper_bridge_token,
            )
            if data.get("status") == "error" and "choices" not in data:
                err = data.get("error") or "LLM failed"
                return {
                    "choices": [{"message": {"content": f"[LLM error: {err}]"}}],
                    "usage": {"total_tokens": 0},
                    "error": err,
                }
            return data

    class _LLMChat:
        def __init__(self, model: str):
            self.completions = _LLMCompletions(model)

    class _LLM:
        def __init__(self, model: str):
            self.chat = _LLMChat(model)

    def LLM(model: str = "gpt-4o-mini") -> _LLM:
        return _LLM(model)

    class Integration:
        def __init__(self, provider: str, account: Any):
            self.provider = provider
            self.account = account

        def api_call(
            self,
            method: str,
            url: str,
            body: Any = None,
            headers: Any = None,
            params: Any = None,
        ) -> dict[str, Any]:
            return _helper_http(
                "integration_api_call",
                {
                    "provider_name": self.provider,
                    "account_id": self.account,
                    "method": method,
                    "url": url,
                    "body": body,
                    "headers": headers,
                    "params": params,
                },
                helper_bridge_url,
                helper_bridge_token,
            )

    return {
        "params": params or {},
        "steps": steps or {},
        "Helper": Helper,
        "LLM": LLM,
        "Integration": Integration,
        "prompt_completion": lambda prompt, model=None: (
            lambda data: data.get("content") or data.get("answer") or data.get("error") or ""
        )(
            _helper_http(
                "prompt_completion",
                {"prompt": prompt, "model": model},
                helper_bridge_url,
                helper_bridge_token,
            )
        ),
        "run_step": lambda step_id, input_data=None, **kwargs: _helper_http(
            "run_step",
            {"step_name": step_id, "params": input_data or kwargs},
            helper_bridge_url,
            helper_bridge_token,
        ),
        "insert_data": lambda dataset_id, data: _helper_http(
            "insert_data", {"dataset_id": dataset_id, "data": data}, helper_bridge_url, helper_bridge_token
        ),
        "retrieve_data": lambda dataset_id, page_size=None, include_fields=None: _helper_http(
            "retrieve_data",
            {"dataset_id": dataset_id, "page_size": page_size, "include_fields": include_fields},
            helper_bridge_url,
            helper_bridge_token,
        ),
        "retrieve_all": lambda dataset_id, page_size=1000, include_fields=None: (
            _helper_http(
                "retrieve_all",
                {"dataset_id": dataset_id, "page_size": page_size, "include_fields": include_fields},
                helper_bridge_url,
                helper_bridge_token,
            ).get("data")
            or []
        ),
        "insert_temp_file": lambda file_path_or_bytes, ext=None: _helper_http(
            "insert_temp_file",
            {"file_path_or_bytes": file_path_or_bytes, "ext": ext},
            helper_bridge_url,
            helper_bridge_token,
        ),
        "json": json,
        "sys": sys,
    }


def execute_python_payload(payload: dict[str, Any]) -> dict[str, Any]:
    logs: list[str] = []
    code = payload.get("code") or ""
    params = payload.get("params") or {}
    steps = payload.get("steps") or {}
    advanced = payload.get("advancedSettings") or {}

    packages = payload.get("packages") or advanced.get("packages") or []
    runtime_commands = payload.get("runtimeCommands") or advanced.get("runtimeCommands") or []
    raise_error = advanced.get("raiseError") or "traceback"
    helper_bridge_url = str(payload.get("helperBridgeUrl") or os.environ.get("HELPER_BRIDGE_URL") or "").strip()
    helper_bridge_token = str(payload.get("helperBridgeToken") or os.environ.get("HELPER_BRIDGE_TOKEN") or "").strip()

    try:
        _run_setup(list(packages), list(runtime_commands), logs)

        normalized = _normalize_code(str(code))
        g = _build_globals(
            params if isinstance(params, dict) else {},
            steps if isinstance(steps, dict) else {},
            helper_bridge_url,
            helper_bridge_token,
        )
        g["result"] = None

        stdout_buf = StringIO()
        stderr_buf = StringIO()
        old_stdout, old_stderr = sys.stdout, sys.stderr
        sys.stdout, sys.stderr = stdout_buf, stderr_buf
        try:
            exec(compile(normalized, "<agentflox-user-code>", "exec"), g, g)
        finally:
            sys.stdout, sys.stderr = old_stdout, old_stderr

        out = stdout_buf.getvalue()
        err = stderr_buf.getvalue()
        if out:
            logs.append(out.rstrip())
        if err:
            logs.append(f"stderr: {err.rstrip()}")

        return {
            "success": True,
            "result": g.get("result"),
            "logs": logs,
            "error": None,
        }
    except Exception as exc:
        message = str(exc) if raise_error == "error" else traceback.format_exc()
        logs.append(f"stderr: {message}")
        return {
            "success": False,
            "result": None,
            "logs": logs,
            "error": {"type": "RUNTIME", "message": message},
        }


def _make_web_app():
    from fastapi import FastAPI, Header, HTTPException
    from fastapi.responses import JSONResponse

    api = FastAPI(title="AgentFlox Python Runner", redirect_slashes=False)

    async def execute(
        payload: dict[str, Any],
        authorization: str | None,
    ):
        if not _check_auth(authorization):
            raise HTTPException(status_code=401, detail="Unauthorized")
        return JSONResponse(execute_python_payload(payload))

    @api.post("")
    @api.post("/")
    async def root(
        payload: dict[str, Any],
        authorization: str | None = Header(default=None),
    ):
        return await execute(payload, authorization)

    @api.get("/health")
    async def health():
        return {"ok": True, "service": "agentflox-python-runner"}

    return api


@app.function(
    image=image,
    secrets=[modal.Secret.from_name("agentflox-python-runner")],
    timeout=600,
    cpu=2,
    memory=2048,
)
@modal.asgi_app()
def fastapi_app():
    return _make_web_app()
