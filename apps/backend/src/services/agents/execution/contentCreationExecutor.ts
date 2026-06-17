/**
 * Content Creation Tool Executor
 * Implements AI-powered content generation using OpenAI
 */
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';

export async function executeContentCreationTool(toolName: string, params: any, userId: string, workspaceId?: string): Promise<any> {
    try {
        const model = await fetchModel();

        switch (toolName) {
            case 'generateBlogPost':
                return executeGenerateBlogPost(params, model);
            case 'writeScript':
                return executeWriteScript(params, model);
            case 'createDocumentation':
                return executeCreateDocumentation(params, model);
            default:
                throw new Error(`Unknown content creation tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Content creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function executeGenerateBlogPost(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    try {
        return JSON.parse(content);
    } catch {
        return { title: params.topic, content };
    }
}

async function executeWriteScript(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No script generated");

    return JSON.parse(content);
}

async function executeCreateDocumentation(params: any, model: any) {
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

    const completion = await openai.chat.completions.create({
        model: model.name,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.3,
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No documentation generated");

    return JSON.parse(content);
}
