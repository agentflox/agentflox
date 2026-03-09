'use client';

import React from 'react';
import { useWorkforceStore } from './store/useWorkforceStore';
import { Users, Workflow, Zap, Activity, Shield, Cpu } from 'lucide-react';

export default function SwarmView() {
    const { nodes } = useWorkforceStore();

    // Mock data for agents - in a real app this would come from an API
    const agents = [
        { id: '1', name: 'Strategy Manager', role: 'MANAGER', status: 'ACTIVE', tasks: 3, load: 65, specialty: 'Planning' },
        { id: '2', name: 'Content Orchestrator', role: 'MANAGER', status: 'ACTIVE', tasks: 5, load: 80, specialty: 'Creation' },
        { id: '3', name: 'Technical Researcher', role: 'WORKER', status: 'IDLE', tasks: 0, load: 0, specialty: 'Doc Analysis' },
        { id: '4', name: 'Code Executor', role: 'WORKER', status: 'EXECUTING', tasks: 1, load: 45, specialty: 'Refactoring' },
    ];

    const poolTasks = [
        { id: 't1', title: 'Analyze Q4 Competitor Report', priority: 'HIGH', type: 'RESEARCH' },
        { id: 't2', title: 'Generate Documentation for API v2', priority: 'NORMAL', type: 'WRITING' },
        { id: 't3', title: 'Security Audit of Auth Module', priority: 'CRITICAL', type: 'SECURITY' },
    ];

    return (
        <div className="flex-1 p-6 overflow-auto bg-background/50">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Active Swarm', value: '4 Agents', icon: Users, color: 'text-blue-500' },
                        { label: 'Throughput', value: '142 tasks/hr', icon: Zap, color: 'text-yellow-500' },
                        { label: 'System Health', value: '99.9%', icon: Activity, color: 'text-green-500' },
                        { label: 'Active Guards', value: '12 Policies', icon: Shield, color: 'text-purple-500' },
                    ].map((stat, i) => (
                        <div key={i} className="bg-background border border-border/50 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-center justify-between mb-2">
                                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                                <span className="text-xs font-medium text-muted-foreground uppercase">{stat.label}</span>
                            </div>
                            <div className="text-2xl font-bold">{stat.value}</div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Agent Swarm List */}
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold flex items-center gap-2">
                                <Cpu className="h-5 w-5 text-primary" />
                                Active Swarm Workforce
                            </h2>
                            <button className="text-sm text-primary hover:underline">Hire New Agent</button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {agents.map((agent) => (
                                <div key={agent.id} className="bg-background border border-border rounded-xl p-5 hover:border-primary/50 transition-colors group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold group-hover:text-primary transition-colors">{agent.name}</h3>
                                            <div className="flex gap-2 items-center mt-1">
                                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${agent.role === 'MANAGER' ? 'bg-purple-500/10 text-purple-600' : 'bg-blue-500/10 text-blue-600'
                                                    }`}>
                                                    {agent.role}
                                                </span>
                                                <span className="text-xs text-muted-foreground">{agent.specialty}</span>
                                            </div>
                                        </div>
                                        <div className={`h-2 w-2 rounded-full animate-pulse ${agent.status === 'ACTIVE' ? 'bg-green-500' :
                                                agent.status === 'EXECUTING' ? 'bg-blue-500' : 'bg-gray-400'
                                            }`} />
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-muted-foreground">Neural Load</span>
                                                <span className="font-medium">{agent.load}%</span>
                                            </div>
                                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-500 ${agent.load > 75 ? 'bg-red-500' : agent.load > 40 ? 'bg-yellow-500' : 'bg-green-500'
                                                        }`}
                                                    style={{ width: `${agent.load}%` }}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-border/50">
                                            <div className="text-xs">
                                                <span className="text-muted-foreground">Active Tasks: </span>
                                                <span className="font-bold">{agent.tasks}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button className="text-[11px] font-bold px-3 py-1 bg-secondary hover:bg-secondary/80 rounded transition-colors">
                                                    Manage
                                                </button>
                                                <button className="text-[11px] font-bold px-3 py-1 bg-primary text-primary-foreground rounded hover:opacity-90 transition-opacity">
                                                    Assign Task
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Task Pool (Pull Mode) */}
                    <div className="space-y-4">
                        <h2 className="text-lg font-semibold flex items-center gap-2 text-yellow-600 dark:text-yellow-500">
                            <Zap className="h-5 w-5" />
                            Swarm Task Pool
                        </h2>
                        <div className="bg-background border border-border rounded-xl flex flex-col min-h-[400px]">
                            <div className="p-4 border-b border-border bg-secondary/20 rounded-t-xl">
                                <div className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Unassigned Queue</div>
                            </div>
                            <div className="flex-1 p-2 space-y-2 overflow-auto max-h-[500px]">
                                {poolTasks.map((task) => (
                                    <div key={task.id} className="p-3 bg-background border border-border/60 rounded-lg hover:border-yellow-500/30 transition-all cursor-pointer group">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-[10px] font-bold px-1.5 rounded ${task.priority === 'CRITICAL' ? 'bg-red-500/10 text-red-600' :
                                                    task.priority === 'HIGH' ? 'bg-orange-500/10 text-orange-600' : 'bg-gray-500/10 text-gray-600'
                                                }`}>
                                                {task.priority}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground">{task.type}</span>
                                        </div>
                                        <div className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">{task.title}</div>
                                        <div className="mt-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button className="flex-1 text-[10px] bg-primary/10 text-primary py-1 rounded hover:bg-primary/20 font-bold uppercase">Push</button>
                                            <button className="flex-1 text-[10px] bg-secondary py-1 rounded hover:bg-secondary/80 font-bold uppercase">Delete</button>
                                        </div>
                                    </div>
                                ))}
                                {poolTasks.length === 0 && (
                                    <div className="h-32 flex flex-col items-center justify-center text-muted-foreground italic text-sm">
                                        Pool is currently empty
                                    </div>
                                )}
                            </div>
                            <div className="p-3 bg-secondary/10 border-t border-border mt-auto">
                                <button className="w-full py-2 bg-primary/5 hover:bg-primary/10 text-primary text-xs rounded-md border border-primary/20 transition-all font-semibold">
                                    + Add Global Swarm Task
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
