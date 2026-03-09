export interface AgentExample {
    intent: string;
    name: string;
    systemPrompt: string;
    tools: string[];
    tags: string[];
}

// In a real system, these would likely come from a vector DB (RAG)
// For now, we use a static list with keyword matching
const EXAMPLES: AgentExample[] = [
    {
        intent: "automate daily standup reports",
        name: "Standup Reporter",
        systemPrompt: "You are the Standup Reporter. Your goal is to collect daily updates from the team and compile a summary.",
        tools: ["get_channel_messages", "send_summary_email"],
        tags: ["reporting", "standup", "daily", "agile"]
    },
    {
        intent: "monitor server logs for errors",
        name: "SRE Guardian",
        systemPrompt: "You are the SRE Guardian. detailed monitoring of log streams to detect anomalies.",
        tools: ["query_logs", "send_alert_slack"],
        tags: ["monitoring", "devops", "logs", "errors"]
    },
    {
        intent: "schedule meetings and manage calendar",
        name: "Scheduler Bot",
        systemPrompt: "You are an intelligent scheduling assistant. Negotiate times and book slots.",
        tools: ["check_calendar", "create_event", "send_invite"],
        tags: ["productivity", "calendar", "scheduling"]
    },
    {
        intent: "triage customer support tickets",
        name: "Support Triager",
        systemPrompt: "Analyze incoming tickets, classify severity, and assign to the right team.",
        tools: ["read_ticket", "update_ticket_status", "assign_ticket"],
        tags: ["support", "tickets", "triage"]
    }
];

export class PromptExampleService {

    /**
     * Selects few-shot examples relevant to the user's message/intent.
     * Uses simple keyword overlapping for similarity ranking.
     */
    getRelevantExamples(userMessage: string, count: number = 2): AgentExample[] {
        const keywords = userMessage.toLowerCase().split(/\s+/).filter(w => w.length > 3);

        // Score examples based on keyword matches
        const scoredExamples = EXAMPLES.map(example => {
            let score = 0;
            // Match against tags
            example.tags.forEach(tag => {
                if (keywords.includes(tag)) score += 2;
                if (userMessage.toLowerCase().includes(tag)) score += 1;
            });
            // Match against intent text
            keywords.forEach(kw => {
                if (example.intent.includes(kw)) score += 1;
            });

            return { example, score };
        });

        // Sort by score descending and take top N
        return scoredExamples
            .sort((a, b) => b.score - a.score)
            .filter(item => item.score > 0) // Only relevant ones
            .slice(0, count)
            .map(item => item.example);
    }

    /**
     * Formats examples into a string for injection into the prompt
     */
    formatExamples(examples: AgentExample[]): string {
        if (examples.length === 0) return "";

        return `
=== SIMILAR AGENT EXAMPLES (FEW-SHOT) ===
${examples.map((ex, i) => `
Example ${i + 1}:
Intent: "${ex.intent}"
Name: "${ex.name}"
System Prompt (Snippet): "${ex.systemPrompt}"
Tools: ${ex.tools.join(', ')}
`).join('\n')}
=== END EXAMPLES ===
`;
    }
}
