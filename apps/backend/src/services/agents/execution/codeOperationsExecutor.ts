/**
 * Code Operations Tool Executor
 * Implements AI-powered code generation and modification via Shared Model Manager
 */
import { completeWithDefaultModel } from '@/services/models';

export async function executeCodeOperationTool(toolName: string, params: any, userId: string): Promise<any> {
    try {
        switch (toolName) {
            case 'writeCode':
                return executeWriteCode(params, userId);
            case 'reviewCode':
                return executeReviewCode(params, userId);
            case 'refactorCode':
                return executeRefactorCode(params, userId);
            case 'debugCode':
                return executeDebugCode(params, userId);
            default:
                throw new Error(`Unknown code operation tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Code operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function completeJson(userId: string, prompt: string, source: string) {
    const { completion } = await completeWithDefaultModel({
        userId: userId || 'system',
        request: {
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
            stream: false,
        },
        usageContext: { action: 'GENERATE', metadata: { source } },
        skipEntitlement: true,
    });
    return completion.choices[0].message.content;
}

async function executeWriteCode(params: any, userId: string) {
    const prompt = `Write TypeScript/JavaScript code for: "${params.description}".
    
    Language: ${params.language || 'TypeScript'}
    Context/Existing Code: 
    ${params.existingCode ? '```\n' + params.existingCode + '\n```' : 'None provided'}
    
    Requirements:
    - Return ONLY valid code within a JSON structure.
    - If modifying existing code, return the FULL modified code or a clear patch.

    Format: JSON
    {
        "code": "The generated code...",
        "language": "${params.language || 'TypeScript'}",
        "explanation": "Brief explanation of the implementation"
    }`;

    const content = await completeJson(userId, prompt, 'codeOperationsExecutor.writeCode');
    if (!content) throw new Error("No code generated");

    try {
        return JSON.parse(content);
    } catch (e) {
        return { code: content };
    }
}

async function executeReviewCode(params: any, userId: string) {
    const prompt = `Review the following ${params.language || 'code'}:
    
    \`\`\`
    ${params.code}
    \`\`\`
    
    Context: ${params.context || 'None'}
    
    Provide a structured review focusing on:
    - Bugs / Logic Errors
    - Security Vulnerabilities
    - Performance Issues
    - Best Practices
    
    Format: JSON
    {
        "status": "PASSED" | "NEEDS_IMPROVEMENT" | "CRITICAL_ISSUES",
        "issues": [
            { "severity": "HIGH" | "MEDIUM" | "LOW", "description": "...", "line": number }
        ],
        "suggestions": ["suggestion 1", "suggestion 2"]
    }`;

    const content = await completeJson(userId, prompt, 'codeOperationsExecutor.reviewCode');
    return JSON.parse(content || '{}');
}

async function executeRefactorCode(params: any, userId: string) {
    const prompt = `Refactor the following ${params.language || 'code'}:
    
    \`\`\`
    ${params.code}
    \`\`\`
    
    Goal: ${params.goal}
    
    Return JSON:
    {
        "originalCode": "...",
        "refactoredCode": "The full refactored code...",
        "changes": ["List of changes made..."]
    }`;

    const content = await completeJson(userId, prompt, 'codeOperationsExecutor.refactorCode');
    return JSON.parse(content || '{}');
}

async function executeDebugCode(params: any, userId: string) {
    const prompt = `Debug the following code:
    
    Code:
    \`\`\`
    ${params.code}
    \`\`\`
    
    Error/Issue: ${params.error}
    Language: ${params.language || 'Unknown'}
    
    Return JSON:
    {
        "analysis": "Root cause analysis...",
        "fix": "Description of the fix...",
        "fixedCode": "The corrected code..."
    }`;

    const content = await completeJson(userId, prompt, 'codeOperationsExecutor.debugCode');
    return JSON.parse(content || '{}');
}
