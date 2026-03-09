/**
 * Chat service – backend chat API (streaming) and context types.
 * All context types supported: project, profile, proposal, team, workspace, space, channel, task, list, folder.
 */

export type ChatContextType =
  | 'project'
  | 'profile'
  | 'proposal'
  | 'team'
  | 'workspace'
  | 'space'
  | 'channel'
  | 'task'
  | 'list'
  | 'folder'

export interface SendChatMessageParams {
  conversationId: string
  contextType: ChatContextType
  entityId: string
  message: string
  attachments?: Array<{
    url: string
    filename: string
    mimeType: string
    type: 'text' | 'file'
    fileId?: string
    content?: string
    chunks?: string[]
    embeddings?: Array<{ chunk: string; embedding: number[] }>
  }>
  webSearch?: boolean
  config?: { RPM?: number; RPD?: number }
}

export interface SendChatMessageOptions {
  onChunk?: (chunk: string) => void
}

const getBackendUrl = (): string =>
  process.env.NEXT_PUBLIC_SERVER_URL || process.env.SERVER_URL || 'http://127.0.0.1:3002'

/**
 * Send a chat message to the backend and stream the assistant response.
 * Reads the response stream, calls onChunk for each decoded chunk, and returns the full assistant message.
 */
export async function sendChatMessage(
  params: SendChatMessageParams,
  options?: SendChatMessageOptions
): Promise<string> {
  const { conversationId, contextType, entityId, message, attachments, webSearch, config } = params
  const { onChunk } = options ?? {}

  const url = `${getBackendUrl()}/chat`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      conversationId,
      contextType,
      entityId,
      message,
      attachments,
      webSearch,
      config: {
        RPM: config?.maxRPM ?? config?.RPM ?? 0,
        RPD: config?.maxRPD ?? config?.RPD ?? 0,
      },
    }),
  })

  if (!response.ok || !response.body) {
    const errorText = await response.text()
    throw new Error(errorText || 'Failed to send chat message')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    fullText += chunk
    onChunk?.(fullText)
  }

  return fullText
}
