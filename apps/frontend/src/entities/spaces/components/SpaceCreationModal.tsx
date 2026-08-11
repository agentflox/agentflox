"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { useToast } from "@/hooks/useToast";
import { useUsageCapModal } from "@/features/usage/hooks/useUsageCapModal";
import { UsageRemainingHint } from "@/features/usage/components/UsageRemainingHint";
import { Loader2, Rocket, Layers, Sparkles } from "lucide-react";
import { SpaceIcon } from "@/entities/spaces/components/SpaceIcon";
import { cn } from "@/lib/utils";
import { IconColorSelector } from "@/components/ui/icon-color-selector";

interface CreateSpaceModalProps {
	workspaceId?: string;
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (spaceId: string) => void;
	initialName?: string;
}

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

export function SpaceCreationModal({ workspaceId, open, onOpenChange, onSuccess, initialName }: CreateSpaceModalProps) {
	const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(workspaceId ?? "");
	const [name, setName] = useState(initialName ?? "");
	const [description, setDescription] = useState("");
	const [icon, setIcon] = useState("");
	const [hasManualIcon, setHasManualIcon] = useState(false);
	const [color, setColor] = useState("#3B82F6");
	const [visibility, setVisibility] = useState<"PRIVATE" | "ADMINS" | "MEMBERS" | "EVERYONE" | "PUBLIC">("ADMINS");
	const [focusedField, setFocusedField] = useState<"name" | "description" | null>(null);
	const router = useRouter();
	const { toast } = useToast();
	const { handleError } = useUsageCapModal();
	const utils = trpc.useUtils();
	const queryClient = useQueryClient();

	// Reset form when modal opens
	useEffect(() => {
		if (open) {
			setSelectedWorkspaceId(workspaceId ?? "");
			setName(initialName ?? "");
			setDescription("");
			setIcon(initialName?.charAt(0).toUpperCase() || "S");
			setHasManualIcon(false);
			setColor("#3B82F6");
			setVisibility("ADMINS");
		}
	}, [open, initialName, workspaceId]);

	// Fetch workspaces if no workspaceId is provided
	const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "editable" as any, pageSize: 100 },
		{ enabled: open && !workspaceId }
	);

	const workspaces = workspacesData?.items ?? [];

	const createMutation = trpc.space.create.useMutation({
		onSuccess: (data, variables) => {
			toast({
				title: "Space created",
				description: "Your new space has been created successfully.",
			});

			queryClient.setQueriesData({ queryKey: [['space', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				if (oldData.items.some((i: any) => i.id === data.id)) return oldData;
				return { ...oldData, items: [data, ...oldData.items], total: (oldData.total || 0) + 1 };
			});

			queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any, index: number) =>
						index === 0 ? { ...page, items: [data, ...page.items.filter((i: any) => i.id !== data.id)] } : page
					)
				};
			});

			const targetWorkspaceId = variables.workspaceId || data.workspaceId;

			if (targetWorkspaceId) {
				// Optimistically update workspace cache
				utils.workspace.get.setData({ id: targetWorkspaceId }, (oldData: any) => {
					if (!oldData) return undefined;

					// Check if space already exists to avoid duplicates
					const existingSpaces = oldData.spaces || [];
					if (existingSpaces.some((s: any) => s.id === data.id)) return oldData;

					return {
						...oldData,
						spaces: [...existingSpaces, data]
					};
				});

				// Defer invalidation to allow UI to settle with optimistic data
				setTimeout(() => {
					utils.workspace.get.invalidate({ id: targetWorkspaceId });
				}, 1000);
			}

			setTimeout(() => {
				utils.space.list.invalidate();
				utils.space.listInfinite.invalidate();
			}, 1000);
			// Reset form
			setName("");
			setDescription("");
			setIcon("");
			setHasManualIcon(false);
			setColor("#3B82F6");
			setVisibility("ADMINS");
			onOpenChange(false);
			if (onSuccess) {
				onSuccess(data.id);
			}
		},
		onError: (error) => {
			if (handleError(error)) return;
			toast({
				title: "Failed to create space",
				description: error.message || "Something went wrong. Please try again.",
				variant: "destructive",
			});
		},
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!name.trim()) {
			toast({
				title: "Name required",
				description: "Please provide a name for the space.",
				variant: "destructive",
			});
			return;
		}

		const targetWorkspaceId = workspaceId || selectedWorkspaceId;

		await createMutation.mutateAsync({
			workspaceId: targetWorkspaceId || undefined,
			name: name.trim(),
			description: description.trim() || null,
			icon: icon,
			color: color,
			visibility: visibility,
			isActive: true,
		});
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
				{/* Header Section */}
				<div className="p-6 pb-2">
					<div className="flex items-start gap-5">
						<div className={cn(
							"mt-1 p-3 rounded-2xl border transition-all duration-300",
							"bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
							"group-hover:scale-105"
						)}>
							<Rocket className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
						</div>
						<div className="pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create New Space
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Organize your projects, teams, and resources.
							</DialogDescription>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col">
					<div className="px-6 py-6 space-y-6">
						{/* Workspace Selection (Only if no workspaceId prop provided) */}
						{!workspaceId && (
							<div className="space-y-2.5">
								<Label className="text-sm font-medium text-slate-700">
									Workspace <span className="text-[10px] font-normal lowercase">(optional)</span>
								</Label>
								<Select value={selectedWorkspaceId} onValueChange={setSelectedWorkspaceId}>
									<SelectTrigger className="h-11 bg-muted/30 border-input/60">
										<SelectValue placeholder="Select a workspace..." />
									</SelectTrigger>
									<SelectContent>
										{workspaces.map((ws) => (
											<SelectItem key={ws.id} value={ws.id}>
												{ws.name}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>
						)}

						{/* Icon & Name Field */}
						<div className="space-y-2.5">
							<Label
								htmlFor="name"
								className="text-sm font-medium text-slate-700"
							>
								Icon & name <span className="text-destructive">*</span>
							</Label>
							<div className="flex items-center gap-2">
								<IconColorSelector
									icon={icon}
									color={color}
									onIconChange={(newIcon) => {
										setIcon(newIcon);
										setHasManualIcon(true);
									}}
									onColorChange={setColor}
								>
									<Button
										type="button"
										variant="outline"
										size="icon"
										className="h-10 w-10 rounded-lg shrink-0 overflow-hidden"
										style={{ backgroundColor: icon ? color : 'transparent' }}
									>
										<SpaceIcon icon={icon} className="text-white" size={20} fill />
									</Button>
								</IconColorSelector>
								<Input
									id="name"
									placeholder="e.g. Marketing, Engineering, HR"
									value={name}
									onChange={(e) => {
										const newName = e.target.value;
										setName(newName);
										if (!hasManualIcon) {
											const firstChar = newName.trim().charAt(0).toUpperCase();
											setIcon(firstChar || "");
										}
									}}
									maxLength={50}
									onFocus={() => setFocusedField("name")}
									onBlur={() => setFocusedField(null)}
									disabled={createMutation.isPending}
									autoFocus
									className="flex-1 h-11 bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 shadow-sm"
								/>
							</div>
						</div>

						{/* Description Field */}
						<div className="space-y-2.5">
							<Label
								htmlFor="description"
								className="text-sm font-medium text-slate-700"
							>
								Description <span className="text-[10px] font-normal lowercase">(optional)</span>
							</Label>
							<div className="relative">
								<Textarea
									id="description"
									placeholder="Briefly describe the purpose of this space..."
									value={description}
									onChange={(e) => setDescription(e.target.value)}
									onFocus={() => setFocusedField("description")}
									onBlur={() => setFocusedField(null)}
									maxLength={500}
									disabled={createMutation.isPending}
									className="min-h-[100px] resize-none bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed shadow-sm py-3 rounded-md"
								/>
								<div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
									{description.length}/500
								</div>
							</div>
						</div>

						{/* Visibility Field */}
						<div className="space-y-2.5">
							<Label className="text-sm font-medium text-slate-700">
								Visibility
							</Label>
							<Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
								<SelectTrigger className="h-11 bg-muted/30 border-input/60">
									<SelectValue placeholder="Select visibility">
										{visibilityOptions.find((o) => o.value === visibility)?.label}
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
					</div>

					{/* Footer */}
					<div className="px-6 py-4 bg-muted/20 flex flex-wrap items-center justify-end gap-3 border-t border-border/40">
						<UsageRemainingHint kind="SPACE" className="mr-auto w-full sm:w-auto" />
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={createMutation.isPending}
							className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending}
							className={cn(
								"w-full rounded-xl bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-500 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/40 sm:w-auto",
								createMutation.isPending && "opacity-90"
							)}
						>
							{createMutation.isPending ? (
								<span className="flex items-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
									Creating...
								</span>
							) : (
								"Create space"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog >
	);
}
