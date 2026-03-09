"use client";
import Header from "./Header";
import Footer from "./Footer";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import MessageListModal from "@/entities/messages/components/MessageListModal";
import MessageItemModal from "@/entities/messages/components/MessageItemModal";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import { openLauncher, closeLauncher, openModalWithUser, closeModal } from "@/stores/slices/messages.slice";
import { CommandInterface } from "@/entities/command/CommandInterface";
import { useSocketScopeSync } from "@/hooks/useSocketScopeSync";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  useSocketScopeSync();
  const dispatch = useAppDispatch();
  const launcherOpen = useAppSelector((s) => s.messagesUI.launcherOpen);
  const modalUserId = useAppSelector((s) => s.messagesUI.modalUserId);
  const { data } = trpc.messages.listConversations.useQuery({ page: 1, pageSize: 50 });

  const conversations = useMemo(() => {
    return (data?.items || []).map((it: any) => ({
      id: String(it.user_id),
      name: it.name || it.username,
      avatar: it.avatar as string | null,
      unread: Number(it.unread || 0),
    }));
  }, [data]);

  return (
    <div className="min-h-screen max-h-screen overflow-hidden grid grid-rows-[auto_1fr_auto]">
      <Header />
      <main className="w-full h-full overflow-x-hidden overflow-y-auto min-h-0">{children}</main>

      {/* Floating message launcher visible on all pages */}
      {/*<button
        aria-label="Open messages"
        onClick={() => dispatch(openLauncher())}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-primary p-4 text-primary-foreground shadow-lg hover:opacity-90"
      >
        <MessageCircle className="h-6 w-6" />
      </button>
      {/* Conversations list modal */}
      {/* <MessageListModal
        open={launcherOpen}
        onOpenChange={(o) => (o ? dispatch(openLauncher()) : dispatch(closeLauncher()))}
        onSelectUser={(id) => dispatch(openModalWithUser(id))}
      />

      {/* Per-user message modal (content + composer) */}
      {/* {modalUserId && (
        <MessageItemModal userId={modalUserId} open={!!modalUserId} onClose={() => dispatch(closeModal())} />
      )} 

      {/* Global Command Interface */}
      <CommandInterface />

    </div>
  );
}


