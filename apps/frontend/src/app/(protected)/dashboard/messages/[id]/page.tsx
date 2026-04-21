'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { useSession } from 'next-auth/react';
import { MessageCircle, Loader2, ArrowLeft } from 'lucide-react';
import { MessagesSidebar } from '@/entities/messages/components/MessagesSidebar';
import { Thread } from '@/entities/messages/components/Thread';
import { ListingSidebar } from '@/entities/messages/components/ListingSidebar';

export default function MessageThreadPage() {
  const params = useParams();
  const router = useRouter();
  const conversationId = params?.id as string;
  const { data: session } = useSession();
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const utils = trpc.useUtils();

  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(conversationId ?? '');

  const { data: conversation, isLoading: isLoadingConv, error } = trpc.messages.getConversation.useQuery(
    { conversationId },
    {
      enabled: !!conversationId && isValidUuid,
      retry: false,
    }
  );

  // If the conversation no longer exists (stale sidebar entry), purge it from
  // the list cache and redirect back so the user isn't stuck on a dead screen.
  useEffect(() => {
    if (error?.data?.code === 'NOT_FOUND' && conversationId) {
      // Remove the stale entry from the sidebar list cache immediately
      utils.messages.listConversations.setData({ page: 1, pageSize: 50 }, (old: any) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item: any) => item.id !== conversationId),
        };
      });
      // Redirect to the messages list so a fresh selection is made
      router.replace('/dashboard/messages');
    }
  }, [error, conversationId, utils, router]);

  const renderContent = () => {
    if (isLoadingConv) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (error?.data?.code === 'NOT_FOUND') {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="rounded-full bg-muted p-4">
              <MessageCircle className="h-8 w-8 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">Conversation not found</p>
              <p className="text-sm text-muted-foreground">
                This conversation doesn't exist or you don't have access to it.
              </p>
            </div>
          </div>
        </div>
      );
    }

    if (error) {
      return (
        <div className="flex flex-1 items-center justify-center">
          <div className="flex flex-col items-center gap-4 text-center p-8">
            <div className="rounded-full bg-red-50 dark:bg-red-950 p-4">
              <MessageCircle className="h-8 w-8 text-red-500 dark:text-red-400" />
            </div>
            <div>
              <p className="text-sm font-semibold">Error loading conversation</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <>
        <div className="min-w-0 flex-1 h-full flex flex-col relative">
          {conversation ? (
            <Thread
              key={conversationId}
              conversationId={conversationId}
              userId={conversation.userId || ""}
              peerName={conversation.name || "User"}
              marketplaceListingId={conversation.marketplaceListingId ?? null}
              marketplaceListingTitle={conversation.marketplaceListingTitle ?? null}
              peerAvatar={conversation.avatar ?? null}
              onToggleSidebar={() => setShowRightSidebar(!showRightSidebar)}
              isSidebarOpen={showRightSidebar}
              conversation={conversation}
            />
          ) : (
            <div className="flex h-full flex-1 flex-col items-center justify-center gap-4 text-center p-8">
              <div className="rounded-full bg-muted p-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold">No conversation loaded</p>
                <p className="text-sm text-muted-foreground">Select a conversation from the sidebar to start messaging.</p>
              </div>
            </div>
          )}
        </div>
        {conversation?.marketplaceListingId && showRightSidebar && (
          <div className="w-[320px] xl:w-[380px] shrink-0 h-full hidden lg:flex flex-col border-l border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-900/10">
            <ListingSidebar listingId={conversation.marketplaceListingId} />
          </div>
        )}
      </>
    );
  };

  return (
    <div className="flex h-full flex-col gap-2 p-2 pb-1 lg:px-4 lg:pt-4">
      <div className="flex shrink-0 items-center">
        <button
          onClick={() => router.back()}
          className="group flex items-center gap-2.5 rounded-full py-1.5 pl-1.5 pr-4 text-sm font-medium text-muted-foreground hover:bg-muted/80 hover:text-foreground transition-all duration-300 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background shadow-sm ring-1 ring-black/5 dark:ring-white/10 transition-all duration-300 group-hover:shadow-md group-hover:ring-black/10 dark:group-hover:ring-white/20 group-hover:-translate-x-0.5">
            <ArrowLeft className="h-4 w-4" />
          </div>
          <span>Back</span>
        </button>
      </div>

      <div className="flex flex-1 min-h-0 rounded-2xl border bg-white dark:bg-gray-950 shadow-sm overflow-hidden">
        <MessagesSidebar activeId={conversationId} />
        {renderContent()}
      </div>
    </div>
  );
}