'use client';

import { useEffect, useRef } from 'react';
import { useWorkforceStore } from '../../store/useWorkforceStore';
import { toast } from 'sonner';
import { fetchAuthToken } from '@/utils/backend-request';
import { BACKEND_URL } from '@/entities/agents/hooks/useAgentStream';

/**
 * Subscribes to the swarm SSE event stream using fetch + auth token
 * (EventSource does not support custom headers, so we use fetch streaming).
 */
export function useSwarmEvents() {
    const { 
        isAutonomousMode, 
        swarmSessionId, 
        addSwarmEvent, 
        setSwarmTasks,
        updateNodeData 
    } = useWorkforceStore();
    
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!isAutonomousMode || !swarmSessionId) {
            abortRef.current?.abort();
            abortRef.current = null;
            return;
        }

        let cancelled = false;
        const ctrl = new AbortController();
        abortRef.current = ctrl;

        (async () => {
            console.log(`[Swarm] Connecting to event stream: ${swarmSessionId}`);
            try {
                const token = await fetchAuthToken();
                const res = await fetch(`${BACKEND_URL}/v1/agents/swarm/${swarmSessionId}/events`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                    signal: ctrl.signal,
                });

                if (!res.ok || !res.body) return;

                const reader = res.body.getReader();
                const dec = new TextDecoder();
                let buf = '';

                while (!cancelled) {
                    const { done, value } = await reader.read();
                    if (done || ctrl.signal.aborted) break;

                    buf += dec.decode(value, { stream: true });
                    const parts = buf.split('\n\n');
                    buf = parts.pop() ?? '';

                    for (const chunk of parts) {
                        const line = chunk.replace(/^data:\s*/m, '');
                        try {
                            const data = JSON.parse(line);
                            console.log('[Swarm Event]', data);
                            addSwarmEvent(data);

                            switch (data.type) {
                                case 'CYCLE_STARTED':
                                    toast.info('Coordinator cycle initiated');
                                    break;
                                case 'CYCLE_INSPECT':
                                case 'task_claimed':
                                    fetchBacklog();
                                    break;
                                case 'task_assigned':
                                    if (data.payload?.agentId) {
                                        updateNodeData(data.payload.agentId, { 
                                            status: 'BUSY',
                                            activeTaskId: data.payload.taskId 
                                        });
                                    }
                                    break;
                                case 'task_completed':
                                    if (data.payload?.agentId) {
                                        updateNodeData(data.payload.agentId, { 
                                            status: 'IDLE',
                                            activeTaskId: null 
                                        });
                                        toast.success(`Task ${data.payload.taskId?.slice(0, 8)} completed`);
                                    }
                                    fetchBacklog();
                                    break;
                                case 'task_failed':
                                    toast.error(`Task failed: ${data.payload?.error ?? 'Unknown error'}`);
                                    fetchBacklog();
                                    break;
                                case 'SESSION_STOPPED':
                                    toast.info('Swarm session ended');
                                    break;
                            }
                        } catch {}
                    }
                }
            } catch (e: any) {
                if (e?.name !== 'AbortError') {
                    console.error('[Swarm] SSE error', e);
                }
            }
        })();

        return () => {
            cancelled = true;
            ctrl.abort();
        };
    }, [isAutonomousMode, swarmSessionId]);

    const fetchBacklog = async () => {
        try {
            const token = await fetchAuthToken();
            const resp = await fetch(`${BACKEND_URL}/v1/agents/swarm/tasks?status=PENDING,OPEN,IN_PROGRESS&sessionId=${swarmSessionId}`, {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (resp.ok) {
                const data = await resp.json();
                setSwarmTasks(data.tasks);
            }
        } catch (err) {
            console.error('Failed to refresh backlog', err);
        }
    };
}
