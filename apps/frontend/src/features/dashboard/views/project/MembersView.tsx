"use client";

import { useEffect, useState } from "react";
import { AgentHiringModal } from "@/features/dashboard/components/modals/AgentHiringModal";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Loader2 } from "lucide-react";

export const MembersView = ({ projectId }: { projectId?: string }) => {
  const { data: session } = useSession();
  const { data: project, isLoading: isProjectLoading } = trpc.project.get.useQuery({ id: projectId });
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Fallback for missing projectId
  if (!projectId) {
    return <div className="p-6 text-muted-foreground">Project ID missing.</div>;
  }

  const fetchAgents = async () => {
    setLoading(true);
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
    try {
      const res = await fetch(`${apiUrl}/v1/agents/projects/${projectId}/agents`, {
        headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAgents(data);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if session is ready
    if (session?.accessToken) fetchAgents();
  }, [projectId, session?.accessToken]);

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Project Team</h1>
          <p className="text-slate-600">Manage your human and digital workforce.</p>
        </div>
        <AgentHiringModal projectId={projectId} onHireComplete={fetchAgents} />
      </div>

      {/* Agents Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
          <Bot className="h-5 w-5 text-indigo-600" /> Digital Workforce
        </h2>

        {loading && agents.length === 0 ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-indigo-600" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {agents.length === 0 ? (
              <div className="col-span-full p-8 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 bg-white">
                No agents hired yet. Click "Hire Agent" to add specialized AI capacity.
              </div>
            ) : (
              agents.map(agent => (
                <Card key={agent.id} className="border-indigo-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-indigo-50 flex items-center justify-center">
                      <Bot className="h-6 w-6 text-indigo-600" />
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-base truncate" title={agent.name}>{agent.name}</CardTitle>
                      <Badge variant="outline" className="text-xs bg-white text-indigo-600 border-indigo-200">{agent.metadata?.department || agent.type}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 mb-4 line-clamp-2 h-10">{agent.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {(agent.capabilities || []).slice(0, 3).map((c: string) => (
                        <Badge key={c} variant="secondary" className="text-xs bg-slate-100 text-slate-600 hover:bg-slate-200">{c}</Badge>
                      ))}
                      {(agent.capabilities?.length > 3) && <span className="text-xs text-slate-400 pl-1">+{agent.capabilities.length - 3} more</span>}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* Humans Section */}
      <div>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-slate-800">
          <User className="h-5 w-5 text-slate-600" /> Human Team
        </h2>
        {isProjectLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-6 w-6 text-slate-400" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(project?.members || []).length === 0 ? (
              <div className="col-span-full p-8 border border-dashed border-slate-300 rounded-lg text-center text-slate-500 bg-white">
                No human members found.
              </div>
            ) : (
              project.members.map((m: any) => (
                <Card key={m.id} className="border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="flex flex-row items-center gap-4 pb-2">
                    <div className="h-10 w-10 shrink-0 rounded-full bg-slate-50 flex items-center justify-center border border-slate-200">
                      {m.user?.image ? (
                        <img src={m.user.image} alt={m.user.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        <User className="h-6 w-6 text-slate-400" />
                      )}
                    </div>
                    <div className="overflow-hidden">
                      <CardTitle className="text-base truncate">{m.user?.name || m.user?.email || "Unknown Member"}</CardTitle>
                      <Badge variant="outline" className="text-xs bg-white text-slate-600 border-slate-200">{m.role || "Member"}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-xs text-slate-500 truncate">{m.user?.email}</p>
                    <div className="mt-4 flex justify-end">
                      <Button variant="ghost" size="sm" className="text-xs">Manage Permissions</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
