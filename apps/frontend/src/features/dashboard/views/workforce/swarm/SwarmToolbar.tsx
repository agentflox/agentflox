'use client';

import React, { useState } from 'react';
import { Play, Square, Settings, Layout, Activity, GitBranch } from 'lucide-react';
import { useWorkforceStore } from '../../../../../entities/workforce/hooks/useWorkforceStore';
import { toast } from 'sonner';
import { fetchAuthToken } from '@/utils/backend-request';
import { BACKEND_URL } from '@/hooks/useSSEStream';

interface SwarmToolbarProps {
    workforceId?: string;
    activeTab: 'build' | 'run';
    onTabChange: (tab: 'build' | 'run') => void;
}

export default function SwarmToolbar({ workforceId, activeTab, onTabChange }: SwarmToolbarProps) {
    const {
        isAutonomousMode,
        setAutonomousMode,
        swarmSessionId,
        setSwarmSessionId,
    } = useWorkforceStore();
    const [isStarting, setIsStarting] = useState(false);

    const handleStartSwarm = async () => {
        if (!workforceId) {
            toast.error('No workforce selected');
            return;
        }

        setIsStarting(true);
        try {
            const token = await fetchAuthToken();
            const resp = await fetch(`${BACKEND_URL}/v1/workforces/swarm/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {}),
                },
                body: JSON.stringify({ workforceId, config: { strategy: 'autonomous' } })
            });

            if (!resp.ok) {
                const err = await resp.json().catch(() => ({})) as any;
                throw new Error(err.error || 'Failed to start swarm');
            }

            const { sessionId } = await resp.json();
            setSwarmSessionId(sessionId);
            setAutonomousMode(true);
            onTabChange('run');
            toast.success('Autonomous Swarm Sequence Initiated');
        } catch (err: any) {
            console.error(err);
            toast.error(err?.message || 'Swarm Launch Failed');
        } finally {
            setIsStarting(false);
        }
    };

    const handleStopSwarm = async () => {
        if (!swarmSessionId) return;

        try {
            const token = await fetchAuthToken();
            await fetch(`${BACKEND_URL}/v1/workforces/swarm/${swarmSessionId}/stop`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            setAutonomousMode(false);
            setSwarmSessionId(null);
            toast.info('Swarm Session Terminated');
        } catch (err) {
            toast.error('Failed to stop swarm');
        }
    };

    return (
        <div className="h-14 border-b border-border bg-background/80 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Activity className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-sm font-bold tracking-tight">Swarm Engine v2</h1>
                        <p className="text-[10px] text-muted-foreground uppercase font-bold">Collaborative Intelligence</p>
                    </div>
                </div>

                <div className="h-4 w-px bg-border mx-2" />

                <div className="flex bg-secondary/50 p-1 rounded-lg">
                    <button
                        onClick={() => onTabChange('build')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'build'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Settings className="h-3.5 w-3.5" />
                        Build
                    </button>
                    <button
                        onClick={() => onTabChange('run')}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activeTab === 'run'
                            ? 'bg-background shadow-sm text-foreground'
                            : 'text-muted-foreground hover:text-foreground'
                            }`}
                    >
                        <Activity className="h-3.5 w-3.5" />
                        Run View
                    </button>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {isAutonomousMode ? (
                    <div className="flex items-center gap-3 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-full animate-in fade-in slide-in-from-right-4">
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-green-600 uppercase tracking-wider">Swarm Online</span>
                        <button
                            onClick={handleStopSwarm}
                            className="ml-2 p-1 hover:bg-green-500/20 rounded-md transition-colors"
                        >
                            <Square className="h-3.5 w-3.5 text-green-600 fill-current" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={handleStartSwarm}
                        disabled={isStarting}
                        className="flex items-center gap-2 px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                    >
                        {isStarting ? (
                            <div className="h-3 w-3 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                        ) : (
                            <Play className="h-3.5 w-3.5 fill-current" />
                        )}
                        Execute Swarm
                    </button>
                )}

                <div className="h-4 w-px bg-border mx-1" />

                <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                    <Layout className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-secondary rounded-lg transition-colors text-muted-foreground">
                    <GitBranch className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
