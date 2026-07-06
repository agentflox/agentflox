"use client";
import dynamic from "next/dynamic";
import Header from "./Header";
import { useAppDispatch, useAppSelector } from "@/hooks/useReduxStore";
import { useSocketScopeSync } from "@/hooks/useSocketScopeSync";
import { SupportAssistantModal } from "@/components/assistant/SupportAssistantModal";
import { setSupportAssistantOpen } from "@/stores/slices/messages.slice";

export default function AppFrame({ children }: { children: React.ReactNode }) {
  useSocketScopeSync();
  const dispatch = useAppDispatch();
  const supportAssistantOpen = useAppSelector((s) => s.messagesUI.supportAssistantOpen);

  return (
    <div className="min-h-screen max-h-screen overflow-hidden grid grid-rows-[auto_1fr_auto]">
      <Header />
      <main className="w-full h-full overflow-x-hidden overflow-y-auto min-h-0">{children}</main>

      <SupportAssistantModal
        isOpen={supportAssistantOpen}
        onClose={() => dispatch(setSupportAssistantOpen(false))}
      />
    </div>
  );
}
