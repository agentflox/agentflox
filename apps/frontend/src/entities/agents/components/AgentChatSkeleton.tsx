import React from 'react';
import { ResizableSplitLayout } from '@/components/layout/ResizableSplitLayout';

export const AgentChatSkeleton = () => {
    return (
        <div className="flex h-full w-full">
            <ResizableSplitLayout
                mainPanelDefaultSize="60%"
                mainPanelMinSize="50%"
                sidePanelDefaultSize="40%"
                sidePanelMinSize="40%"
                MainContent={
                    <div className="flex flex-col h-full bg-white">
                        <div className="flex-1 p-6 overflow-hidden">
                            <div className="space-y-6">
                                {/* Assistant message skeleton */}
                                <div>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-4 w-4 shrink-0 rounded-full bg-slate-200 animate-pulse" />
                                        <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
                                    </div>
                                    <div className="h-20 w-2/3 rounded-lg bg-slate-100 animate-pulse" />
                                </div>
                                {/* User message skeleton */}
                                <div className="flex justify-end">
                                    <div className="h-10 w-1/3 rounded-[20px] bg-slate-100 animate-pulse" />
                                </div>
                            </div>
                        </div>
                        <div className="border-t bg-white px-4 py-3">
                            <div className="h-[100px] w-full rounded-xl border bg-slate-50 animate-pulse" />
                        </div>
                    </div>
                }
                SidePanelContent={
                    <div className="h-full border-l bg-gradient-to-b from-background to-muted/20 overflow-hidden">
                        <div className="h-full flex flex-col items-center justify-center p-6 space-y-8">
                            <div className="w-full max-w-sm h-64 bg-slate-200 rounded-2xl animate-pulse" />
                            <div className="w-full max-w-sm space-y-4">
                                <div className="h-4 w-3/4 bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 w-1/2 bg-slate-200 rounded animate-pulse" />
                                <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
                            </div>
                        </div>
                    </div>
                }
                isPanelOpen={true}
            />
        </div>
    );
};
