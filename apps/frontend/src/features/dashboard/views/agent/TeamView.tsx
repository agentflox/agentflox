"use client";
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Users, ArrowRight, Network } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export function TeamView({ agent }: { agent: any }) {
    const { data: relations, isLoading } = trpc.agent.getRelations.useQuery(
        { agentId: agent?.id || '' },
        { enabled: !!agent?.id }
    );

    if (!agent) return <div>No agent selected</div>;
    if (isLoading) return
    <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
    </div>;

    return (
        <div className="space-y-8 p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">Agent Team</h2>
                    <p className="text-muted-foreground">Manage sub-agents, supervisors, and peers.</p>
                </div>
                <Button>
                    <Plus className="mr-2 h-4 w-4" /> Add Relation
                </Button>
            </div>

            {/* Hierarchy Visualizer (Simplified) */}
            <div className="grid gap-6 md:grid-cols-3">

                {/* Supervisors */}
                <Card className="md:col-span-1 border-l-4 border-l-blue-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Users className="h-5 w-5 text-blue-500" /> Supervisors
                        </CardTitle>
                        <CardDescription>Agents that manage this agent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {relations?.supervisors.length === 0 && <p className="text-sm text-muted-foreground italic">No supervisors.</p>}
                        {relations?.supervisors.map((sup: any) => (
                            <div key={sup.id} className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-lg border transition-colors">
                                <Avatar>
                                    <AvatarImage src={sup.avatar} />
                                    <AvatarFallback>{sup.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate">{sup.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{sup.agentType}</p>
                                </div>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Current Agent */}
                <Card className="md:col-span-1 border-2 border-primary/20 bg-primary/5 shadow-md transform scale-105 z-10">
                    <CardHeader>
                        <CardTitle className="flex items-center justify-center gap-2 text-primary">
                            This Agent
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center text-center space-y-4 pb-8">
                        <div className="relative">
                            <Avatar className="h-24 w-24 border-4 border-white shadow-xl">
                                <AvatarImage src={agent.avatar} />
                                <AvatarFallback className="text-2xl">{agent.name[0]}</AvatarFallback>
                            </Avatar>
                            <Badge className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 scale-110 shadow-sm" variant={agent.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                {agent.status}
                            </Badge>
                        </div>
                        <div className="pt-2">
                            <h3 className="font-bold text-xl">{agent.name}</h3>
                            <p className="text-sm text-muted-foreground font-mono mt-1 px-2 py-0.5 bg-slate-200/50 rounded inline-block text-xs">{agent.agentType}</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Sub-Agents */}
                <Card className="md:col-span-1 border-l-4 border-l-green-500 shadow-sm">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <Network className="h-5 w-5 text-green-500" /> Sub-Agents
                        </CardTitle>
                        <CardDescription>Agents managed by this agent</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {relations?.subAgents.length === 0 && <p className="text-sm text-muted-foreground italic">No sub-agents assigned.</p>}
                        {relations?.subAgents.map((sub: any) => (
                            <div key={sub.id} className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-lg border transition-colors cursor-pointer group">
                                <Avatar>
                                    <AvatarImage src={sub.avatar} />
                                    <AvatarFallback>{sub.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium truncate group-hover:text-primary transition-colors">{sub.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{sub.agentType}</p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all" />
                            </div>
                        ))}
                    </CardContent>
                </Card>
            </div>

            {/* Peers */}
            <Card className="shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                        <Users className="h-5 w-5 text-purple-500" /> Peer Agents
                    </CardTitle>
                    <CardDescription>Collaborators with shared context</CardDescription>
                </CardHeader>
                <CardContent>
                    {relations?.peers.length === 0 && <p className="text-sm text-muted-foreground italic">No peer agents.</p>}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                        {relations?.peers.map((peer: any) => (
                            <div key={peer.id} className="flex items-center gap-3 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-lg border transition-colors cursor-pointer hover:border-purple-200">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={peer.avatar} />
                                    <AvatarFallback>{peer.name[0]}</AvatarFallback>
                                </Avatar>
                                <div className="overflow-hidden">
                                    <p className="font-medium truncate text-sm">{peer.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize truncate">{peer.agentType}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
