/**
 * Input Sanitizer
 * 
 * Sanitizes user input to prevent prompt injection attacks and ensure safe processing.
 */

export class InputSanitizer {
  /**
   * Sanitize user input to prevent prompt injection attacks
   */
  sanitize(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      // Remove potential prompt injection patterns
      .replace(/```[\s\S]*?```/g, '[code block removed]')  // Remove code blocks
      .replace(/\[SYSTEM\]/gi, '')
      .replace(/\[INSTRUCTIONS\]/gi, '')
      .replace(/\[PROMPT\]/gi, '')
      .replace(/\[CONTEXT\]/gi, '')
      .replace(/ignore\s+previous\s+instructions/gi, '')
      .replace(/forget\s+everything/gi, '')
      // Limit length to prevent token exhaustion
      .slice(0, 10000)
      .trim();
  }

  /**
   * Validate input length and basic safety
   */
  validate(input: string): { valid: boolean; error?: string } {
    if (!input || typeof input !== 'string') {
      return { valid: false, error: 'Input must be a non-empty string' };
    }

    if (input.trim().length === 0) {
      return { valid: false, error: 'Input cannot be empty' };
    }

    if (input.length > 10000) {
      return { valid: false, error: 'Input exceeds maximum length of 10000 characters' };
    }

    return { valid: true };
  }
}

