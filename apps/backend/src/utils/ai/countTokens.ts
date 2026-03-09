import { Tiktoken } from 'js-tiktoken/lite';
import o200k_base from 'js-tiktoken/ranks/o200k_base';

export interface TokenCount {
  inputTokens?: number;
  outputTokens?: number;
}

const initializeTokenCounter = (): Tiktoken => {
  return new Tiktoken(o200k_base);
};

export const countTokens = async (options: {
  input?: string | Record<string, any>;
  completion?: string;
  model?: string;
}): Promise<TokenCount> => {
  const { input, completion } = options;
  const result: TokenCount = {};

  try {
    const enc = initializeTokenCounter();
    if (input) {
      const inputStr = typeof input === 'object' ? JSON.stringify(input) : String(input);
      result.inputTokens = enc.encode(inputStr).length;
    }
    if (completion) {
      result.outputTokens = enc.encode(String(completion)).length;
    }
    return result;
  } catch (error) {
    console.error('Error counting tokens:', error);
    return {
      inputTokens: input ? Math.ceil((typeof input === 'object' ? JSON.stringify(input) : String(input)).length / 4) : undefined,
      outputTokens: completion ? Math.ceil(String(completion).length / 4) : undefined,
    };
  }
};

