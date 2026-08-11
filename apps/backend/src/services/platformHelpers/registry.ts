import { getDefaultHelperTimeoutMs } from './policy/timeouts';
import { fileToTextLlmFriendly } from './helpers/fileToText';
import { llmChatCompletionsCreate, promptCompletion } from './helpers/llm';
import { insertTempFile } from './helpers/tempFile';
import { serperGoogleSearch } from './helpers/serperGoogleSearch';
import { firecrawlHelper } from './helpers/firecrawl';
import { insertData, retrieveAll, retrieveData, runStep } from './helpers/datasets';
import { integrationApiCall } from './helpers/integration';
import type { HelperDefinition, ListedHelper } from './types';

const defs: HelperDefinition[] = [
  {
    name: 'file_to_text_llm_friendly',
    aliases: ['file_to_text'],
    description: 'Download a file URL and extract text/tables (PDF, DOCX, TXT, CSV, HTML).',
    argsSchema: { file_url: 'string (required)', url: 'string' },
    timeoutMs: 45_000,
    billable: true,
    handler: fileToTextLlmFriendly,
  },
  {
    name: 'serper_google_search',
    aliases: ['google_search', 'serper'],
    description: 'Google search via Serper API.',
        argsSchema: { query: 'string (required)', num: 'number', serper_api_key: 'string (user API key)', api_key: 'string' },
    timeoutMs: 20_000,
    billable: true,
    retries: 2,
    handler: serperGoogleSearch,
  },
  {
    name: 'firecrawl',
    aliases: ['firecrawl_scrape'],
    description: 'Scrape or crawl a website via Firecrawl.',
    argsSchema: { url: 'string (required)', scrape_only: 'boolean', page_limit: 'number', firecrawl_api_key: 'string (user API key)', api_key: 'string' },
    timeoutMs: 60_000,
    billable: true,
    retries: 2,
    handler: firecrawlHelper,
  },
  {
    name: 'prompt_completion',
    description: 'Run a simple LLM prompt completion.',
    argsSchema: { prompt: 'string (required)', model: 'string', openai_api_key: 'string (user API key)', api_key: 'string' },
    timeoutMs: 60_000,
    billable: true,
    handler: promptCompletion,
  },
  {
    name: 'llm',
    aliases: ['llm_chat'],
    description: 'OpenAI-style chat.completions.create via platform LLM.',
    argsSchema: { model: 'string', messages: 'array (required)', openai_api_key: 'string (user API key)', api_key: 'string' },
    timeoutMs: 90_000,
    billable: true,
    handler: llmChatCompletionsCreate,
  },
  {
    name: 'insert_temp_file',
    description: 'Upload temporary file bytes and return a public URL.',
    argsSchema: { file_path_or_bytes: 'string|bytes (required)', ext: 'string' },
    timeoutMs: 30_000,
    billable: true,
    handler: insertTempFile,
  },
  {
    name: 'insert_data',
    description: 'Insert rows into a dataset (not configured in v1).',
    argsSchema: { dataset_id: 'string', data: 'array' },
    timeoutMs: getDefaultHelperTimeoutMs(),
    billable: false,
    handler: insertData,
  },
  {
    name: 'retrieve_data',
    description: 'Retrieve dataset rows (not configured in v1).',
    argsSchema: { dataset_id: 'string', page_size: 'number' },
    timeoutMs: getDefaultHelperTimeoutMs(),
    billable: false,
    handler: retrieveData,
  },
  {
    name: 'retrieve_all',
    description: 'Retrieve all dataset rows (not configured in v1).',
    argsSchema: { dataset_id: 'string', page_size: 'number' },
    timeoutMs: getDefaultHelperTimeoutMs(),
    billable: false,
    handler: retrieveAll,
  },
  {
    name: 'run_step',
    description: 'Run another tool step by name (limited in v1).',
    argsSchema: { step_name: 'string', params: 'object' },
    timeoutMs: getDefaultHelperTimeoutMs(),
    billable: false,
    handler: async (args, ctx) => runStep({ step_name: args.step_name || args.stepId, params: args.params || args }, ctx),
  },
  {
    name: 'integration_api_call',
    aliases: ['integration'],
    description: 'OAuth Integration.api_call (not configured in v1).',
    argsSchema: { provider_name: 'string', method: 'string', url: 'string' },
    timeoutMs: getDefaultHelperTimeoutMs(),
    billable: false,
    handler: integrationApiCall,
  },
];

const byName = new Map<string, HelperDefinition>();
for (const def of defs) {
  byName.set(def.name.toLowerCase(), def);
  for (const alias of def.aliases || []) {
    byName.set(alias.toLowerCase(), def);
  }
}

export function getHelperDefinition(name: string): HelperDefinition | undefined {
  return byName.get(String(name || '').trim().toLowerCase());
}

export function listHelperDefinitions(): ListedHelper[] {
  return defs.map((d) => ({
    id: d.name,
    aliases: d.aliases || [],
    description: d.description,
    argsSchema: d.argsSchema || {},
    timeoutMs: d.timeoutMs,
    billable: d.billable,
  }));
}

export { defs as helperDefinitions };
