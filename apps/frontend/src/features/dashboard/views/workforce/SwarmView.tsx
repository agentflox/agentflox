'use client';

import React from 'react';
import SwarmCanvas from './swarm/SwarmCanvas';
import SwarmConfigSidebar from './swarm/SwarmConfigSidebar';
import WorkforceSidebar from './WorkforceSidebar';
import SwarmRunView from './swarm/SwarmRunView';
import { useSwarmEvents } from './swarm/hooks/useSwarmEvents';
import { useWorkforceStore } from './store/useWorkforceStore';

interface SwarmViewProps {
    activeTab?: 'build' | 'run';
    workforceId?: string;
    workforceName?: string;
    initialConversationId?: string | null;
    onConversationReady?: (conversationId: string) => void;
}

export default function SwarmView({ 
    activeTab = 'build',
    workforceId,
    workforceName,
    initialConversationId,
    onConversationReady
}: SwarmViewProps) {
    // Activate real-time event tracking
    useSwarmEvents();
    const { isSidebarOpen } = useWorkforceStore();

    return (
        <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden bg-background font-sans">
            {activeTab === 'build' ? (
                <div className="flex-1 flex overflow-hidden">

                    {/* Center Pane - Config */}
                    <div className="w-96 h-full flex-shrink-0 border-r border-border z-10 bg-background">
                        <SwarmConfigSidebar />
                    </div>

                    {/* Right Pane - Canvas + Agent Sidebar */}
                    <div className="flex-1 flex flex-row h-full relative overflow-hidden">
                        <div className="flex-1 flex flex-col h-full relative">
                            <SwarmCanvas />
                        </div>
                        {isSidebarOpen && (
                            <div className="w-[360px] h-full flex-shrink-0 border-l border-border bg-background z-20">
                                <WorkforceSidebar />
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <SwarmRunView 
                    workforceId={workforceId!} 
                    workforceName={workforceName!} 
                    initialConversationId={initialConversationId}
                    onConversationReady={onConversationReady}
                />
            )}

            <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(var(--primary-rgb), 0.1);
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(var(--primary-rgb), 0.2);
                }
            `}</style>
        </div>
    );
}
