"use client";
import Link from "next/link";
import Image from "next/image";
import { useInterfaceSettings } from "@/hooks/useInterfaceSettings";
import Button from "@/components/ui/button";
import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "@/entities/notifications/components/NotificationBell";
import { cn } from "@/lib/utils";
import { User, LineChart, Settings, LifeBuoy, BookOpen, MessagesSquare, HelpCircle, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

export default function Header() {
  const { data: session } = useSession();
  const { showMessageIcon, showAgentIcon, t } = useInterfaceSettings();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white/80 backdrop-blur-md">
      <div className="flex h-14 w-full items-center justify-between px-4 sm:px-6">
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
          <span className="text-lg font-semibold tracking-tight">Agentflox Community</span>
        </Link>
        <nav className="flex items-center gap-4">
          {session?.user ? (
            <TooltipProvider delayDuration={300}>
              <div className="flex items-center gap-2 text-zinc-500 pr-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="cursor-pointer">
                      <NotificationBell />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Notifications</TooltipContent>
                </Tooltip>
              </div>

              <div className="relative border-l border-zinc-200 pl-4">
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <button
                          className={cn(
                            "flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-zinc-200 bg-zinc-50 transition-all hover:ring-2 hover:ring-zinc-100 focus:outline-none cursor-pointer data-[state=open]:ring-2 data-[state=open]:ring-zinc-200"
                          )}
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
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>Account</TooltipContent>
                  </Tooltip>

                  <DropdownMenuContent align="end" sideOffset={10} className="w-60 p-0 overflow-hidden z-50 rounded-xl">
                    <div className="border-b border-zinc-100 px-4 py-3 bg-zinc-50/50">
                      <p className="truncate text-sm font-semibold text-zinc-900">{session.user.name || session.user.email || 'Agentflox User'}</p>
                      <p className="truncate text-xs text-zinc-500">{session.user.email}</p>
                    </div>

                    <div className="p-1.5 flex flex-col gap-0.5">
                      <Link href="/dashboard/my-profile">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <User size={15} className="text-zinc-500" />
                          <span>{t("header.profile")}</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/dashboard/analytics">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <LineChart size={15} className="text-zinc-500" />
                          <span>Analytics</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/dashboard/settings">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <Settings size={15} className="text-zinc-500" />
                          <span>{t("header.settings")}</span>
                        </DropdownMenuItem>
                      </Link>
                    </div>

                    <DropdownMenuSeparator className="bg-zinc-100/50 my-0 mx-2" />

                    <div className="p-1.5 flex flex-col gap-0.5">
                      <Link href="/help">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <LifeBuoy size={15} className="text-zinc-500" />
                          <span>Support Hub</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="https://docs.agentflox.com" target="_blank">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <BookOpen size={15} className="text-zinc-500" />
                          <span>Documentation</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/community">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <MessagesSquare size={15} className="text-zinc-500" />
                          <span>Community</span>
                        </DropdownMenuItem>
                      </Link>
                      <Link href="/help/faq">
                        <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 border border-transparent hover:bg-zinc-50">
                          <HelpCircle size={15} className="text-zinc-500" />
                          <span>Help</span>
                        </DropdownMenuItem>
                      </Link>
                    </div>

                    <div className="border-t border-zinc-100 p-1.5">
                      <DropdownMenuItem className="cursor-pointer gap-2.5 rounded-md px-3 text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => signOut()}>
                        <LogOut size={15} className="text-red-500" />
                        <span>{t("header.logout")}</span>
                      </DropdownMenuItem>
                    </div>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TooltipProvider>
          ) : (
            <Link href={`${process.env.NEXT_PUBLIC_MAIN_APP_URL || 'https://app.agentflox.com'}/login`}>
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
