"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserPlus, Bot, Check, Loader2 } from "lucide-react";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

interface AgentRole {
    department: string;
    displayName: string;
    description: string;
    capabilities: string[];
}

interface AgentHiringModalProps {
    projectId: string;
    onHireComplete?: () => void;
    trigger?: React.ReactNode;
}

export function AgentHiringModal({ projectId, onHireComplete, trigger }: AgentHiringModalProps) {
    const [open, setOpen] = useState(false);
    const [roles, setRoles] = useState<AgentRole[]>([]);
    const [loading, setLoading] = useState(false);
    const [hiring, setHiring] = useState<string | null>(null);
    const { data: session } = useSession();

    // Fetch roles
    useEffect(() => {
        if (open && roles.length === 0) {
            setLoading(true);
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';

            fetch(`${apiUrl}/v1/agents/hiring/roles`, {
                headers: {
                    "Authorization": `Bearer ${session?.accessToken || ''}`
                }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) {
                        setRoles(data);
                    } else {
                        console.error("Invalid roles data", data);
                    }
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [open, session]);

    const handleHire = async (department: string) => {
        setHiring(department);
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
            const response = await fetch(`${apiUrl}/v1/agents/projects/${projectId}/hire`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "Authorization": `Bearer ${session?.accessToken || ''}`
                },
                body: JSON.stringify({ department })
            });

            if (response.ok) {
                setOpen(false);
                onHireComplete?.();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setHiring(null);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || <Button variant="outline"><UserPlus className="mr-2 h-4 w-4" /> Hire Agent</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Hire Autonomous Agent</DialogTitle>
                    <DialogDescription>
                        Select a specialized AI agent to join your project team. They can execute tasks, draft content, and analyze data.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {roles.map((role) => (
                            <Card key={role.department} className={cn("border-2 hover:border-primary/50 transition-colors cursor-pointer", hiring === role.department && "opacity-50 pointer-events-none")} onClick={() => handleHire(role.department)}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-primary/10 p-2 rounded-lg">
                                            <Bot className="h-6 w-6 text-primary" />
                                        </div>
                                        <Badge variant="secondary">{role.department}</Badge>
                                    </div>
                                    <CardTitle className="mt-4">{role.displayName}</CardTitle>
                                    <CardDescription>{role.description}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2 text-xs">
                                        {role.capabilities.map(cap => (
                                            <span key={cap} className="px-2 py-1 bg-muted rounded-full text-muted-foreground">{cap}</span>
                                        ))}
                                    </div>
                                    <Button className="w-full mt-4" disabled={hiring === role.department} onClick={(e) => { e.stopPropagation(); handleHire(role.department); }}>
                                        {hiring === role.department ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <UserPlus className="mr-2 h-4 w-4" />}
                                        {hiring === role.department ? "Hiring..." : "Hire Agent"}
                                    </Button>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
