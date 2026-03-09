"use client";

import { Panel, Group, Separator } from "react-resizable-panels";
import { useDocsLayoutStore } from "@/stores/docs-layout-store";
import { Button } from "@/components/ui/button";
import { PanelLeftClose, PanelLeftOpen, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface DocsLayoutProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  documentTitle?: string;
  actions?: React.ReactNode;
}

export function DocsLayout({ children, sidebar, documentTitle, actions }: DocsLayoutProps) {
  const router = useRouter();
  const { isSidebarCollapsed, toggleSidebar } = useDocsLayoutStore();

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top Header Bar */}
      <header className="flex h-14 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/dashboard/docs")}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className="h-8 w-8"
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </Button>

          {documentTitle && (
            <h1 className="text-lg font-semibold truncate">{documentTitle}</h1>
          )}
        </div>

        <div className="flex items-center gap-2">
          {actions}
        </div>
      </header>

      {/* Main Content - Resizable Panels */}
      <div className="flex-1 overflow-hidden">
        <Group orientation="horizontal">
          {/* LEFT PANEL - Document Sidebar */}
          {!isSidebarCollapsed && (
            <>
              <Panel
                defaultSize="20%"
                minSize="15%"
                maxSize="30%"
                collapsible
                className="border-r"
              >
                <div className="h-full overflow-y-auto">{sidebar}</div>
              </Panel>
              <Separator className="w-1 hover:bg-primary/20 transition-colors" />
            </>
          )}

          {/* CENTER PANEL - Editor */}
          <Panel defaultSize="80%" minSize="40%">
            <div className="h-full overflow-y-auto">{children}</div>
          </Panel>
        </Group>
      </div>
    </div>
  );
}
