"use client";

import React, { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ChatComposer } from "@/entities/chats/components/ChatComposer";
import { cn } from "@/lib/utils";
import { X, Minus, Sparkles, Send, Headset } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";

type Message = { id: string; role: "user" | "assistant"; content: string };

interface SupportAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SupportAssistantModal({ isOpen, onClose }: SupportAssistantModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const initMutation = trpc.supportAssistant.initialize.useMutation();
  const messageMutation = trpc.supportAssistant.message.useMutation();

  const { data: messagesData, refetch: refetchMessages } = trpc.chat.getMessages.useQuery(
    { conversationId: conversationId || "" },
    { enabled: !!conversationId, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    if (isOpen && !conversationId) {
      initMutation.mutateAsync({ title: "Support Assistant" })
        .then(res => setConversationId(res.conversationId))
        .catch(err => setError(err.message || "Failed to start support session."));
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesData?.messages) {
      const mapped: Message[] = messagesData.messages.map((m: any) => ({
        id: m.id,
        role: m.role === "ASSISTANT" ? "assistant" : "user",
        content: m.content as string,
      }));
      setMessages(mapped);
    }
  }, [messagesData?.messages]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!conversationId) return;
    setError(null);
    try {
      await messageMutation.mutateAsync({ conversationId, message: content });
      await refetchMessages();
    } catch (err: any) {
      setError(err.message || "Failed to send message.");
    }
  };

  if (!isOpen) return null;

  return (
    <Card 
      className={cn(
        "fixed bottom-6 right-6 z-50 flex flex-col shadow-2xl transition-all duration-300 border-slate-200/60 overflow-hidden",
        isMinimized ? "h-14 w-64" : "h-[600px] w-[400px] rounded-2xl"
      )}
    >
      {/* Header */}
      <div className="bg-slate-900 px-4 py-3 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Headset className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="text-sm font-bold">Support Assistant</div>
            {!isMinimized && <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Online & Ready
            </div>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <Minus className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div 
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
          >
            {messages.length === 0 && !initMutation.isPending && (
              <div className="text-center py-8 space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-white shadow-sm flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-indigo-500" />
                </div>
                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                  How can I help you build with Agentflox today?
                </p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex items-start gap-2 max-w-[85%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                {msg.role === "assistant" && (
                  <Avatar className="h-7 w-7 mt-1 border-2 border-white shadow-sm">
                    <AvatarFallback className="bg-indigo-500 text-[10px] text-white font-bold">AI</AvatarFallback>
                  </Avatar>
                )}
                <div
                  className={cn(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm",
                    msg.role === "user" 
                      ? "bg-indigo-600 text-white rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-100 rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {messageMutation.isPending && (
              <div className="flex items-start gap-2 max-w-[85%]">
                <Avatar className="h-7 w-7 mt-1 border-2 border-white shadow-sm">
                  <AvatarFallback className="bg-indigo-500 text-[10px] text-white font-bold">AI</AvatarFallback>
                </Avatar>
                <div className="bg-white text-slate-800 border border-slate-100 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-sm flex gap-1 items-center">
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-slate-300 animate-bounce" />
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg bg-rose-50 border border-rose-100 p-3 text-xs text-rose-600">
                {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 bg-white border-t border-slate-100">
            <ChatComposer
              onSend={handleSend}
              isSending={messageMutation.isPending}
              disabled={!conversationId}
              placeholder="Ask anything..."
              className="rounded-xl border-slate-200 focus-within:ring-2 focus-within:ring-indigo-500/20 transition-all"
            />
            <div className="mt-2 text-[10px] text-center text-slate-400">
              AI can make mistakes. Please verify important info.
            </div>
          </div>
        </>
      )}
    </Card>
  );
}
