import { useParams } from 'next/navigation';
import { TaskView } from '@/entities/task/components/TaskView';

export const TasksView = () => {
  const { id: teamId } = useParams<{ id: string }>();
  
  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-4">Tasks</h1>
      <TaskView 
        context="TEAM" 
        contextId={teamId} 
      />
    </div>
  );
};
