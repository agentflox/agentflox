"use client";

import { useParams, useRouter } from "next/navigation";
import { TaskDetailView } from "@/features/dashboard/views/task/TaskDetailView";

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