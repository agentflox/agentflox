'use client';

import React, { useEffect, useState } from 'react';
import { Shield, Check, X, Clock, AlertTriangle } from 'lucide-react';
import { useWorkforceStore } from '../store/useWorkforceStore';
import { toast } from 'sonner';
import { fetchAuthToken } from '@/utils/backend-request';
import { BACKEND_URL } from '@/entities/agents/hooks/useAgentStream';

export default function SwarmApprovalDrawer() {
    const { swarmSessionId, pendingApprovals, setPendingApprovals } = useWorkforceStore();
    const [isProcessing, setIsProcessing] = useState<string | null>(null);

    useEffect(() => {
        fetchApprovals();
    }, []);

    const fetchApprovals = async () => {
        try {
            const token = await fetchAuthToken();
            const url = new URL(`${BACKEND_URL}/v1/agents/swarm/tasks`);
            url.searchParams.set('status', 'PENDING_APPROVAL');
            if (swarmSessionId) {
                url.searchParams.set('sessionId', swarmSessionId);
            }

            const resp = await fetch(url.toString(), {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error('Failed to fetch approvals');
            const data = await resp.json();
            setPendingApprovals(data.tasks);
        } catch (err) {
            console.error(err);
        }
    };

    const handleApprove = async (taskId: string) => {
        setIsProcessing(taskId);
        try {
            const token = await fetchAuthToken();
            const resp = await fetch(`${BACKEND_URL}/v1/agents/swarm/tasks/${taskId}/approve`, {
                method: 'POST',
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (!resp.ok) throw new Error('Approval failed');
            
            toast.success('Task approved and released to swarm');
            setPendingApprovals(pendingApprovals.filter((t: any) => t.id !== taskId));
        } catch (err) {
            toast.error('Failed to approve task');
        } finally {
            setIsProcessing(null);
        }
    };

    if (pendingApprovals.length === 0) return null;

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[500px] animate-in slide-in-from-bottom-4 duration-300">
            <div className="bg-background/95 backdrop-blur-md border border-primary/30 shadow-2xl rounded-2xl overflow-hidden ring-1 ring-primary/10">
                <div className="bg-primary/10 px-4 py-3 border-b border-primary/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary animate-pulse" />
                        <h3 className="text-xs font-bold uppercase tracking-widest text-primary">
                            Human Intervention Required ({pendingApprovals.length})
                        </h3>
                    </div>
                </div>

                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    {pendingApprovals.map((task: any) => (
                        <div key={task.id} className="p-4 border-b border-border/40 hover:bg-primary/5 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="text-sm font-bold text-foreground">{task.title}</h4>
                                <span className="text-[10px] bg-yellow-500/10 text-yellow-600 px-2 py-0.5 rounded border border-yellow-500/20 font-bold uppercase">
                                    Awaiting Approval
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mb-3">
                                <AlertTriangle className="h-3 w-3 text-yellow-600" />
                                <p className="text-[11px] text-muted-foreground italic">
                                    "{task.metadata?.approvalReason || 'Potential side-effects detected'}"
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handleApprove(task.id)}
                                    disabled={!!isProcessing}
                                    className="flex-1 bg-primary text-primary-foreground text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                                >
                                    {isProcessing === task.id ? <Clock className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                    Authorize Execution
                                </button>
                                <button
                                    className="px-3 py-2 bg-secondary text-foreground text-xs font-bold rounded-lg hover:bg-secondary/80 transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
