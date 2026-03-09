import { notFound } from "next/navigation";
import Shell from "@/components/layout/Shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { prisma } from "@/lib/prisma";

async function getTask(id: string) {
	return prisma.task.findUnique({
		where: { id },
		include: {
			assignee: { select: { id: true, name: true, email: true } },
			project: { select: { id: true, name: true } },
			team: { select: { id: true, name: true } },
			channel: { select: { id: true, name: true } },
		},
	});
}

type TaskDetailPageProps = {
	params: Promise<{ id: string }>;
};

export default async function TaskDetailPage({ params }: TaskDetailPageProps) {
	const { id } = await params;
	const task = await getTask(id);
	if (!task) {
		return notFound();
	}

	const updatedAt = task.updatedAt ? task.updatedAt.toLocaleString() : null;

	return (
		<Shell>
			<div className="mx-auto flex max-w-5xl flex-col gap-6 py-6">
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="space-y-2">
						<h1 className="text-3xl font-semibold">{task.title}</h1>
						<p className="max-w-3xl text-sm text-muted-foreground">{task.description || "No description provided."}</p>
					</div>
					<div className="flex flex-wrap items-center gap-2">
						<Badge variant="secondary">{'ACTIVE'}</Badge>
						<Badge variant={task.isPublic ? "default" : "outline"}>{task.visibility}</Badge>
					</div>
				</div>

				<Card>
					<CardHeader>
						<CardTitle>Task meta</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4 text-sm">
						<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
							<div>
								<span className="text-muted-foreground">Assignee</span>
								<p className="font-medium">
									{task.assignee?.name || task.assignee?.email || "Unassigned"}
								</p>
							</div>
							<div>
								<span className="text-muted-foreground">Project</span>
								<p className="font-medium">{task.project?.name ?? "—"}</p>
							</div>
							<div>
								<span className="text-muted-foreground">Team</span>
								<p className="font-medium">{task.team?.name ?? "—"}</p>
							</div>
							<div>
								<span className="text-muted-foreground">Channel</span>
								<p className="font-medium">{task.channel?.name ? `#${task.channel.name}` : "—"}</p>
							</div>
						</div>
						<Separator />
						<div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
							<div>
								<div>Created</div>
								<div className="font-medium text-foreground">{task.createdAt.toLocaleString()}</div>
							</div>
							<div>
								<div>Last updated</div>
								<div className="font-medium text-foreground">{updatedAt}</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</Shell>
	);
}


