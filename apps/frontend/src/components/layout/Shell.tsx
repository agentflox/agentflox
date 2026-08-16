"use client";
import { useState } from "react";
import Sidebar from "./Sidebar";
import { Menu } from "lucide-react";

export default function Shell({
    children,
    noPadding = false,
    hideSidebar = false,
}: {
    children: React.ReactNode;
    noPadding?: boolean;
    /** When true, workspace sidebar is hidden (e.g. full-width messages). */
    hideSidebar?: boolean;
}) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex flex-col h-full min-h-0 w-full overflow-hidden">
            {/* Mobile top bar */}
            {!hideSidebar && (
                <div className="flex h-12 items-center gap-2 border-b px-4 md:hidden shrink-0">
                    {!open && (
                        <button
                            aria-label="Open sidebar"
                            onClick={() => setOpen(true)}
                            className="rounded-md border p-2"
                        >
                            <Menu size={18} />
                        </button>
                    )}
                    <div className="text-sm text-muted-foreground">Navigation</div>
                </div>
            )}

            {/* Desktop: normal full-parent layout — sidebar + scrollable content */}
            <div className="hidden md:flex flex-1 min-h-0 w-full overflow-hidden">
                {!hideSidebar && <Sidebar />}
                <div className={`flex-1 h-full min-w-0 overflow-y-auto overflow-x-hidden ${noPadding ? '' : 'p-6'}`}>
                    {children}
                </div>
            </div>

            {/* Mobile: normal flow with overlay sidebar */}
            <div className={`md:hidden flex-1 overflow-y-auto ${hideSidebar ? 'min-h-0' : ''}`}>
                <div className={`${noPadding ? '' : 'p-4'}`}>
                    {children}
                </div>
                {/* Overlay sidebar */}
                {!hideSidebar && (
                    <>
                        <div className={`fixed inset-y-0 left-0 z-50 w-64 transition-transform duration-300 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
                            <Sidebar mode="overlay" onClose={() => setOpen(false)} />
                        </div>
                        {open && (
                            <button
                                aria-label="Close sidebar backdrop"
                                onClick={() => setOpen(false)}
                                className="fixed inset-0 z-40 bg-black/30"
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
