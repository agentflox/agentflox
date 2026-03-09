"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();

  useEffect(() => {
    if (!session) {
      updateSession();
    }
  }, [session, updateSession]);

  return <>{children}</>;
}
