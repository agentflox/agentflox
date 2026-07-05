"use client";

import React, { ReactNode } from "react";
import { DocsSidebar } from "./docs-sidebar";
import { DocsHeader } from "./docs-header";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <DocsHeader />
      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:block w-72 border-r border-slate-200 dark:border-slate-800/50 bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-xl shrink-0 overflow-y-auto">
          <DocsSidebar />
        </aside>
        <main className="flex-1 overflow-y-auto relative w-full">
          <div className="w-full px-4 py-8 md:px-8 lg:px-12">
            {children}
          </div>

          <div className="fixed top-0 right-0 -z-10 w-[600px] h-[600px] bg-indigo-500/5 dark:bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
          <div className="fixed bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-500/5 dark:bg-purple-500/10 blur-[120px] rounded-full pointer-events-none mix-blend-multiply dark:mix-blend-screen" />
        </main>
      </div>

      <style jsx global>{`
        body {
          overflow: auto;
        }

        /* Custom scrollbar for docs */
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        @media (prefers-color-scheme: dark) {
          ::-webkit-scrollbar-thumb {
            background: rgba(255, 255, 255, 0.1);
          }
          ::-webkit-scrollbar-thumb:hover {
            background: rgba(255, 255, 255, 0.2);
          }
        }
      `}</style>
    </div>
  );
}

