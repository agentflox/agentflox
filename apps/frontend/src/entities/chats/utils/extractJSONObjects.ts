export const extractJSONObjects = (text: string): Record<string, any>[] => {
  const result: Record<string, any>[] = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      try {
        const jsonStr = line.slice(6);
        const parsed = JSON.parse(jsonStr);
        if (parsed && typeof parsed === 'object') {
          result.push(parsed);
        }
      } catch (e) {
        // Skip invalid JSON
      }
    }
  }
  return result;
};
