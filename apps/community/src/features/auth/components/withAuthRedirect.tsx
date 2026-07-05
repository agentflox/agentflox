"use client";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

type WithAuthRedirectOptions = {
  requireAuth?: boolean;
};

export function withAuthRedirect<P extends Record<string, unknown>>(
  Wrapped: React.ComponentType<P>,
  options: WithAuthRedirectOptions = {
    requireAuth: true
  }
) {
  const { requireAuth = true } = options;

  return function ComponentWithAuth(props: P) {
    const { data: session, status, update } = useSession();

    useEffect(() => {
      if (status === "unauthenticated" && requireAuth) {
        update();
      }
    }, [status, update]);
  
    if (status === "loading") {
      return <div>Loading...</div>;
    }

    return <Wrapped {...(props as P)} session={session as any} />;
  };
}

export default withAuthRedirect;


