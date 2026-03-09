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

const VISIBILITY_OPTIONS = [
	{
		label: "Only Owners",
		value: "OWNERS_ONLY",
		description: "Only space owners can view and edit"
	},
	{
		label: "Owners & Admins",
		value: "OWNERS_ADMINS",
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
	const [visibility, setVisibility] = useState<"OWNERS_ONLY" | "OWNERS_ADMINS" | "MEMBERS" | "PUBLIC">("OWNERS_ONLY");
	const [focusedField, setFocusedField] = useState<"name" | "description" | null>(null);
	const router = useRouter();
	const { toast } = useToast();
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
			setVisibility("OWNERS_ONLY");
		}
	}, [open, initialName, workspaceId]);

	// Fetch workspaces if no workspaceId is provided
	const { data: workspacesData } = trpc.workspace.list.useQuery(
		{ scope: "editable" as any, pageSize: 100 },
		{ enabled: open && !workspaceId }
	);

	const workspaces = workspacesData?.items ?? [];

	const createMutation = trpc.space.create.useMutation({
		onMutate: async (variables) => {
			// Optimistic update - add new space to sidebar immediately
			const tempId = `temp-${Date.now()}`;
			queryClient.setQueriesData({ queryKey: [['space', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				const newSpace = {
					id: tempId,
					name: variables.name,
					icon: variables.icon,
					color: variables.color,
					isActive: true,
					workspaceId: variables.workspaceId,
				};
				return {
					...oldData,
					pages: oldData.pages.map((page: any, index: number) =>
						index === 0 ? { ...page, items: [newSpace, ...page.items] } : page
					)
				};
			});
		},
		onSuccess: (data, variables) => {
			toast({
				title: "Space created",
				description: "Your new space has been created successfully.",
			});

			const targetWorkspaceId = variables.workspaceId;

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

			utils.space.list.invalidate({ workspaceId: targetWorkspaceId } as any);
			utils.space.listInfinite.invalidate({ workspaceId: targetWorkspaceId } as any);
			// Also invalidate global list if we are in global view
			utils.space.list.invalidate({ workspaceId: undefined } as any);

			// Defer invalidation to allow UI to settle with optimistic data
			setTimeout(() => {
				utils.workspace.get.invalidate({ id: targetWorkspaceId });
			}, 1000);
			// Reset form
			setName("");
			setDescription("");
			setIcon("");
			setHasManualIcon(false);
			setColor("#3B82F6");
			setVisibility("OWNERS_ONLY");
			onOpenChange(false);
			if (onSuccess) {
				onSuccess(data.id);
			}
		},
		onError: (error) => {
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

		if (!targetWorkspaceId) {
			toast({
				title: "Workspace required",
				description: "Please select a workspace for this space.",
				variant: "destructive",
			});
			return;
		}

		await createMutation.mutateAsync({
			workspaceId: targetWorkspaceId,
			name: name.trim(),
			description: description.trim() || null,
			icon: icon,
			color: color,
			visibility: visibility,
			isActive: true,
		} as any);
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[500px] p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
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
						<div className="space-y-1.5 pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create New Space
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Organize your projects, teams, and resources within a dedicated environment.
							</DialogDescription>
						</div>
					</div>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col">
					<div className="px-6 py-6 space-y-6">
						{/* Workspace Selection (Only if no workspaceId prop provided) */}
						{!workspaceId && (
							<div className="space-y-2.5">
								<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
									Workspace
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
								className={cn(
									"text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
									focusedField === "name" ? "text-primary" : "text-muted-foreground"
								)}
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
										<SpaceIcon icon={icon} className="text-white" size={20} />
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
								className={cn(
									"text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
									focusedField === "description" ? "text-primary" : "text-muted-foreground"
								)}
							>
								Description (optional)
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
									className="min-h-[100px] resize-none bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed shadow-sm py-3"
								/>
								<div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
									{description.length}/500
								</div>
							</div>
						</div>

						{/* Visibility Field */}
						<div className="space-y-2.5">
							<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
								Visibility
							</Label>
							<Select value={visibility} onValueChange={(v: any) => setVisibility(v)}>
								<SelectTrigger className="h-11 bg-muted/30 border-input/60">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									{VISIBILITY_OPTIONS.map(opt => (
										<SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>
					</div>

					{/* Footer */}
					<div className="px-6 py-4 bg-muted/20 flex items-center justify-end gap-3 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={createMutation.isPending}
							className="h-10 px-4 hover:bg-transparent hover:text-foreground text-muted-foreground font-medium transition-colors"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending}
							className="h-10 px-5 font-semibold shadow-lg hover:shadow-primary/25 transition-all duration-300"
						>
							{createMutation.isPending ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating Space...
								</>
							) : (
								<>
									<Sparkles className="mr-2 h-4 w-4" />
									Create Space
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
