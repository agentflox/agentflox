"use client";

import React, { ReactNode } from "react";
import { DocsSidebar } from "./docs-sidebar";
import { DocsHeader } from "./docs-header";

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-slate-950 text-slate-50">
      <DocsHeader />
      <div className="flex-1 flex overflow-hidden">
        <aside className="hidden md:block w-72 border-r border-slate-800/50 bg-slate-950/50 backdrop-blur-xl shrink-0 overflow-y-auto">
          <DocsSidebar />
        </aside>
        <main className="flex-1 overflow-y-auto relative">
          <div className="max-w-4xl mx-auto px-6 py-12 md:px-12 lg:px-16">
            {children}
          </div>

          <div className="absolute top-0 right-0 -z-10 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 left-0 -z-10 w-[500px] h-[500px] bg-purple-500/10 blur-[120px] rounded-full" />
        </main>
      </div>

      <style jsx global>{`
        body {
          overflow: hidden;
        }

        /* Custom scrollbar for docs */
        ::-webkit-scrollbar {
          width: 5px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}

