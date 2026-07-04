"use client";

import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

const TaskDetailView = dynamic(
  () =>
    import("@/features/dashboard/views/task/TaskDetailView").then((mod) => mod.TaskDetailView),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />
      </div>
    ),
  }
);

export default function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="h-screen w-full overflow-hidden">
      <TaskDetailView
        taskId={id}
        onClose={() => router.back()}
        layoutMode="fullscreen"
      />
    </div>
  );
}
