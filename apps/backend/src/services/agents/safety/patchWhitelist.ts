/**
 * Agent Patch Whitelist
 *
 * Enforces field-level access control for LLM-generated config patches.
 * Every patch that originates from an LLM response MUST be run through
 * this module before it touches the database.
 *
 * Rules:
 *  - SAFE_FIELDS: any user/LLM may update these without extra approval.
 *  - PROTECTED_FIELDS: require explicit admin role or HITL approval.
 *  - Any key not on either list is rejected (strict allowlist policy).
 */

export class PatchSecurityError extends Error {
    constructor(
        public readonly blockedKeys: string[],
        public readonly reason: 'protected' | 'unknown',
    ) {
        super(
            `[PatchWhitelist] Patch rejected (${reason}). ` +
            `Blocked keys: ${blockedKeys.join(', ')}.`
        );
        this.name = 'PatchSecurityError';
    }
}

/** Fields any agent owner may update via LLM suggestion. */
const SAFE_FIELDS = new Set([
    'name',
    'description',
    'avatar',
    'personality',
    'capabilities',
    'constraints',
    'rules',
    'modelConfig',
]);

/**
 * Fields that require either admin role or explicit HITL approval.
 * These control identity, activation, and security-sensitive behaviour.
 */
const PROTECTED_FIELDS = new Set([
    'systemPrompt',   // changes agent behaviour at the root level
    'isActive',       // cannot auto-activate via LLM patch
    'status',         // activation lifecycle — must go through launchAgent()
    'id',             // immutable
    'agentId',        // immutable
    'userId',         // immutable — ownership must not change
    'ownerId',        // immutable
    'workspaceId',    // scope must not change via chat
    'createdAt',      // immutable
    'updatedAt',      // managed by DB
]);

export interface PatchValidationResult {
    sanitizedPatch: Record<string, unknown>;
    removedKeys: string[];
    blockedKeys: string[];
}

/**
 * Strict mode: throws `PatchSecurityError` if any protected or unknown key is present.
 * Use this path when applying LLM patches to a production agent.
 */
export function validatePatchStrict(
    patch: Record<string, unknown>,
): PatchValidationResult {
    const blockedProtected: string[] = [];
    const blockedUnknown: string[] = [];
    const sanitizedPatch: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(patch)) {
        if (PROTECTED_FIELDS.has(key)) {
            blockedProtected.push(key);
        } else if (!SAFE_FIELDS.has(key)) {
            blockedUnknown.push(key);
        } else {
            sanitizedPatch[key] = value;
        }
    }

    if (blockedProtected.length > 0) {
        throw new PatchSecurityError(blockedProtected, 'protected');
    }
    if (blockedUnknown.length > 0) {
        throw new PatchSecurityError(blockedUnknown, 'unknown');
    }

    return { sanitizedPatch, removedKeys: [], blockedKeys: [] };
}

/**
 * Lenient mode: silently drops protected and unknown keys, returns only safe keys.
 * Use this when you want to apply whatever is safe without raising an error
 * (e.g., operator suggestions where partial application is acceptable).
 */
export function validatePatchLenient(
    patch: Record<string, unknown>,
): PatchValidationResult {
    const sanitizedPatch: Record<string, unknown> = {};
    const removedKeys: string[] = [];
    const blockedKeys: string[] = [];

    for (const [key, value] of Object.entries(patch)) {
        if (PROTECTED_FIELDS.has(key)) {
            blockedKeys.push(key);
        } else if (!SAFE_FIELDS.has(key)) {
            removedKeys.push(key);
        } else {
            sanitizedPatch[key] = value;
        }
    }

    if (blockedKeys.length > 0 || removedKeys.length > 0) {
        console.warn(
            `[PatchWhitelist] Dropped keys from LLM patch — blocked(protected): [${blockedKeys.join(', ')}] ` +
            `unknown: [${removedKeys.join(', ')}]`
        );
    }

    return { sanitizedPatch, removedKeys, blockedKeys };
}
