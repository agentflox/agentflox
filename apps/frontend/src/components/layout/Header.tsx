"use client";
import Link from "next/link";
import Image from "next/image";
import { CommandTrigger } from "@/entities/command/CommandInterface";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import Button from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "@/entities/notifications/components/NotificationBell";
import MessageBell from "@/entities/messages/components/MessageBell";
import { cn } from "@/lib/utils";

export default function Header() {
  const { data: session } = useSession();
  const { showMessageIcon, showAgentIcon, t } = useInterfaceSettings();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-2 text-zinc-900 transition-colors hover:text-zinc-700"
        >
          <span className="relative inline-block h-7 w-7">
            <Image
              src="/images/logo.png"
              alt="Agentflox logo"
              fill
              className="object-contain"
              priority
            />
          </span>
          <span className="text-lg font-semibold tracking-tight">agentflox</span>
        </Link>
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <>
              <div className="flex items-center gap-1 text-zinc-500">
                {showMessageIcon && <MessageBell />}
                <NotificationBell />
                {showAgentIcon && <CommandTrigger />}
              </div>

              <div className="relative ml-2" ref={menuRef}>
                <button
                  className={cn(
                    "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 transition-all hover:ring-2 hover:ring-zinc-100 focus:outline-none",
                    open && "ring-2 ring-zinc-200"
                  )}
                  onClick={() => setOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={open}
                >
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt="avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xs font-medium text-zinc-600">
                      {(session.user.name || session.user.email || "U").slice(0, 2).toUpperCase()}
                    </span>
                  )}
                </button>

                {open && (
                  <div className="absolute right-0 mt-2 w-56 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                    <div className="border-b border-zinc-100 px-4 py-3 bg-zinc-50/50">
                      <p className="truncate text-sm font-medium text-zinc-900">{session.user.name}</p>
                      <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
                    </div>

                    <div className="p-1">
                      <Link
                        href="/dashboard/my-profile"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => setOpen(false)}
                      >
                        {t("header.profile")}
                      </Link>
                      <Link
                        href="/dashboard/settings"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => setOpen(false)}
                      >
                        {t("header.settings")}
                      </Link>
                      <Link
                        href="/help"
                        className="block rounded-md px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
                        onClick={() => setOpen(false)}
                      >
                        {t("header.help")}
                      </Link>
                    </div>

                    <div className="border-t border-zinc-100 p-1">
                      <button
                        className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        onClick={() => { setOpen(false); signOut(); }}
                      >
                        {t("header.logout")}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link href="/login">
              <Button className="h-9 rounded-full bg-zinc-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800">
                {t("header.login")}
              </Button>
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
