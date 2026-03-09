"use client";

import Link from "next/link";
import { Mail } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useMessages } from "@/entities/messages/hooks/useMessages";

export default function MessageBell() {
  useMessages();
  const { data } = trpc.messages.listConversations.useQuery({ page: 1, pageSize: 20 });
  const unread = (data?.items || []).reduce((sum: number, c: any) => sum + (Number(c.unread) || 0), 0);

  return (
    <Link href="/dashboard/messages" className="relative">
      <div className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 text-zinc-500 transition-all hover:bg-zinc-100 hover:text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-200">
        <Mail className="h-4 w-4" />
      </div>
      {unread > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 ring-2 ring-white text-[10px] font-bold text-white">
          {unread > 99 ? '99+' : unread}
        </span>
      )}
    </Link>
  );
}
