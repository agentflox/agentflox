"use client";
import { useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import { X, Menu } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function Layout({ children }: { children: React.ReactNode }) {
    const [open, setOpen] = useState(false); // mobile main sidebar drawer
    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';
    const isChatView = activeTab === 'chat' || activeTab === 'builder';

    return (
        <div className="relative mx-auto w-full max-w-8xl h-full flex flex-col">
            {/* Mobile top bar */}
            <div className="flex h-12 shrink-0 items-center gap-2 border-b px-4 md:hidden">
                {!open && (
                    <button
                        aria-label="Open sidebar"
                        onClick={() => {
                            setOpen(true);
                        }}
                        className="rounded-md border p-2"
                    >
                        <Menu size={18} />
                    </button>
                )}
                <div className="text-sm text-muted-foreground">Navigation</div>
            </div>

            {/* Desktop layout with inline sidebar */}
            <div className="hidden md:grid md:grid-cols-[var(--main-sidebar-width,_16rem)_1fr] flex-1 min-h-0">
                <Sidebar />
                <div className={`${isChatView ? 'h-full overflow-hidden flex flex-col min-h-0' : 'p-6 h-full overflow-y-auto'}`}>
                    {children}
                </div>
            </div>

            {/* Mobile content (sidebar shown as overlay) */}
            <div className="md:hidden flex-1 min-h-0 flex flex-col">
                <div className={`${isChatView ? 'h-full overflow-hidden flex flex-col min-h-0' : 'p-4 h-full overflow-y-auto'}`}>
                    {children}
                </div>
                {/* Overlay sidebar */}
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
            </div>
        </div>
    );
}
