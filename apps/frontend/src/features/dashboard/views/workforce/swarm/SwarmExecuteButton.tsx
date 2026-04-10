'use client';

import React, { useState } from 'react';
import { Play, Square } from 'lucide-react';
import { useWorkforceStore } from '../store/useWorkforceStore';
import { toast } from 'sonner';
import { fetchAuthToken } from '@/utils/backend-request';
import { BACKEND_URL } from '@/entities/agents/hooks/useAgentStream';

interface SwarmExecuteButtonProps {
    workforceId?: string;
}

export function SwarmExecuteButton({ workforceId }: SwarmExecuteButtonProps) {
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
            const resp = await fetch(`${BACKEND_URL}/v1/agents/swarm/start`, {
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
            await fetch(`${BACKEND_URL}/v1/agents/swarm/${swarmSessionId}/stop`, {
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

    if (isAutonomousMode) {
        return (
            <div className="flex items-center gap-2 px-3 py-1 bg-green-500/10 border border-green-500/20 rounded-md animate-in fade-in slide-in-from-right-4">
                <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-bold text-green-600 tracking-wider">Swarm Online</span>
                <button 
                    onClick={handleStopSwarm}
                    className="p-1 hover:bg-green-500/20 rounded-md transition-colors ml-1"
                >
                    <Square className="h-3 w-3 text-green-600 fill-current" />
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={handleStartSwarm}
            disabled={isStarting}
            className="flex items-center gap-2 px-4 py-1.5 bg-zinc-900 border border-zinc-900 text-white rounded-md text-xs font-bold hover:bg-zinc-800 transition-colors disabled:opacity-50 shadow-sm"
        >
            {isStarting ? (
                <div className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
                <Play className="h-3 w-3 fill-current" />
            )}
            Execute Swarm
        </button>
    );
}
