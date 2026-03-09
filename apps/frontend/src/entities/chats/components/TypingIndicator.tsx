'use client'

import { memo } from 'react'

export const TypingIndicator = memo(function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 py-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400 [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
    </div>
  )
})
