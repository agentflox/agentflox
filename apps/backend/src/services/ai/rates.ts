// Prices in USD per 1 Million Tokens
export const MODEL_RATES: Record<string, { input: number; output: number }> = {
    // OpenAI
    'gpt-4o': { input: 2.50, output: 10.00 },
    'gpt-4o-2024-05-13': { input: 5.00, output: 15.00 },
    'gpt-4o-mini': { input: 0.15, output: 0.60 },
    'gpt-4-turbo': { input: 10.00, output: 30.00 },
    'gpt-3.5-turbo': { input: 0.50, output: 1.50 },

    // Anthropic
    'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
    'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
    'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
    'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },

    // Google
    'gemini-1.5-flash': { input: 0.075, output: 0.30 }, // Up to 128k context prices
    'gemini-1.5-pro': { input: 1.25, output: 5.00 },
};

export const DEFAULT_RATE = { input: 5.00, output: 15.00 }; // Fallback
