import { initializeOpenAI } from '@/lib/openai';
import { supabaseAdmin } from '@/lib/supabase';

// Supported text file extensions
const TEXT_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md', '.csv', '.json', '.xml', '.html', '.log'];

// Supported file types for OpenAI Files API
const OPENAI_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];

export interface ParsedFile {
    type: 'text' | 'file';
    content?: string;
    chunks?: string[];
    embeddings?: Array<{ chunk: string; embedding: number[] }>;
    fileId?: string;
    url: string;
    filename: string;
    mimeType: string;
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(text: string, chunkSize = 1000): string[] {
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
        chunks.push(text.slice(start, start + chunkSize));
        start += chunkSize;
    }
    return chunks;
}

/**
 * Extract text from various file formats
 */
async function extractTextFromFile(fileUrl: string, filename: string, mimeType: string): Promise<string | null> {
    try {
        const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));

        // Fetch the file first
        const response = await fetch(fileUrl);
        if (!response.ok) throw new Error('Failed to fetch file');

        // For text files, return content directly
        if (['.txt', '.md', '.csv', '.json', '.xml', '.html', '.log'].includes(ext)) {
            return await response.text();
        }

        // For other file types, we'll use OpenAI Files API
        return null;
    } catch (error) {
        console.error('Error extracting text from file:', error);
        return null;
    }
}

/**
 * Create embeddings for text chunks
 */
async function createEmbeddings(chunks: string[]): Promise<Array<{ chunk: string; embedding: number[] }>> {
    const openai = initializeOpenAI();

    const embeddings = await Promise.all(
        chunks.map(async (chunk) => {
            const res = await openai.embeddings.create({
                model: 'text-embedding-3-small',
                input: chunk,
            });
            return {
                chunk,
                embedding: res.data[0].embedding,
            };
        })
    );

    return embeddings;
}

/**
 * Upload file to Supabase storage
 */
async function uploadToSupabase(file: Buffer, filename: string, mimeType: string, userId: string, conversationId: string): Promise<string> {
    const fileExt = filename.substring(filename.lastIndexOf('.'));
    const fileName = `${userId}/${conversationId}/${Date.now()}${fileExt}`;

    const { data, error } = await supabaseAdmin.storage
        .from('chat-attachments')
        .upload(fileName, file, {
            contentType: mimeType,
            upsert: false,
        });

    if (error) throw error;

    const { data: { publicUrl } } = supabaseAdmin.storage
        .from('chat-attachments')
        .getPublicUrl(fileName);

    return publicUrl;
}

/**
 * Parse and process uploaded file
 */
export async function parseFile(
    file: Buffer,
    filename: string,
    mimeType: string,
    userId: string,
    conversationId: string
): Promise<ParsedFile> {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    const isTextFile = TEXT_FILE_EXTENSIONS.includes(ext);
    const isOpenAIFile = OPENAI_FILE_EXTENSIONS.includes(ext);

    // Upload to Supabase
    const url = await uploadToSupabase(file, filename, mimeType, userId, conversationId);

    const parsedFile: ParsedFile = {
        type: isTextFile ? 'text' : 'file',
        url,
        filename: filename,
        mimeType: mimeType,
    };

    // Try to parse text files
    if (isTextFile) {
        const extractedText = await extractTextFromFile(url, filename, mimeType);

        if (extractedText) {
            const textChunks = chunkText(extractedText);
            const embeddings = await createEmbeddings(textChunks);

            parsedFile.content = extractedText;
            parsedFile.chunks = textChunks;
            parsedFile.embeddings = embeddings;
        } else {
            // Fallback to OpenAI Files API if parsing fails
            parsedFile.type = 'file';
        }
    }

    // Use OpenAI Files API for non-text files or if text parsing failed
    if (parsedFile.type === 'file' || (isOpenAIFile && !parsedFile.content)) {
        const openai = initializeOpenAI();
        const uint8Array = new Uint8Array(file);
        const blob = new Blob([uint8Array], { type: mimeType });
        const uploaded = await openai.files.create({
            file: blob as any,
            purpose: 'assistants',
        });

        parsedFile.fileId = uploaded.id;
    }

    return parsedFile;
}
