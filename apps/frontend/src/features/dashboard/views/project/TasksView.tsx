import { useParams } from 'next/navigation';
import { TaskView } from '@/entities/task/components/TaskView';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/useToast';
import { useState } from 'react';
import { useSession } from 'next-auth/react';

export const TasksView = () => {
  const { id: projectId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const [optimizing, setOptimizing] = useState(false);

  const { data: session } = useSession();

  const handleAutoSchedule = async () => {
    setOptimizing(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3002';
      const res = await fetch(`${apiUrl}/v1/projects/${projectId}/auto-schedule`, {
        method: 'POST',
        headers: { "Authorization": `Bearer ${session?.accessToken || ''}` }
      });

      if (!res.ok) throw new Error('Healing failed');
      const data = await res.json();

      toast({
        title: "Schedule Optimized",
        description: data.message || "Plan healed successfully.",
      });

    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to optimize schedule", variant: "destructive" });
    } finally {
      setOptimizing(false);
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Tasks</h1>
          <p className="text-muted-foreground">Manage project deliverables.</p>
        </div>
        <Button onClick={handleAutoSchedule} disabled={optimizing} className="bg-indigo-600 hover:bg-indigo-700">
          <Sparkles className={`mr-2 h-4 w-4 ${optimizing ? 'animate-spin' : ''}`} />
          {optimizing ? 'Healing Plan...' : 'Auto-Schedule'}
        </Button>
      </div>
      <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden">
        <TaskView
          context="PROJECT"
          contextId={projectId}
        />
      </div>
    </div>
  );
};
