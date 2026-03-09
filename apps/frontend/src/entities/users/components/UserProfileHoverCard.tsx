"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Clock, Users, MessageCircle, User as UserIcon } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface UserProfileHoverCardProps {
    userId: string;
    children: React.ReactNode;
}

export function UserProfileHoverCard({ userId, children }: UserProfileHoverCardProps) {
    const { data: user, isLoading } = trpc.user.get.useQuery({ id: userId || "" }, { enabled: !!userId });
    const { data: me } = trpc.user.me.useQuery();

    const isMe = me?.id === userId;

    if (!userId) return <>{children}</>;

    return (
        <HoverCard openDelay={300} closeDelay={200}>
            <HoverCardTrigger asChild>
                {children}
            </HoverCardTrigger>
            <HoverCardContent className="w-[300px] p-0 overflow-hidden bg-white border-slate-200 shadow-xl rounded-xl">
                {isLoading ? (
                    <div className="p-8 flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-200 border-t-blue-500" />
                    </div>
                ) : user ? (
                    <div className="flex flex-col">
                        {/* Header */}
                        <div className="p-5 flex items-start gap-4">
                            <Avatar className="h-16 w-16 shadow-sm border-2 border-white ring-1 ring-slate-100">
                                <AvatarImage src={user.avatar || user.image || ""} />
                                <AvatarFallback className="bg-slate-900 text-white text-xl font-bold">
                                    {(user.name || user.firstName || "?")[0]?.toUpperCase()}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0 pt-1">
                                <h3 className="text-lg font-bold text-slate-900 truncate">
                                    {isMe ? "You" : (user.name || `${user.firstName} ${user.lastName}`)}
                                </h3>
                                <div className="flex items-center gap-1.5 mt-1">
                                    <div className="h-2 w-2 rounded-full bg-slate-300 ring-1 ring-slate-300/20" />
                                    <span className="text-xs text-slate-500">
                                        Last online {user.lastActiveAt ? formatDistanceToNow(new Date(user.lastActiveAt), { addSuffix: true }) : "recently"}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="px-5 pb-5 space-y-3.5">
                            <div className="flex items-center gap-3 text-[13px] text-slate-600">
                                <div className="w-5 flex justify-center">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                </div>
                                <span className="truncate text-slate-500 hover:text-blue-600 transition-colors cursor-pointer">
                                    {user.email}
                                </span>
                            </div>
                            <div className="flex items-center gap-3 text-[13px] text-slate-600">
                                <div className="w-5 flex justify-center">
                                    <Clock className="h-4 w-4 text-slate-400" />
                                </div>
                                <span className="text-slate-500">
                                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>

                            <div className="flex items-center gap-3 text-[13px]">
                                <div className="w-5 flex justify-center">
                                    <Users className="h-4 w-4 text-slate-400" />
                                </div>
                                <div className="flex items-center">
                                    <div className="h-6 w-6 rounded-full bg-slate-900 border-2 border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm ring-1 ring-slate-100">
                                        S
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="p-3 bg-slate-50/50 border-t border-slate-100 flex gap-2">
                            <Button
                                variant="google"
                                size="sm"
                                className="flex-1 h-9 text-[13px] shadow-sm font-medium"
                            >
                                <MessageCircle className="h-3.5 w-3.5 mr-2 text-slate-500" /> Chat
                            </Button>
                            <Button
                                variant="google"
                                size="sm"
                                className="flex-1 h-9 text-[13px] shadow-sm font-medium"
                            >
                                <UserIcon className="h-3.5 w-3.5 mr-2 text-slate-500" /> View profile
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="p-6 text-sm text-slate-500 text-center">User not found</div>
                )}
            </HoverCardContent>
        </HoverCard>
    );
}
