'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { MessagesSidebar } from '@/entities/messages/components/MessagesSidebar';
import { trpc } from '@/lib/trpc';

/**
 * Base /messages route.
 *
 * Shown when:
 *  - No conversation is selected yet (first visit)
 *  - The last conversation was archived / deleted (no next to navigate to)
 *
 * Always renders the sidebar so the user is never left on a blank page.
 * The sidebar's own auto-select logic will redirect to the first unarchived
 * conversation when one exists.
 */
export default function MessagesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const currentUserId = session?.user?.id;

  // Read the already-cached list (staleTime keeps it fresh from the sidebar).
  // The cache is pre-stamped before any archive/delete navigation reaches here,
  // so is_archived flags are accurate — no redirect loop possible.
  const { data: convData } = trpc.messages.listConversations.useQuery(
    { page: 1, pageSize: 50 },
    { enabled: !!currentUserId, staleTime: 30_000 }
  );

  useEffect(() => {
    if (!convData?.items?.length) return;
    const first = convData.items.find((item: any) => !item.is_archived);
    if (first?.id) {
      router.replace(`/messages/${first.id}`);
    }
  }, [convData, router]);

  return (
    <div className="flex h-full flex-col gap-2 p-2 pb-1 lg:px-4 lg:pt-4">
      {/* Back button — mirrors [id]/page.tsx so the layout feels consistent */}
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
        {/* Sidebar — always visible; it will auto-navigate when conversations exist */}
        <MessagesSidebar />

        {/* Empty thread area */}
        <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-4 text-center p-8">
          <div className="rounded-full bg-muted/50 p-6 ring-1 ring-border/50">
            <MessageCircle className="h-10 w-10 text-muted-foreground/60" />
          </div>
          <div className="max-w-xs space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Select a conversation
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Choose a conversation from the list to start messaging, or create a new one with the&nbsp;
              <span className="font-medium text-foreground">✏️</span> button.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
