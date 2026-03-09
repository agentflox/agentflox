'use client';

import React from 'react';

interface MessageReplyToProps {
  replyTo: { id: string; content: string; senderId: string };
  isOwnMessage: boolean;
}

export function MessageReplyTo({ replyTo, isOwnMessage }: MessageReplyToProps) {
  return (
    <div
      className={`group relative mb-1.5 px-3 py-2 rounded-xl overflow-hidden border-l-[3px] transition-all duration-200 ${
        isOwnMessage
          ? // Own message → blue-on-blue contrast (slightly darker tone)
            'border-blue-300 bg-blue-700/50 text-blue-50'
          : // Received message → light-gray background on white bubble
            'border-gray-300 bg-gray-100/90 dark:bg-gray-800/80 text-gray-800 dark:text-gray-100'
      }`}
    >
      {/* Gradient Accent Bar */}
      <div
        className={`absolute inset-y-0 left-0 w-[3px] rounded-full ${
          isOwnMessage
            ? 'bg-gradient-to-b from-blue-300 to-blue-400'
            : 'bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'
        }`}
      ></div>

      {/* Text */}
      <div className="pl-3.5 pr-5">
        <div
          className={`text-[11px] font-semibold uppercase tracking-wide mb-0.5 ${
            isOwnMessage ? 'text-blue-100/90' : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          {replyTo.senderId === 'me' ? 'You replied to' : 'Replying to'}
        </div>
        <div
          className={`text-sm leading-snug line-clamp-2 ${
            isOwnMessage ? 'text-blue-50' : 'text-gray-900 dark:text-gray-100'
          }`}
          title={replyTo.content}
        >
          {replyTo.content}
        </div>
      </div>

      {/* Optional arrow icon */}
      <div
        className={`absolute top-1.5 right-2 opacity-0 group-hover:opacity-80 transition-opacity duration-200 ${
          isOwnMessage ? 'text-blue-200/80' : 'text-gray-400 dark:text-gray-500'
        }`}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-3.5 w-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h11M3 10l5-5m-5 5l5 5" />
        </svg>
      </div>
    </div>
  );
}
