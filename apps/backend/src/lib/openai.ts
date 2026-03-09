import OpenAI from "openai";

export function initializeOpenAI() {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing OPENAI_API_KEY - make sure to add it to your .env file.");
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || "https://api.openai.com/v1",
    timeout: 60_000,
  });
}

export const openai = initializeOpenAI();
