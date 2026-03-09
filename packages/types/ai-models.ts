export type ModelOption =
  | 'gpt-4'
  | 'gpt-4o'
  | 'gpt-4o-2024-05-13'
  | 'gpt-4o-mini'
  | 'gpt-4o-mini-2024-07-18'
  | 'gpt-4'
  | 'gpt-4-32k'
  | 'gpt-4-1106-preview'
  | 'gpt-4-0125-preview'
  | 'gpt-4-turbo'
  | 'gpt-4-turbo-2024-04-09'
  | 'gpt-3.5-turbo'
  | 'gpt-3.5-turbo-16k'
  | 'gpt-3.5-turbo-1106'
  | 'gpt-3.5-turbo-0125'
  | 'gemini-1.0-pro'
  | 'gemini-1.5-pro'
  | 'gemini-1.5-flash'
  | 'claude-3.5-sonnet-20240620'
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  | 'dall-e-3';

export type NormalizedModelOption =
  | 'gpt_4'
  | 'gpt_4o'
  | 'gpt_4o_2024_05_13'
  | 'gpt_4o_mini'
  | 'gpt_4o_mini_2024_07_18'
  | 'gpt_4'
  | 'gpt_4_32k'
  | 'gpt_4_1106_preview'
  | 'gpt_4_0125_preview'
  | 'gpt_4_turbo'
  | 'gpt_4_turbo_2024_04_09'
  | 'gpt_3_5_turbo'
  | 'gpt_3_5_turbo_16k'
  | 'gpt_3_5_turbo_1106'
  | 'gpt_3_5_turbo_0125'
  | 'gemini_1_0_pro'
  | 'gemini_1_5_pro'
  | 'gemini_1_5_flash'
  | 'claude_3_5_sonnet_20240620'
  | 'claude_3_opus_20240229'
  | 'claude_3_sonnet_20240229'
  | 'claude_3_haiku_20240307'
  | 'dall_e_3';

export const modelMapping: Record<NormalizedModelOption, ModelOption> = {
  gpt_4: 'gpt-4',
  gpt_4o: 'gpt-4o',
  gpt_4o_2024_05_13: 'gpt-4o-2024-05-13',
  gpt_4o_mini: 'gpt-4o-mini',
  gpt_4o_mini_2024_07_18: 'gpt-4o-mini-2024-07-18',
  gpt_4_32k: 'gpt-4-32k',
  gpt_4_1106_preview: 'gpt-4-1106-preview',
  gpt_4_0125_preview: 'gpt-4-0125-preview',
  gpt_4_turbo: 'gpt-4-turbo',
  gpt_4_turbo_2024_04_09: 'gpt-4-turbo-2024-04-09',
  gpt_3_5_turbo: 'gpt-3.5-turbo',
  gpt_3_5_turbo_16k: 'gpt-3.5-turbo-16k',
  gpt_3_5_turbo_1106: 'gpt-3.5-turbo-1106',
  gpt_3_5_turbo_0125: 'gpt-3.5-turbo-0125',
  gemini_1_0_pro: 'gemini-1.0-pro',
  gemini_1_5_pro: 'gemini-1.5-pro',
  gemini_1_5_flash: 'gemini-1.5-flash',
  claude_3_5_sonnet_20240620: 'claude-3.5-sonnet-20240620',
  claude_3_opus_20240229: 'claude-3-opus-20240229',
  claude_3_sonnet_20240229: 'claude-3-sonnet-20240229',
  claude_3_haiku_20240307: 'claude-3-haiku-20240307',
  dall_e_3: 'dall-e-3',
};

export type Command = 'REWRITE' | 'SEOMULTIPLE' | 'SEOSINGLE';