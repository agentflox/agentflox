import { initializeOpenAI } from '@/lib/openai'
import { supabaseAdmin } from '@/lib/supabase/client'

// Supported text file extensions
const TEXT_FILE_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.txt', '.md', '.csv', '.json', '.xml', '.html', '.log']

// Supported file types for OpenAI Files API
const OPENAI_FILE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm']

export interface ParsedFile {
  type: 'text' | 'file'
  content?: string
  chunks?: string[]
  embeddings?: Array<{ chunk: string; embedding: number[] }>
  fileId?: string
  url: string
  filename: string
  mimeType: string
}

/**
 * Chunk text into smaller pieces
 */
export function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks: string[] = []
  let start = 0
  while (start < text.length) {
    chunks.push(text.slice(start, start + chunkSize))
    start += chunkSize
  }
  return chunks
}

/**
 * Extract text from various file formats
 */
async function extractTextFromFile(fileUrl: string, filename: string, mimeType: string): Promise<string | null> {
  try {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'))
    
    // Fetch the file first
    const response = await fetch(fileUrl)
    if (!response.ok) throw new Error('Failed to fetch file')
    
    // For text files, return content directly
    if (['.txt', '.md', '.csv', '.json', '.xml', '.html', '.log'].includes(ext)) {
      return await response.text()
    }

    // For PDF files
    if (ext === '.pdf') {
      try {
        // Use pdf-parse for server-side PDF parsing (Node.js runtime only)
        // Note: Buffer is not available in Edge runtime, so this requires Node.js runtime
        const pdfParseModule = await import('pdf-parse')
        const parsePdf: (data: Buffer) => Promise<{ text: string }> =
          (pdfParseModule as { default?: (data: Buffer) => Promise<{ text: string }> }).default ??
          (pdfParseModule as unknown as (data: Buffer) => Promise<{ text: string }>)
        const arrayBuffer = await response.arrayBuffer()
        
        // Convert ArrayBuffer to Buffer (Node.js only)
        // In Edge runtime, dynamically import the Buffer polyfill
        let buffer: Buffer
        if (typeof Buffer !== 'undefined') {
          buffer = Buffer.from(arrayBuffer)
        } else {
          const { Buffer: PolyfillBuffer } = await import('buffer')
          const uint8Array = new Uint8Array(arrayBuffer)
          buffer = PolyfillBuffer.from(uint8Array)
        }
        
        const data = await parsePdf(buffer)
        return data.text
      } catch (error) {
        console.warn('Failed to parse PDF with pdf-parse, falling back to OpenAI Files API:', error)
        return null
      }
    }

    // For DOCX files
    if (ext === '.docx') {
      try {
        const mammoth = await import('mammoth')
        const arrayBuffer = await response.arrayBuffer()
        const result = await mammoth.extractRawText({ arrayBuffer })
        return result.value
      } catch (error) {
        console.warn('Failed to parse DOCX with mammoth, falling back to OpenAI Files API:', error)
        return null
      }
    }

    // For DOC files (older format - limited support)
    if (ext === '.doc') {
      // DOC format is binary and harder to parse, would need specialized library
      // For now, fall back to OpenAI Files API
      console.warn('DOC format not fully supported, using OpenAI Files API')
      return null
    }

    // For Excel files (XLS, XLSX)
    if (['.xls', '.xlsx'].includes(ext)) {
      try {
        const XLSX = await import('xlsx')
        const arrayBuffer = await response.arrayBuffer()
        const workbook = XLSX.read(arrayBuffer, { type: 'array' })
        const textParts: string[] = []
        
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName]
          const sheetData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          const sheetText = sheetData
            .map((row: any) => Array.isArray(row) ? row.join('\t') : String(row))
            .join('\n')
          textParts.push(`Sheet: ${sheetName}\n${sheetText}`)
        })
        
        return textParts.join('\n\n')
      } catch (error) {
        console.warn('Failed to parse Excel file with xlsx, falling back to OpenAI Files API:', error)
        return null
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting text from file:', error)
    return null
  }
}

/**
 * Create embeddings for text chunks
 */
async function createEmbeddings(chunks: string[]): Promise<Array<{ chunk: string; embedding: number[] }>> {
  const openai = initializeOpenAI()
  
  const embeddings = await Promise.all(
    chunks.map(async (chunk) => {
      const res = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: chunk,
      })
      return {
        chunk,
        embedding: res.data[0].embedding,
      }
    })
  )

  return embeddings
}

/**
 * Upload file to Supabase storage
 */
async function uploadToSupabase(file: File, userId: string, conversationId: string): Promise<string> {
  const fileExt = file.name.substring(file.name.lastIndexOf('.'))
  const fileName = `${userId}/${conversationId}/${Date.now()}${fileExt}`
  
  const { data, error } = await supabaseAdmin.storage
    .from('chat-attachments')
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    })

  if (error) throw error

  const { data: { publicUrl } } = supabaseAdmin.storage
    .from('chat-attachments')
    .getPublicUrl(fileName)

  return publicUrl
}

/**
 * Parse and process uploaded file
 */
export async function parseFile(
  file: File,
  userId: string,
  conversationId: string
): Promise<ParsedFile> {
  const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
  const isTextFile = TEXT_FILE_EXTENSIONS.includes(ext)
  const isOpenAIFile = OPENAI_FILE_EXTENSIONS.includes(ext)

  // Upload to Supabase
  const url = await uploadToSupabase(file, userId, conversationId)

  const parsedFile: ParsedFile = {
    type: isTextFile ? 'text' : 'file',
    url,
    filename: file.name,
    mimeType: file.type,
  }

  // Try to parse text files
  if (isTextFile) {
    const extractedText = await extractTextFromFile(url, file.name, file.type)
    
    if (extractedText) {
      const textChunks = chunkText(extractedText)
      const embeddings = await createEmbeddings(textChunks)
      
      parsedFile.content = extractedText
      parsedFile.chunks = textChunks
      parsedFile.embeddings = embeddings
    } else {
      // Fallback to OpenAI Files API if parsing fails
      parsedFile.type = 'file'
    }
  }

  // Use OpenAI Files API for non-text files or if text parsing failed
  if (parsedFile.type === 'file' || (isOpenAIFile && !parsedFile.content)) {
    const openai = initializeOpenAI()
    const blob = new Blob([file], { type: file.type })
    const uploaded = await openai.files.create({
      file: blob as any,
      purpose: 'assistants',
    })
    
    parsedFile.fileId = uploaded.id
  }

  return parsedFile
}

/**
 * Store file metadata in database
 */
export async function storeFileMetadata(
  conversationId: string,
  messageId: string,
  parsedFile: ParsedFile
): Promise<void> {
  const { prisma } = await import('@/lib/prisma')
  const db = prisma as any
  
  // Store in ai_message attachments field (JSON)
  await db.aiMessage.update({
    where: { id: messageId },
    data: {
      attachments: {
        type: parsedFile.type,
        url: parsedFile.url,
        filename: parsedFile.filename,
        mimeType: parsedFile.mimeType,
        fileId: parsedFile.fileId,
        chunks: parsedFile.chunks?.length || 0,
        hasEmbeddings: !!parsedFile.embeddings?.length,
      },
    },
  })
}

