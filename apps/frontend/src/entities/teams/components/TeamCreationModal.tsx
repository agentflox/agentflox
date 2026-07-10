"use client";

import React, { useEffect } from "react";
import { Users2, Users } from "lucide-react";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/useToast";
import { useAppDispatch } from "@/hooks/useReduxStore";
import { useSession } from "next-auth/react";
import { skipToken } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import { upsertTeam } from "@/stores/slices/team.slice";
import { serializeDates } from "@/stores/utils/serialize";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";
import { TeamIcon } from "@/entities/teams/components/TeamIcon";

type TeamCreationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onCreated?: (id: string, spaceId?: string) => void;
	defaultSpaceId?: string;
};

const STATUS_OPTIONS = [
	{ label: "Published", value: "PUBLISHED", helper: "Showcase the team to collaborators immediately." },
	{ label: "Draft", value: "DRAFT", helper: "Keep things private while you're assembling the details." },
] as const;

const visibilityOptions = [
	{
		label: "Only Owners",
		value: "PRIVATE",
		description: "Only space owners can view and edit"
	},
	{
		label: "Owners & Admins",
		value: "ADMINS",
		description: "Owners and admins can view and edit"
	},
	{
		label: "Owners, Admins & Members",
		value: "MEMBERS",
		description: "All space members can view"
	},
	{
		label: "Anyone with Link",
		value: "PUBLIC",
		description: "Anyone with the link can view"
	},
];

const INITIAL_STATE = {
	name: "",
	description: "",
	status: "PUBLISHED",
	workspaceId: "",
	spaceId: "",
	icon: "T",
	color: "#3B82F6",
	hasManualIcon: false,
	visibility: "ADMINS" as "PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC",
};

