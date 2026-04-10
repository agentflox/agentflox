"use client";

import { useEffect, useRef } from "react";

interface SidePanelProps {
    open: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
}

/**
 * SidePanel wraps a floating sidebar and closes it when the user clicks
 * outside of it. Drop-in replacement for the `<> <div overlay/> <div panel> </>` pattern.
 */
export function SidePanel({ open, onClose, children, className }: SidePanelProps) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;

        // Defer by one tick so the click that opened the panel isn't immediately
        // treated as an outside click.
        let mounted = true;
        const timer = setTimeout(() => {
            if (!mounted) return;
            const handleMouseDown = (e: MouseEvent) => {
                if (ref.current && !ref.current.contains(e.target as Node)) {
                    onClose();
                }
            };
            document.addEventListener("mousedown", handleMouseDown);
            // Clean up when the effect re-runs (open → false)
            return () => document.removeEventListener("mousedown", handleMouseDown);
        }, 0);

        return () => {
            mounted = false;
            clearTimeout(timer);
        };
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div ref={ref} className={className}>
            {children}
        </div>
    );
}
