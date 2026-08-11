/**
 * Content Creation Tool Executor
 * Implements AI-powered content generation via Shared Model Manager
 */
import { completeWithDefaultModel } from '@/services/models';

export async function executeContentCreationTool(toolName: string, params: any, userId: string, workspaceId?: string): Promise<any> {
    try {
        switch (toolName) {
            case 'generateBlogPost':
                return executeGenerateBlogPost(params, userId);
            case 'writeScript':
                return executeWriteScript(params, userId);
            case 'createDocumentation':
                return executeCreateDocumentation(params, userId);
            default:
                throw new Error(`Unknown content creation tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Content creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function completeJson(userId: string, prompt: string, temperature: number, source: string) {
    const { completion } = await completeWithDefaultModel({
        userId: userId || 'system',
        request: {
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature,
            stream: false,
        },
        usageContext: { action: 'GENERATE', metadata: { source } },
        skipEntitlement: true,
    });
    return completion.choices[0].message.content;
}

async function executeGenerateBlogPost(params: any, userId: string) {
    const prompt = `Write a comprehensive blog post about "${params.topic}".
    
    Requirements:
    - Keywords: ${params.keywords?.join(', ') || 'None specified'}
    - Tone: ${params.tone || 'Professional yet engaging'}
    - Target Audience: ${params.targetAudience || 'General audience'}
    - Word Count: Approximately ${params.wordCount || 800} words

    Format the output as a JSON object with the following structure:
    {
        "title": "The Title",
        "content": "The full blog post content in Markdown format...",
        "status": "DRAFT",
        "metadata": {
            "keywords": ["..."],
            "readingTime": "X min"
        }
    }`;

    const content = await completeJson(userId, prompt, 0.7, 'contentCreationExecutor.generateBlogPost');
    if (!content) throw new Error("No content generated");

    try {
        return JSON.parse(content);
    } catch {
        return { title: params.topic, content };
    }
}

async function executeWriteScript(params: any, userId: string) {
    const prompt = `Write a ${params.format || 'VIDEO'} script about "${params.topic}".
    
    Requirements:
    - Duration: ${params.duration || 'Not specified'}
    - Key Points: 
    ${params.keyPoints?.map((p: string) => `- ${p}`).join('\n') || '- Cover main aspects'}

    Format:
    - Use standard script format (e.g. SCENE BEGIN, SPEAKERS).
    
    Return as JSON:
    {
        "title": "Script Title",
        "format": "${params.format}",
        "script": "Full script content..."
    }`;

    const content = await completeJson(userId, prompt, 0.7, 'contentCreationExecutor.writeScript');
    if (!content) throw new Error("No script generated");

    return JSON.parse(content);
}

async function executeCreateDocumentation(params: any, userId: string) {
    const prompt = `Create ${params.type || 'TECHNICAL'} documentation for: "${params.subject}".
    
    Details/Code to Document:
    ${params.details || 'No specific details provided.'}

    Requirements:
    - Structure: Organized with clear headings (Markdown).
    - Tone: Technical and precise.
    
    Return as JSON:
    {
        "subject": "${params.subject}",
        "type": "${params.type}",
        "content": "Documentation content in Markdown..."
    }`;

    const content = await completeJson(userId, prompt, 0.3, 'contentCreationExecutor.createDocumentation');
    if (!content) throw new Error("No documentation generated");

    return JSON.parse(content);
}