export function TeamCreationModal({ open, onOpenChange, onCreated, defaultSpaceId }: TeamCreationModalProps) {
	const dispatch = useAppDispatch();
	const { toast } = useToast();
	const params = useParams();
	const [form, setForm] = React.useState(INITIAL_STATE);
	const createMutation = trpc.team.publish.useMutation();
	const isSubmitting = createMutation.isPending;
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();

	const { data: session } = useSession();
	const isInsideWorkspace = !!params?.workspaceId;

	// Fetch Data
	const queryInput = !isInsideWorkspace ? { scope: "owned" as const } : skipToken;
	const { data: workspacesData } = trpc.workspace.list.useQuery(queryInput, { enabled: open && !isInsideWorkspace });
	const workspaces = workspacesData?.items || [];

	const { data: spacesData } = trpc.space.list.useQuery(
		{ workspaceId: form.workspaceId },
		{ enabled: open && !!form.workspaceId }
	);
	const spaces = spacesData?.items || [];

	useEffect(() => {
		if (open) {
			const initialWorkspaceId = (params?.workspaceId as string) || "";
			const initialSpaceId = defaultSpaceId || (params?.spaceId as string) || (params?.id as string) || "";

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
		if (!form.name.trim()) {
			toast({
				title: "Missing details",
				description: "Please provide a team name.",
				variant: "destructive",
			});
			return;
		}

		try {
			const { id, data } = await createMutation.mutateAsync({
				name: form.name.trim(),
				description: form.description.trim() || undefined,
				status: form.status,
				workspaceId: form.workspaceId || undefined,
				spaceId: form.spaceId || undefined,
				icon: form.icon,
				color: form.color,
				visibility: form.visibility
			} as any);

			dispatch(upsertTeam({ id, data: serializeDates(data as any) }));

			// Optimistically update team list cache for sidebar
			queryClient.setQueriesData({ queryKey: [['team', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				if (oldData.items.some((i: any) => i.id === data.id)) return oldData;
				return { ...oldData, items: [data, ...oldData.items], total: (oldData.total || 0) + 1 };
			});
			queryClient.setQueriesData({ queryKey: [['team', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any, index: number) =>
						index === 0 ? { ...page, items: [data, ...page.items.filter((i: any) => i.id !== data.id)] } : page
					)
				};
			});

			if (form.spaceId) await utils.space.get.invalidate({ id: form.spaceId });

			// Defer invalidation to prevent overwrite of optimistic update
			setTimeout(() => {
				utils.team.list.invalidate();
			}, 1000);

			toast({
				title: "Team created",
				description: "You've unlocked a fresh space for your collaborators.",
			});
			onCreated?.(id, form.spaceId);
			onOpenChange(false);
		} catch (error: any) {
			console.error("Failed to create team:", error);
			toast({
				title: "Could not create the team",
				description: error?.message ?? "Please try again.",
				variant: "destructive",
			});
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl gap-6">
				{/* Header Section */}
				<div className="pb-2">
					<div className="flex items-start gap-5">
						<div className={cn(
							"mt-1 p-3 rounded-2xl border transition-all duration-300",
							"bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
							"group-hover:scale-105"
						)}>
							<Users className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
						</div>
						<div className="pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create a team
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Organize team members.
							</DialogDescription>
						</div>
					</div>
				</div>
				<form className="flex flex-col gap-5" onSubmit={handleSubmit}>
					{/* Location Selectors */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
						{!isInsideWorkspace && (
							<div className="space-y-2">
								<Label className="text-sm font-medium text-slate-700">Workspace <span className="text-[10px] font-normal lowercase">(optional)</span></Label>
								<Select
									value={form.workspaceId}
									onValueChange={(val) => setForm(prev => ({ ...prev, workspaceId: val, spaceId: "" }))}
								>
									<SelectTrigger className="w-full rounded-md bg-white">
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
							<Label className="text-sm font-medium text-slate-700">Space <span className="text-[10px] font-normal lowercase">(optional)</span></Label>
							<Select
								value={form.spaceId}
								onValueChange={(val) => setForm(prev => ({ ...prev, spaceId: val }))}
								disabled={!form.workspaceId}
							>
								<SelectTrigger className="w-full rounded-md bg-white">
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
						<Label htmlFor="team-name" className="text-sm font-medium text-slate-700">
							Icon & name <span className="text-destructive">*</span>
						</Label>
						<div className="flex items-center gap-2">
							<IconColorSelector
								icon={form.icon}
								color={form.color}
								onIconChange={(icon) => setForm(prev => ({ ...prev, icon, hasManualIcon: true }))}
								onColorChange={(color) => setForm(prev => ({ ...prev, color }))}
							>
								<Button
									type="button"
									variant="outline"
									size="icon"
									className="h-10 w-10 rounded-lg shrink-0 overflow-hidden grid place-items-center"
									style={{ backgroundColor: form.icon ? form.color : 'transparent' }}
								>
									<TeamIcon icon={form.icon} className="text-white" size={20} fill />
								</Button>
							</IconColorSelector>
							<Input
								id="team-name"
								name="name"
								placeholder="Ex: Growth Engineering Collective"
								value={form.name}
								onChange={(event) => {
									const newName = event.target.value;
									setForm((prev) => ({
										...prev,
										name: newName,
										...(!prev.hasManualIcon && { icon: newName.trim().charAt(0).toUpperCase() || "T" })
									}));
								}}
								className="flex-1 rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
								required
							/>
						</div>
					</div>

					<div className="space-y-2">
						<div className="flex items-center justify-between">
							<Label htmlFor="team-description" className="text-sm font-medium text-slate-700">
								Description <span className="text-[10px] font-normal lowercase">(optional)</span>
							</Label>
						</div>
						<Textarea
							id="team-description"
							name="description"
							placeholder="Outline who you’re looking for, the focus areas, or the goals for this season..."
							value={form.description}
							onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
							className="min-h-[100px] rounded-md border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-xs placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
						/>
					</div>

					<div className="space-y-2.5">
						<Label htmlFor="workspace-visibility" className="text-sm font-medium text-slate-700">
							Visibility
						</Label>
						<Select
							value={form.visibility}
							onValueChange={(value: any) => setForm(prev => ({ ...prev, visibility: value }))}
						>
							<SelectTrigger id="workspace-visibility" className="h-11 bg-muted/30 border-input/60">
								<SelectValue placeholder="Select visibility">
									{visibilityOptions.find((o) => o.value === form.visibility)?.label}
								</SelectValue>
							</SelectTrigger>
							<SelectContent>
								{visibilityOptions.map(({ value, label, description }) => (
									<SelectItem key={value} value={value} description={description}>
										{label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
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
								"w-full rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white shadow-lg shadow-teal-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-teal-500/40 sm:w-auto",
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
								"Create team"
							)}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default TeamCreationModal;
