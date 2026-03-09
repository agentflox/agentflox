'use client'

import {
  ArtifactPartUI,
  ChatMessage,
  ChatPartProvider,
  MessagePart,
  EventPartUI,
  FilePartUI,
  MarkdownPartUI,
  SourcesPartUI,
} from '@llamaindex/chat-ui'
import { memo } from 'react'

interface MessageDisplayProps {
  parts: MessagePart[]
  role: 'user' | 'assistant' | 'system' | 'function'
  isLast?: boolean
  messageId?: string
}

export const MessageDisplay = memo(
  function MessageDisplay({ parts, role, isLast = false, messageId = '' }: MessageDisplayProps) {
    const mappedRole = role === 'function' ? 'assistant' : role

    const message = {
      id: messageId,
      role: mappedRole as 'user' | 'assistant' | 'system',
      parts,
    }

    return (
      <ChatMessage message={message} isLast={isLast}>
        <div className="flex min-w-0 flex-1 flex-col gap-3 text-sm sm:gap-4 sm:text-base">
          {parts.map((part, index) => (
            <ChatPartProvider key={`${messageId}-part-${index}`} value={{ part }}>
              <ArtifactPartUI />
              <MarkdownPartUI />
              <EventPartUI />
              <FilePartUI />
              <SourcesPartUI />
            </ChatPartProvider>
          ))}
        </div>
      </ChatMessage>
    )
  },
  (prevProps, nextProps) => {
    return (
      prevProps.messageId === nextProps.messageId &&
      prevProps.isLast === nextProps.isLast &&
      prevProps.role === nextProps.role &&
      JSON.stringify(prevProps.parts) === JSON.stringify(nextProps.parts)
    )
  }
)
