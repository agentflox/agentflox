/**
 * JS sandbox SDK.
 *
 * When `_platformHelperCall(name, args)` is injected (isolated-vm Reference),
 * Helper/LLM hit the real registry. Otherwise falls back to HTTP bridge env
 * (HELPER_BRIDGE_URL / HELPER_BRIDGE_TOKEN) via sync XMLHttpRequest when available,
 * else returns a clear not-configured error object.
 */
export function buildJsSdkPreamble(opts?: { asyncAwait?: boolean }): string {
  const asyncMode = opts?.asyncAwait !== false;
  return `
const __helperCall = (name, args) => {
  if (typeof _platformHelperCall !== 'undefined' && _platformHelperCall) {
    return _platformHelperCall(name, args || {});
  }
  const bridge = (typeof process !== 'undefined' && process.env && process.env.HELPER_BRIDGE_URL) || '';
  const token = (typeof process !== 'undefined' && process.env && process.env.HELPER_BRIDGE_TOKEN) || '';
  if (!bridge) {
    return { __helper: name, __input: args, status: 'error', error: 'Helper bridge not configured', text: '', tables: [] };
  }
  if (typeof globalThis.__helperFetch === 'function') {
    return globalThis.__helperFetch(name, args);
  }
  return { __helper: name, __input: args, status: 'error', error: 'Helper transport unavailable in this sandbox', text: '', tables: [] };
};

function Helper(name) {
  return {
    ${asyncMode ? 'async ' : ''}call(kwargs = {}) {
      return __helperCall(name, kwargs || {});
    }
  };
}

class _LLMCompletions {
  constructor(model) { this._model = model; }
  ${asyncMode ? 'async ' : ''}create({ messages = [], ...rest } = {}) {
    const data = ${asyncMode ? 'await ' : ''}__helperCall('llm', { model: this._model, messages, ...rest });
    if (data && data.status === 'error' && !data.choices) {
      const err = data.error || 'LLM failed';
      return { choices: [{ message: { content: '[LLM error: ' + err + ']' } }], usage: { total_tokens: 0 }, error: err };
    }
    return data;
  }
}
class _LLMChat { constructor(model) { this.completions = new _LLMCompletions(model); } }
function LLM(model = 'gpt-4o-mini') { return { chat: new _LLMChat(model) }; }

const prompt_completion = ${asyncMode ? 'async ' : ''}(prompt, model) => {
  const data = ${asyncMode ? 'await ' : ''}__helperCall('prompt_completion', { prompt, model });
  return (data && (data.content || data.answer || data.error)) || '';
};
const run_step = ${asyncMode ? 'async ' : ''}(stepId, input) => __helperCall('run_step', { step_name: stepId, params: input });
const insert_data = ${asyncMode ? 'async ' : ''}(dataset_id, data) => __helperCall('insert_data', { dataset_id, data });
const retrieve_data = ${asyncMode ? 'async ' : ''}(dataset_id, page_size, include_fields) => __helperCall('retrieve_data', { dataset_id, page_size, include_fields });
const retrieve_all = ${asyncMode ? 'async ' : ''}(dataset_id, page_size, include_fields) => {
  const data = ${asyncMode ? 'await ' : ''}__helperCall('retrieve_all', { dataset_id, page_size, include_fields });
  return (data && data.data) || data || [];
};
const insert_temp_file = ${asyncMode ? 'async ' : ''}(file_path_or_bytes, ext) => __helperCall('insert_temp_file', { file_path_or_bytes, ext });

class Integration {
  constructor(provider, account) { this.provider = provider; this.account = account; }
  ${asyncMode ? 'async ' : ''}api_call(method, url, body, headers, params) {
    return __helperCall('integration_api_call', {
      provider_name: this.provider, account_id: this.account, method, url, body, headers, params,
    });
  }
}
`.trim();
}
