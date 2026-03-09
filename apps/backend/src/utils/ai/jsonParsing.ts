/**
 * Utility to safely parse JSON from LLM responses which might be wrapped
 * in markdown code blocks, or prefixed with SSE "data: " frames.
 */
export function extractJson(content: string): any {
    if (!content) return null;

    // Strip leading SSE frame prefix ("data: ") if present.
    // This prevents the "Unexpected token 'd'" error when raw SSE output is fed here.
    let cleaned = content.trim();
    if (cleaned.startsWith('data: ')) {
        cleaned = cleaned.slice('data: '.length).trim();
    }

    // Try parsing directly first
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // If it fails, try to extract from markdown code blocks
        const jsonBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonBlockMatch && jsonBlockMatch[1]) {
            try {
                return JSON.parse(jsonBlockMatch[1].trim());
            } catch (innerError) {
                // Fall through to other attempts
            }
        }

        // Try finding the first '{' and last '}' (object)
        const objStart = cleaned.indexOf('{');
        const objEnd = cleaned.lastIndexOf('}');
        if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
            try {
                return JSON.parse(cleaned.substring(objStart, objEnd + 1));
            } catch (innerError) {
                // Fall through
            }
        }

        // Try finding the first '[' and last ']' (array)
        const arrStart = cleaned.indexOf('[');
        const arrEnd = cleaned.lastIndexOf(']');
        if (arrStart !== -1 && arrEnd !== -1 && arrEnd > arrStart) {
            // Only use array extraction if there's no object that comes before it
            if (objStart === -1 || arrStart < objStart) {
                try {
                    return JSON.parse(cleaned.substring(arrStart, arrEnd + 1));
                } catch (innerError) {
                    // Fall through
                }
            }
        }

        // Re-throw original error if all attempts fail
        throw e;
    }
}
