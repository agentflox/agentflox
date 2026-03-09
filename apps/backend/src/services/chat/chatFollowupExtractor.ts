/**
 * Chat Follow-up Extractor
 * 
 * Extracts intelligent follow-up suggestions from assistant responses
 * and conversation context
 */

import type { ChatFollowup, EnrichedContext } from './types';

/**
 * Extract follow-up suggestions from response and context
 * Only generates when truly relevant
 */
export async function extractFollowups(
    response: string,
    context: EnrichedContext,
    conversationHistory: Array<{ role: string; content: string }>
): Promise<ChatFollowup[]> {
    const followups: ChatFollowup[] = [];

    // 1. Try to extract explicit follow-ups from response
    const explicitFollowups = extractFollowupsFromText(response);
    if (explicitFollowups.length > 0) {
        return explicitFollowups.slice(0, 5);
    }

    // 2. Generate contextual follow-ups based on conversation state
    const contextualFollowups = generateContextualFollowups(
        response,
        context,
        conversationHistory
    );

    return contextualFollowups.slice(0, 5);
}

/**
 * Extract follow-ups from structured markers in text
 */
function extractFollowupsFromText(text: string): ChatFollowup[] {
    const followups: ChatFollowup[] = [];

    // Look for [FOLLOWUPS: ...] marker
    const followupMatch = text.match(/\[FOLLOWUPS:\s*(.+?)\]/i);
    if (followupMatch) {
        const followupText = followupMatch[1];
        const items = followupText.split(',').map(s => s.trim()).filter(Boolean);
        items.forEach((item, index) => {
            followups.push({
                id: `followup_${index + 1}`,
                label: item,
            });
        });
        return followups;
    }

    // Look for numbered list of suggestions
    const numberedPattern = /(?:^|\n)\s*(?:[0-9]+\.|[\*\-])\s*([^\n]+)/g;
    let match;
    let count = 0;

    // Only extract if they appear near keywords like "next", "also", "might want"
    const hasFollowupKeywords = /(?:next|also|might want|could|perhaps|alternatively|additionally)/i.test(text);

    if (hasFollowupKeywords) {
        while ((match = numberedPattern.exec(text)) !== null && count < 5) {
            const option = match[1].trim();
            // Only include if it's question-like or action-like
            if (option.length <= 80 && (option.includes('?') || /^(show|view|create|update|tell|explain|how|what|when|where)/i.test(option))) {
                followups.push({
                    id: `followup_${count + 1}`,
                    label: option.replace(/[\?\.\!]+$/, ''), // Remove trailing punctuation
                });
                count++;
            }
        }
    }

    return followups;
}

/**
 * Generate contextual follow-ups based on conversation state
 */
function generateContextualFollowups(
    response: string,
    context: EnrichedContext,
    conversationHistory: Array<{ role: string; content: string }>
): ChatFollowup[] {
    const followups: ChatFollowup[] = [];

    // Don't generate if conversation is too short
    if (conversationHistory.length < 2) {
        return [];
    }

    const lastUserMessage = conversationHistory
        .filter(m => m.role === 'user')
        .pop()?.content.toLowerCase() || '';

    // Task-related follow-ups
    if (context.relevantTasks.length > 0) {
        if (lastUserMessage.includes('task') || lastUserMessage.includes('todo')) {
            if (lastUserMessage.includes('create') || lastUserMessage.includes('add')) {
                followups.push({ id: 'f1', label: 'Show all my tasks' });
                followups.push({ id: 'f2', label: 'What are my overdue tasks?' });
            } else if (lastUserMessage.includes('show') || lastUserMessage.includes('list')) {
                followups.push({ id: 'f1', label: 'Create a new task' });
                followups.push({ id: 'f2', label: 'Filter by priority' });
            } else {
                followups.push({ id: 'f1', label: 'Show pending tasks' });
                followups.push({ id: 'f2', label: 'Mark tasks as complete' });
            }
        }
    }

    // Project-related follow-ups
    if (context.relevantProjects.length > 0) {
        if (lastUserMessage.includes('project') && !lastUserMessage.includes('task')) {
            followups.push({ id: 'f3', label: 'Show project timeline' });
            followups.push({ id: 'f4', label: 'View project team' });
        }
    }

    // Team-related follow-ups
    if (context.relevantTeams.length > 0) {
        if (lastUserMessage.includes('team') || lastUserMessage.includes('member')) {
            followups.push({ id: 'f5', label: 'Show team activity' });
            followups.push({ id: 'f6', label: 'View team members' });
        }
    }

    // General helpful follow-ups if nothing specific
    if (followups.length === 0) {
        // Only add generic follow-ups if the response was substantial
        if (response.length > 100) {
            if (response.includes('help') || response.includes('assist')) {
                followups.push({ id: 'f7', label: 'Tell me more' });
            }
            if (context.relevantProjects.length > 0 || context.relevantTasks.length > 0) {
                followups.push({ id: 'f8', label: 'What else can you do?' });
            }
        }
    }

    return followups;
}
