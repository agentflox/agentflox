'use client';

import { useEffect, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { OAUTH_MESSAGE_TYPE } from '@/features/integrations/lib/oauthPopup';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

function OAuthPopupCompleteInner() {
  const searchParams = useSearchParams();
  const [stuckOpen, setStuckOpen] = useState(false);

  useEffect(() => {
    const error = searchParams.get('error');
    const payload = error
      ? { type: OAUTH_MESSAGE_TYPE, ok: false, error }
      : { type: OAUTH_MESSAGE_TYPE, ok: true };

    try {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(payload, window.location.origin);
      }
    } catch {
      // Cross-origin or closed opener — still try to close.
    }

    // Close shortly after notifying opener (retry a few times; some browsers delay close).
    let attempts = 0;
    const tryClose = () => {
      attempts += 1;
      try {
        window.close();
      } catch {
        // ignore
      }
      if (!window.closed && attempts < 5) {
        window.setTimeout(tryClose, 200);
      } else if (!window.closed) {
        setStuckOpen(true);
      }
    };
    const t = window.setTimeout(tryClose, 100);

    return () => window.clearTimeout(t);
  }, [searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white text-zinc-700 px-6 text-center">
      {stuckOpen ? (
        <>
          <p className="text-sm font-medium">Connection complete.</p>
          <p className="text-xs text-zinc-400">You can close this window and return to Agentflox.</p>
          <Button type="button" variant="outline" size="sm" onClick={() => window.close()}>
            Close window
          </Button>
        </>
      ) : (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          <p className="text-sm font-medium">Finishing connection…</p>
          <p className="text-xs text-zinc-400">This window will close automatically.</p>
        </>
      )}
    </div>
  );
}

export default function OAuthPopupCompletePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm text-zinc-500">
          Completing OAuth…
        </div>
      }
    >
      <OAuthPopupCompleteInner />
    </Suspense>
  );
}
