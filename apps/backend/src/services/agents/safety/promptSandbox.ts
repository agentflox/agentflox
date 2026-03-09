/**
 * Prompt Sandbox
 * 
 * Sanitizes and validates generated prompts before saving to prevent
 * dangerous instructions from being executed.
 */

import { SafetyEvaluator, SafetyResult } from './safetyEvaluator';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  sanitized?: string;
}

export class PromptSandbox {
  private safetyEvaluator: SafetyEvaluator;

  constructor() {
    this.safetyEvaluator = new SafetyEvaluator();
  }

  /**
   * Sanitize prompt by removing potentially dangerous instructions
   */
  async sanitizePrompt(prompt: string): Promise<string> {
    if (!prompt || typeof prompt !== 'string') {
      return '';
    }

    let sanitized = prompt;

    // Remove system-level commands
    sanitized = sanitized.replace(/\[SYSTEM:.*?\]/gi, '');
    sanitized = sanitized.replace(/<system>.*?<\/system>/gi, '');
    sanitized = sanitized.replace(/```system[\s\S]*?```/gi, '');

    // Remove file system access instructions
    sanitized = sanitized.replace(/access\s+file\s+system/gi, '');
    sanitized = sanitized.replace(/read\s+file\s+system/gi, '');
    sanitized = sanitized.replace(/write\s+to\s+file\s+system/gi, '');
    sanitized = sanitized.replace(/execute\s+file/gi, '');
    sanitized = sanitized.replace(/rm\s+-rf/gi, '');
    sanitized = sanitized.replace(/format\s+disk/gi, '');
    sanitized = sanitized.replace(/drop\s+table/gi, '');
    sanitized = sanitized.replace(/delete\s+from\s+.*\s+where\s+1\s*=\s*1/gi, '');

    // Remove network access instructions
    sanitized = sanitized.replace(/connect\s+to\s+external/gi, '');
    sanitized = sanitized.replace(/bypass\s+firewall/gi, '');
    sanitized = sanitized.replace(/access\s+unauthorized\s+network/gi, '');

    // Remove privilege escalation attempts
    sanitized = sanitized.replace(/sudo\s+/gi, '');
    sanitized = sanitized.replace(/run\s+as\s+root/gi, '');
    sanitized = sanitized.replace(/elevate\s+privileges/gi, '');
    sanitized = sanitized.replace(/bypass\s+permissions/gi, '');

    // Remove code execution attempts
    sanitized = sanitized.replace(/execute\s+arbitrary\s+code/gi, '');
    sanitized = sanitized.replace(/eval\s*\(/gi, '');
    sanitized = sanitized.replace(/exec\s*\(/gi, '');
    sanitized = sanitized.replace(/Function\s*\(/gi, '');

    // Remove dangerous shell commands
    const dangerousCommands = [
      'rm -rf',
      'format',
      'del /f /s /q',
      'rd /s /q',
      'shutdown',
      'reboot',
      'killall',
      'pkill',
      'kill -9',
    ];

    for (const cmd of dangerousCommands) {
      const regex = new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      sanitized = sanitized.replace(regex, '[command removed]');
    }

    // Remove prompt injection patterns
    sanitized = sanitized.replace(/ignore\s+previous\s+instructions/gi, '');
    sanitized = sanitized.replace(/forget\s+everything/gi, '');
    sanitized = sanitized.replace(/new\s+instructions:/gi, '');
    sanitized = sanitized.replace(/override\s+system/gi, '');

    // Clean up multiple spaces
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Validate prompt against safety rules
   */
  async validatePrompt(prompt: string, options?: { isSystemPrompt?: boolean }): Promise<ValidationResult> {
    if (!prompt || typeof prompt !== 'string') {
      return {
        valid: false,
        errors: ['Prompt is empty or invalid'],
      };
    }

    // First sanitize
    const sanitized = await this.sanitizePrompt(prompt);

    // Then evaluate safety
    const safetyResult: SafetyResult = await this.safetyEvaluator.evaluatePrompt(
      sanitized,
      options
    );

    if (!safetyResult.safe) {
      return {
        valid: false,
        errors: safetyResult.violations,
        sanitized,
      };
    }

    return {
      valid: true,
      errors: [],
      sanitized,
    };
  }

  /**
   * Check if prompt contains dangerous patterns
   */
  containsDangerousPatterns(prompt: string): boolean {
    if (!prompt) {
      return false;
    }

    const dangerousPatterns = [
      /\[SYSTEM:.*?\]/gi,
      /<system>.*?<\/system>/gi,
      /rm\s+-rf/gi,
      /format\s+disk/gi,
      /drop\s+table/gi,
      /sudo\s+/gi,
      /execute\s+arbitrary\s+code/gi,
      /bypass\s+security/gi,
      /ignore\s+previous\s+instructions/gi,
    ];

    return dangerousPatterns.some(pattern => pattern.test(prompt));
  }
}

