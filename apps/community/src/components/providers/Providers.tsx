"use client";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";
import { TRPCProvider } from './TRPCProvider';
import { ReduxProvider } from './ReduxProvider';
import { ThemeProvider } from './ThemeProvider';
import { GoogleAnalyticsProvider } from './GoogleAnalyticsProvider';
import { SocketProvider } from './SocketProvider';
import { CollaborationProvider } from './CollaborationProvider';
import { type Session } from "next-auth";
import '@/lib/i18n'; // Initialize i18next


export default function Providers({
  children, session
}: {
  children: React.ReactNode,
  session: Session | null
}) {
  return (
    <>
      <ThemeProvider>
        <SessionProvider
          refetchInterval={0}
          refetchOnWindowFocus={false}
          session={session}
        >
          <ReduxProvider>
            <TRPCProvider>
              <SocketProvider>
                {session?.user ? (
                  <CollaborationProvider
                    userId={session.user.id}
                    username={session.user.name || session.user.email || 'User'}
                  >
                    {children}
                  </CollaborationProvider>
                ) : (
                  children
                )}
              </SocketProvider>
            </TRPCProvider>
          </ReduxProvider>
        </SessionProvider>
      </ThemeProvider>
      <Toaster position="bottom-center" />
      <GoogleAnalyticsProvider />
    </>
  );
}





