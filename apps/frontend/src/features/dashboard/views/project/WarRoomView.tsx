"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useSession } from 'next-auth/react';
import { useToast } from '@/hooks/useToast';
import { Swords, Play, Loader2, Bot, User, StopCircle } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface WarRoomViewProps {
    projectId: string;
}

export function WarRoomView({ projectId }: WarRoomViewProps) {
    const { data: session } = useSession();
    const { toast } = useToast();
    const [activeSimulation, setActiveSimulation] = useState<any>(null);
    const [agents, setAgents] = useState<any[]>([]);
    const [topic, setTopic] = useState('');
    const [mode, setMode] = useState<'ROUND_ROBIN' | 'DYNAMIC'>('ROUND_ROBIN');
    const [isLoading, setIsLoading] = useState(false);
    const [isSimulating, setIsSimulating] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Load hired agents
    useEffect(() => {
        if (!projectId) return;
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
        fetch(`${apiUrl}/v1/agents/projects/${projectId}/agents`, {
            headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
        }).then(res => res.json()).then(data => {
            if (Array.isArray(data)) setAgents(data);
        }).catch(console.error);
    }, [projectId, session]);

    // Handle Start
    const startSimulation = async () => {
        if (!topic) {
            toast({ title: "Topic required", description: "Please enter a topic for the simulation.", variant: "destructive" });
            return;
        }
        if (agents.length < 2) {
            toast({ title: "Insufficient Agents", description: "You need at least 2 agents to run a simulation.", variant: "destructive" });
            return;
        }

        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
            const res = await fetch(`${apiUrl}/v1/agents/simulations/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${session?.accessToken || ''}`
                },
                body: JSON.stringify({
                    projectId,
                    topic,
                    mode,
                    agentIds: agents.map(a => a.id)
                })
            });

            if (!res.ok) throw new Error("Failed to start");

            const data = await res.json();
            // data is the conversation object. It needs 'messages' to be initialized.
            // The endpoint creates it, but might not return included messages. 
            // We should fetch it or assume it has SYSTEM message.
            // Actually, let's fetch it to be sure.
            const simRes = await fetch(`${apiUrl}/v1/agents/simulations/${data.id}`, {
                headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
            });
            const simData = await simRes.json();
            setActiveSimulation(simData);
        } catch (e) {
            console.error(e);
            toast({ title: "Error", description: "Failed to start simulation", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const stepSimulation = async () => {
        if (!activeSimulation) return;
        setIsSimulating(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
            const res = await fetch(`${apiUrl}/v1/agents/simulations/${activeSimulation.id}/step`, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
            });

            if (!res.ok) throw new Error("Step failed");

            const newMessage = await res.json();

            // Use functional state update to prevent stale closures if multiple clicks, 
            // though button is disabled during sim.
            setActiveSimulation((prev: any) => {
                if (!prev) return null;
                return {
                    ...prev,
                    messages: [...(prev.messages || []), newMessage]
                }
            });

        } catch (e) {
            console.error(e);
            toast({ title: "Simulation Step Failed", description: "An error occurred during the agent's turn.", variant: "destructive" });
        } finally {
            setIsSimulating(false);
        }
    };

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [activeSimulation?.messages]);

    // Auto-play logic
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isAutoPlaying && !isSimulating && activeSimulation) {
            interval = setTimeout(() => {
                stepSimulation();
            }, 3000); // 3-second delay between turns
        }
        return () => clearTimeout(interval);
    }, [isAutoPlaying, isSimulating, activeSimulation]);

    const summarizeSimulation = async () => {
        setIsLoading(true);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
            const res = await fetch(`${apiUrl}/v1/agents/simulations/${activeSimulation.id}/summarize`, {
                method: 'POST',
                headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
            });

            if (!res.ok) throw new Error("Summarization failed");

            const data = await res.json();
            setSummary(data);

        } catch (e) {
            console.error(e);
            toast({ title: "Summarization Failed", description: "Could not generate summary.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    if (activeSimulation) {
        return (
            <div className="flex flex-col h-[calc(100vh-10rem)] max-w-6xl mx-auto w-full gap-4">
                <Card className="shrink-0 border-l-4 border-l-primary">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <div className="flex items-center gap-2">
                                <Swords className="h-5 w-5 text-primary" />
                                <CardTitle>War Room</CardTitle>
                            </div>
                            <CardDescription className="mt-1 font-medium text-black">Topic: {activeSimulation.metadata?.topic}</CardDescription>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setActiveSimulation(null)}>
                                <StopCircle className="mr-2 h-4 w-4" /> End Session
                            </Button>
                            <Button variant="secondary" onClick={() => setIsAutoPlaying(!isAutoPlaying)}>
                                {isAutoPlaying ? "Pause Auto-Play" : "Auto-Play"}
                            </Button>
                            <Button variant="destructive" onClick={summarizeSimulation} disabled={isLoading}>
                                {isLoading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : "Summarize"}
                            </Button>
                            <Button onClick={stepSimulation} disabled={isSimulating || isAutoPlaying}>
                                {isSimulating ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                                Next Turn
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Participants:</span>
                            {agents.map(a => (
                                <Badge key={a.id} variant="secondary" className="hover:bg-primary/20">{a.name}</Badge>
                            ))}
                        </div>
                        {summary && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-900">
                                <h4 className="font-bold flex items-center gap-2 mb-2">
                                    <Bot className="w-4 h-4" /> Executive Summary
                                </h4>
                                <div className="whitespace-pre-wrap">{summary.summary}</div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card className="flex-1 overflow-hidden flex flex-col shadow-sm">
                    <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-slate-50/50" ref={scrollRef}>
                        {activeSimulation.messages?.map((msg: any) => {
                            const isSystem = msg.role === 'SYSTEM';
                            const isAgent = msg.role === 'ASSISTANT';
                            const agentName = msg.metadata?.agentName || msg.role;

                            if (isSystem) {
                                return (
                                    <div key={msg.id} className="flex justify-center my-4">
                                        <span className="bg-zinc-100 text-zinc-500 text-xs px-3 py-1 rounded-full border">
                                            {msg.content}
                                        </span>
                                    </div>
                                );
                            }

                            return (
                                <div key={msg.id} className={cn("flex gap-4 max-w-3xl", isAgent ? "mr-auto" : "ml-auto")}>
                                    <Avatar className="h-10 w-10 border-2 border-white shadow-sm">
                                        <AvatarFallback className={cn(isAgent ? "bg-primary/10 text-primary" : "bg-zinc-100")}>
                                            {isAgent ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm text-zinc-900">{agentName}</span>
                                            <span className="text-xs text-zinc-400">{new Date(msg.createdAt).toLocaleTimeString()}</span>
                                        </div>
                                        <div className="bg-white p-4 rounded-2xl rounded-tl-none border shadow-sm text-sm leading-relaxed text-zinc-700">
                                            {msg.content}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                        {isSimulating && (
                            <div className="flex gap-4 max-w-3xl animate-pulse">
                                <Avatar className="h-10 w-10 border-2 border-white">
                                    <AvatarFallback className="bg-zinc-100"><Bot className="h-5 w-5 text-zinc-400" /></AvatarFallback>
                                </Avatar>
                                <div className="space-y-2 w-full">
                                    <div className="h-4 bg-zinc-200 rounded w-24"></div>
                                    <div className="h-16 bg-zinc-100 rounded-2xl w-3/4"></div>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto h-[calc(100vh-10rem)] flex items-center justify-center p-6">
            <Card className="w-full max-w-md border-2 shadow-lg">
                <CardHeader className="text-center space-y-4 pb-8">
                    <div className="mx-auto bg-primary/10 p-4 rounded-full w-fit">
                        <Swords className="h-10 w-10 text-primary" />
                    </div>
                    <div>
                        <CardTitle className="text-2xl">War Room Simulations</CardTitle>
                        <CardDescription className="text-base mt-2">
                            Simulate strategic discussions between your autonomous agents to stress-test ideas and find weaknesses.
                        </CardDescription>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Simulation Topic</label>
                        <Input
                            placeholder="e.g. Q4 Marketing Strategy Review"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="h-11"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-700">Simulation Mode</label>
                        <div className="flex gap-2 p-1 bg-zinc-100 rounded-lg">
                            <button
                                onClick={() => setMode('ROUND_ROBIN')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                    mode === 'ROUND_ROBIN' ? "bg-white shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                Round Robin
                            </button>
                            <button
                                onClick={() => setMode('DYNAMIC')}
                                className={cn(
                                    "flex-1 py-2 text-sm font-medium rounded-md transition-all",
                                    mode === 'DYNAMIC' ? "bg-white shadow-sm text-primary" : "text-zinc-500 hover:text-zinc-700"
                                )}
                            >
                                Dynamic Debate
                            </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {mode === 'ROUND_ROBIN'
                                ? "Agents take turns speaking in a fixed order."
                                : "Agents speak when they have something relevant to say. The system facilitates the flow."}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-sm font-medium text-zinc-700">Participants</label>
                            <span className="text-xs text-zinc-500">{agents.length} available</span>
                        </div>
                        {agents.length > 0 ? (
                            <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 rounded-lg border min-h-[3rem]">
                                {agents.map(agent => (
                                    <Badge key={agent.id} variant="secondary" className="bg-white border text-zinc-700 font-normal hover:bg-white text-xs py-1">
                                        <Bot className="w-3 h-3 mr-1 text-primary" />
                                        {agent.name}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-800 text-sm">
                                No agents hired yet. Go to the <strong>Members</strong> tab to hire department agents.
                            </div>
                        )}
                    </div>

                    <Button
                        className="w-full h-11 text-base shadow-md hover:shadow-lg transition-all"
                        onClick={startSimulation}
                        disabled={isLoading || agents.length < 2}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Play className="mr-2 fill-current" />}
                        Start Simulation
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
