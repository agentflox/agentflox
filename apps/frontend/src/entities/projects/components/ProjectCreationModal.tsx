"use client";

import React, { useEffect } from "react";
import { Sparkles } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { upsertProject } from "@/stores/slices/project.slice";
import { serializeDates } from "@/stores/utils/serialize";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";


type ProjectCreationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (id: string, spaceId?: string) => void; // Updated sig
	defaultSpaceId?: string; // Optional prop to override
};

const STATUS_OPTIONS = [
	{ label: "Published", value: "PUBLISHED", helper: "Visible to your entire workspace." },
	{ label: "Draft", value: "DRAFT", helper: "Perfect while you're still polishing the details." },
] as const;

const VISIBILITY_OPTIONS = [
	{ label: "Private - Only members", value: "PRIVATE" },
	{ label: "Internal - All Workspace members", value: "INTERNAL" },
	{ label: "Public - Anyone with link", value: "PUBLIC" },
];

const INITIAL_STATE = {
	name: "",
	description: "",
	status: "PUBLISHED",
	workspaceId: "",
	spaceId: "",
	icon: "💼",
	color: "#4F46E5",
	visibility: "PRIVATE" as "PRIVATE" | "INTERNAL" | "PUBLIC",
};

export function ProjectCreationModal({ open, onOpenChange, onCreated, defaultSpaceId }: ProjectCreationModalProps) {
	const dispatch = useAppDispatch();
	const { toast } = useToast();
	const params = useParams();
	const [form, setForm] = React.useState(INITIAL_STATE);
	const createMutation = trpc.project.publish.useMutation();
	const isSubmitting = createMutation.isPending;
	const utils = trpc.useUtils();

	const { data: session } = useSession();
	const isInsideWorkspace = !!params?.workspaceId;

	// Fetch Data
	const queryInput = !isInsideWorkspace ? { scope: "owned" as const } : undefined;
	const { data: workspacesData } = trpc.workspace.list.useQuery(queryInput, { enabled: open });
	const workspaces = workspacesData?.items || [];

	const { data: spacesData } = trpc.space.list.useQuery(
		{ workspaceId: form.workspaceId },
		{ enabled: open && !!form.workspaceId }
	);
	const spaces = spacesData?.items || [];

	useEffect(() => {
		if (open) {
			const initialWorkspaceId = (params?.workspaceId as string) || "";
			// If defaultSpaceId passed (e.g. from Sidebar + button), use it. Else use URL param.
			const initialSpaceId = defaultSpaceId || (params?.spaceId as string) || (params?.id as string) || "";
			// Check if 'id' matches space logic if needed, but safe to default empty.

			setForm({
				...INITIAL_STATE,
				workspaceId: initialWorkspaceId,
				spaceId: initialSpaceId
			});
			createMutation.reset();
		}
	}, [open, params, defaultSpaceId]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!form.name.trim() || !form.description.trim()) {
			toast({
				title: "Missing details",
				description: "Please provide both a title and a short description.",
				variant: "destructive",
			});
			return;
		}

		try {
			const { id, data } = await createMutation.mutateAsync({
				name: form.name.trim(),
				description: form.description.trim(),
				status: form.status,
				workspaceId: form.workspaceId || undefined,
				spaceId: form.spaceId || undefined,
				icon: form.icon,
				color: form.color,
				visibility: form.visibility
			} as any);

			dispatch(upsertProject({ id, data: serializeDates(data as any) }));

			// Optimistically update project list cache for sidebar
			utils.project.list.setData(
				{ workspaceId: form.workspaceId, scope: "owned", pageSize: 50 },
				(oldData: any) => {
					if (!oldData) return undefined;

					// Avoid duplicates
					const existingItems = oldData.items || [];
					if (existingItems.some((i: any) => i.id === data.id)) return oldData;

					return {
						...oldData,
						items: [data, ...existingItems]
					};
				}
			);

			if (form.spaceId) await utils.space.get.invalidate({ id: form.spaceId });

			// Defer invalidation to prevent overwrite of optimistic update
			setTimeout(() => {
				utils.project.list.invalidate();
			}, 1000);

			toast({
				title: "Project created",
				description: "Your project draft is ready.",
			});
			onCreated?.(id, form.spaceId);
			onOpenChange(false);
		} catch (error: any) {
			console.error("Failed to create project:", error);
			toast({
				title: "Could not create the project",
				description: error?.message ?? "Please try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl gap-6">
				<DialogHeader className="gap-1.5">
					<DialogTitle className="text-2xl font-semibold tracking-tight">Launch a new project</DialogTitle>
					<DialogDescription className="text-base text-muted-foreground">
						Capture the essentials now, refine the rest later.
					</DialogDescription>
				</DialogHeader>

				<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
					{/* Location Selectors */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{!isInsideWorkspace && (
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700">Workspace</Label>
								<Select
									value={form.workspaceId}
									onValueChange={(val) => setForm(prev => ({ ...prev, workspaceId: val, spaceId: "" }))} // Reset space on workspace change
								>
									<SelectTrigger className="w-full rounded-xl bg-white">
										<SelectValue placeholder="Select Workspace" />
									</SelectTrigger>
									<SelectContent>
										{workspaces.map(w => (
											<SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}
						<div className="space-y-2">
							<Label className="text-sm font-medium text-slate-700">Space (Optional)</Label>
							<Select
								value={form.spaceId}
								onValueChange={(val) => setForm(prev => ({ ...prev, spaceId: val }))}
								disabled={!form.workspaceId}
							>
								<SelectTrigger className="w-full rounded-xl bg-white">
									<SelectValue placeholder={form.workspaceId ? "Select Space" : "Select Workspace First"} />
								</SelectTrigger>
								<SelectContent>
									{spaces.map(s => (
										<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="project-name" className="text-sm font-medium text-slate-700">
							Icon & name
						</Label>
						<div className="flex items-center gap-2">
							<IconColorSelector
								icon={form.icon}
								color={form.color}
								onIconChange={(icon) => setForm(prev => ({ ...prev, icon }))}
								onColorChange={(color) => setForm(prev => ({ ...prev, color }))}
							>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10 rounded-lg shrink-0"
									style={{ backgroundColor: form.color }}
								>
									<span className="text-lg">{form.icon}</span>
								</Button>
							</IconColorSelector>
							<Input
								id="project-name"
								name="name"
								placeholder="Ex: Horizon AI Workbench"
								value={form.name}
								onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
								className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
								required
							/>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="project-description" className="text-sm font-medium text-slate-700">
								Description
							</Label>
						</div>
						<Textarea
							id="project-description"
							name="description"
							placeholder="Share the vision, mission, or the problem you're about to solve..."
							value={form.description}
							onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
							className="min-h-[100px] rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
							required
						/>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="project-status" className="text-sm font-medium text-slate-700">
								Status
							</Label>
							<Select value={form.status} onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}>
								<SelectTrigger id="project-status" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-xs focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200">
									<SelectValue placeholder="Choose status" />
								</SelectTrigger>
								<SelectContent className="rounded-2xl border border-slate-100 shadow-xl">
									{STATUS_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value} className="rounded-lg px-3 py-2.5">
											<span className="flex flex-col items-start gap-0.5">
												<span className="text-sm font-semibold text-slate-900">{option.label}</span>
												<span className="text-xs text-muted-foreground">{option.helper}</span>
											</span>
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
						<div className="space-y-2">
							<Label htmlFor="project-visibility" className="text-sm font-medium text-slate-700">
								Visibility
							</Label>
							<Select value={form.visibility} onValueChange={(value: any) => setForm((prev) => ({ ...prev, visibility: value }))}>
								<SelectTrigger id="project-visibility" className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-left text-sm text-slate-900 shadow-xs focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200">
									<SelectValue placeholder="Choose visibility" />
								</SelectTrigger>
								<SelectContent className="rounded-2xl border border-slate-100 shadow-xl">
									{VISIBILITY_OPTIONS.map((option) => (
										<SelectItem key={option.value} value={option.value} className="rounded-lg px-3 py-2.5">
											{option.label}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					<DialogFooter className="gap-3">
						<Button
							type="button"
							variant="ghost"
							className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							className={cn(
								"w-full rounded-xl bg-gradient-to-r from-cyan-500 via-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/30 transition hover:shadow-2xl sm:w-auto",
								isSubmitting && "opacity-90"
							)}
							disabled={isSubmitting}
						>
							{isSubmitting ? (
								<span className="flex items-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
									Creating...
								</span>
							) : (
								"Create project"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default ProjectCreationModal;
