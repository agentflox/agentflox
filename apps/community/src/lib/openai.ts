"use server"
import OpenAI from "openai";

type ProxyConfig = {
  host: string
  port: string
}

const PROXY_CONFIG: ProxyConfig | null =
  process.env.PROXY_HOST && process.env.PROXY_PORT
    ? {
        host: process.env.PROXY_HOST,
        port: process.env.PROXY_PORT,
      }
    : null;

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const customFetch: typeof fetch = async (input, init) => {
  const baseRequest = new Request(input, init);

  let url = baseRequest.url;
  if (PROXY_CONFIG) {
    const proxyUrl = `http://${PROXY_CONFIG.host}:${PROXY_CONFIG.port}`;
    url = `${proxyUrl}/${url.replace(/^https?:\/\//, "")}`;
  }

  const proxiedRequest = new Request(url, baseRequest);

  if (!proxiedRequest.headers.has("User-Agent")) {
    proxiedRequest.headers.set("User-Agent", DEFAULT_USER_AGENT);
  }

  return fetch(proxiedRequest);
};

function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY - make sure to add it to your .env file.");
  }

  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: 60_000,
    fetch: customFetch,
  });
}

export { initializeOpenAI, customFetch };
