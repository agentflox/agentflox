"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { UserProfileHoverCard } from "./UserProfileHoverCard";

type UserCardProps = {
    id: string;
    title: string; // display name
    subtitle?: string; // role or brief
    href?: string; // direct link; if absent, onClick used
    onClick?: () => void;
    avatarText?: string; // initials
};

export default function UserCard({ id, title, subtitle, href, onClick, avatarText }: UserCardProps) {
    const router = useRouter();
    const handleClick = () => {
        if (onClick) return onClick();
        if (href) router.push(href);
    };
    const initials = (avatarText || title || "?")
        .split(" ")
        .map((s) => s[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();

    return (
        <button
            onClick={handleClick}
            className="group flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
        >
            <UserProfileHoverCard userId={id}>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground/80 cursor-pointer">
                    {initials}
                </div>
            </UserProfileHoverCard>
            <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{title}</div>
                {subtitle && <div className="truncate text-xs text-muted-foreground">{subtitle}</div>}
            </div>
            <span className="ml-auto text-xs text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">View</span>
        </button>
    );
}


