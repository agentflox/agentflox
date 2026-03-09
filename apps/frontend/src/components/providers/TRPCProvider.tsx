'use client'
import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { makeQueryClient } from '@/utils/trpc/trpcClient';
import type { AppRouter } from '@/trpc/root';
import superjson from 'superjson';
import { trpc } from "@/lib/trpc";

interface TRPCProviderProps {
  children: React.ReactNode;
}

let browserQueryClient: QueryClient | undefined = undefined;
export function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important, so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

function getUrl() {
  const base = (() => {
    if (typeof window !== "undefined") return "";
    if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
    return "http://localhost:3000";
  })();

  return `${base}/api/trpc`;
}

export function TRPCProvider({ children }: TRPCProviderProps) {
  const [queryClient] = useState(() => getQueryClient());
  const trpcClient = createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: getUrl(),
        transformer: superjson,
      }),
    ],
  });

  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </trpc.Provider>
  );
}


