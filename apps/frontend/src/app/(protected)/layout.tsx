"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import AppFrame from "@/components/layout/AppFrame";

export default function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const { data: session, update: updateSession } = useSession();

  useEffect(() => {
    if (!session) {
      updateSession();
    }
  }, [session, updateSession]);

  return <AppFrame>{children}</AppFrame>;
}
