/**
 * Content Creation Tool Executor
 * Implements AI-powered content generation using OpenAI
 */
import { openai } from '@/lib/openai';
import { fetchModel } from '@/utils/ai/fetchModel';
import { prisma } from '@/lib/prisma';

export async function executeContentCreationTool(toolName: string, params: any, userId: string, workspaceId?: string): Promise<any> {
    try {
        const model = await fetchModel();

        switch (toolName) {
            case 'generateBlogPost':
                return executeGenerateBlogPost(params, model, userId, workspaceId);
            case 'writeScript':
                return executeWriteScript(params, model, userId, workspaceId);
            case 'createDocumentation':
                return executeCreateDocumentation(params, model, userId, workspaceId);
            default:
                throw new Error(`Unknown content creation tool: ${toolName}`);
        }
    } catch (error) {
        throw new Error(`Content creation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
}

async function executeGenerateBlogPost(params: any, model: any, userId: string, workspaceId?: string) {
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

    let generatedData;
    try {
        generatedData = JSON.parse(content);
    } catch (e) {
        generatedData = { title: params.topic, content };
    }

    // Save to database
    const document = await prisma.document.create({
        data: {
            title: generatedData.title || params.topic,
            content: generatedData.content || content,
            workspace: { connect: { id: workspaceId || params.workspaceId } },
            creator: { connect: { id: userId } },
            icon: '📝',
            isPublished: false,
            version: 1,
        },
    });

    return {
        ...generatedData,
        documentId: document.id,
        savedAt: document.createdAt,
    };
}

async function executeWriteScript(params: any, model: any, userId: string, workspaceId?: string) {
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

    const generatedData = JSON.parse(content);

    // Save to database
    const document = await prisma.document.create({
        data: {
            title: generatedData.title || `${params.topic} - ${params.format || 'VIDEO'} Script`,
            content: generatedData.script || content,
            workspace: { connect: { id: workspaceId || params.workspaceId } },
            creator: { connect: { id: userId } },
            icon: '🎬',
            isPublished: false,
            version: 1,
        },
    });

    return {
        ...generatedData,
        documentId: document.id,
        savedAt: document.createdAt,
    };
}

async function executeCreateDocumentation(params: any, model: any, userId: string, workspaceId?: string) {
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
        temperature: 0.3, // Lower temperature for technical docs
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No documentation generated");

    const generatedData = JSON.parse(content);

    // Determine icon based on documentation type
    const iconMap: Record<string, string> = {
        'USER_GUIDE': '📖',
        'API_REFERENCE': '🔌',
        'TECHNICAL_SPEC': '📋',
        'README': '📄',
    };
    const icon = iconMap[params.type] || '📚';

    // Save to database
    const document = await prisma.document.create({
        data: {
            title: `${params.subject} - ${params.type || 'Documentation'}`,
            content: generatedData.content || content,
            workspace: { connect: { id: workspaceId || params.workspaceId } },
            creator: { connect: { id: userId } },
            icon,
            isPublished: false,
            version: 1,
        },
    });

    return {
        ...generatedData,
        documentId: document.id,
        savedAt: document.createdAt,
    };
}

