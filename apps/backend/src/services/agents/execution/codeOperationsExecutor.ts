/**
 * Code Operations Tool Executor
 * Implements AI-powered code generation and modification using OpenAI
 */
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';

export async function executeCodeOperationTool(toolName: string, params: any, userId: string): Promise<any> {
    try {
        const model = await fetchModel();

        switch (toolName) {
            case 'writeCode':
                return executeWriteCode(params, model);
            case 'reviewCode':
                return executeReviewCode(params, model);
            case 'refactorCode':
                return executeRefactorCode(params, model);
            case 'debugCode':
                return executeDebugCode(params, model);
            default:
                throw new Error(`Unknown code operation tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Code operation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function executeWriteCode(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2, // Low temperature for code
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No code generated");

    try {
        return JSON.parse(content);
    } catch (e) {
        return { code: content };
    }
}

async function executeReviewCode(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content || '{}');
}

async function executeRefactorCode(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content || '{}');
}

async function executeDebugCode(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.2,
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content || '{}');
}
