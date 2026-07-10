"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { FileText, Loader2, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/useToast";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useEffect } from "react";

type LocationType = "WORKSPACE" | "SPACE" | "PROJECT" | "TEAM" | "FOLDER" | "LIST" | "PERSONAL";

const LOCATION_TYPES: { label: string; value: LocationType }[] = [
	{ label: "Personal", value: "PERSONAL" },
	{ label: "Workspace", value: "WORKSPACE" },
	{ label: "Space", value: "SPACE" },
	{ label: "Project", value: "PROJECT" },
	{ label: "Team", value: "TEAM" },
	{ label: "Folder", value: "FOLDER" },
	{ label: "List", value: "LIST" },
];

type DocumentCreationModalProps = {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	onSuccess?: (id: string) => void;
	workspaceId?: string;
};

export function DocumentCreationModal({ open, onOpenChange, onSuccess, workspaceId = "default" }: DocumentCreationModalProps) {
	const { toast } = useToast();
	const router = useRouter();
	const queryClient = useQueryClient();
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [focusedField, setFocusedField] = useState<"title" | "description" | null>(null);
	const [locationType, setLocationType] = useState<LocationType>("PERSONAL");
	const [locationId, setLocationId] = useState<string>("");

	const resolvedWorkspaceId = workspaceId !== "default" ? workspaceId : undefined;

	const { data: workspacesData } = trpc.workspace.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "WORKSPACE" });
	const { data: spacesData } = trpc.space.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "SPACE" });
	const { data: projectsData } = trpc.project.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "PROJECT" });
	const { data: teamsData } = trpc.team.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "TEAM" });
	const { data: foldersData } = trpc.folder.byContext.useQuery(
		{ workspaceId: resolvedWorkspaceId, archived: false },
		{ enabled: locationType === "FOLDER" && !!resolvedWorkspaceId }
	);
	const { data: listsData } = trpc.list.byContext.useQuery(
		{ workspaceId: resolvedWorkspaceId, archived: false },
		{ enabled: locationType === "LIST" && !!resolvedWorkspaceId }
	);

	const locationOptions = (() => {
		switch (locationType) {
			case "WORKSPACE": return workspacesData?.items || [];
			case "SPACE": return spacesData?.items || [];
			case "PROJECT": return projectsData?.items || [];
			case "TEAM": return teamsData?.items || [];
			case "FOLDER": return foldersData?.items || [];
			case "LIST": return listsData?.items || [];
			default: return [];
		}
	})();

	useEffect(() => {
		setLocationId("");
	}, [locationType]);

	const handleClearForm = () => {
		setTitle("");
		setDescription("");
		setLocationType("PERSONAL");
		setLocationId("");
		createDocument.reset();
	};

	const createDocument = trpc.document.create.useMutation({
		onSuccess: async (data) => {
			toast({
				title: "Document created",
				description: "Your document has been created successfully.",
			});

			queryClient.setQueriesData({ queryKey: [['document', 'list']] }, (oldData: any) => {
				if (!oldData || !oldData.items) return oldData;
				if (oldData.items.some((i: any) => i.id === data.id)) return oldData;
				return { ...oldData, items: [data, ...oldData.items], total: (oldData.total || 0) + 1 };
			});
			queryClient.setQueriesData({ queryKey: [['document', 'listInfinite']] }, (oldData: any) => {
				if (!oldData || !oldData.pages) return oldData;
				return {
					...oldData,
					pages: oldData.pages.map((page: any, index: number) =>
						index === 0 ? { ...page, items: [data, ...page.items.filter((i: any) => i.id !== data.id)] } : page
					)
				};
			});

			onOpenChange(false);
			handleClearForm();
			onSuccess?.(data.id);
			router.refresh();
		},
		onError: (error) => {
			toast({
				title: "Error creating document",
				description: error.message || "An error occurred while creating the document.",
				variant: "destructive",
			});
		},
	});

	const isSubmitting = createDocument.isPending;

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		if (!title.trim()) {
			toast({ title: "Document title is required", variant: "destructive" });
			return;
		}

		if (locationType !== "PERSONAL" && !locationId) {
			toast({ title: "Please select a location", variant: "destructive" });
			return;
		}

		if ((locationType === "FOLDER" || locationType === "LIST") && !resolvedWorkspaceId) {
			toast({ title: "Workspace context required", description: "Folder and list locations require a workspace.", variant: "destructive" });
			return;
		}

		createDocument.mutate({
			title: title.trim(),
			description: description.trim() || undefined,
			workspaceId: locationType === "WORKSPACE" ? locationId : (locationType === "PERSONAL" ? resolvedWorkspaceId : resolvedWorkspaceId),
			spaceId: locationType === "SPACE" ? locationId : undefined,
			projectId: locationType === "PROJECT" ? locationId : undefined,
			teamId: locationType === "TEAM" ? locationId : undefined,
			folderId: locationType === "FOLDER" ? locationId : undefined,
			listId: locationType === "LIST" ? locationId : undefined,
		});
	};

	return (
		<Dialog
			open={open}
			onOpenChange={(next) => {
				if (!next) {
					handleClearForm();
				}
				onOpenChange(next);
			}}
		>
			<DialogContent className="sm:max-w-xl p-0 overflow-hidden gap-0 border-border/50 shadow-2xl bg-background/95 backdrop-blur-xl transition-all duration-300">
				<div className="p-6 pb-2">
					<div className="flex items-start gap-5">
						<div className={cn(
							"mt-1 p-3 rounded-2xl border transition-all duration-300",
							"bg-primary/5 border-primary/10 text-primary shadow-[0_0_15px_-3px_rgba(0,0,0,0.1)]",
							"group-hover:scale-105"
						)}>
							<FileText className="w-5 h-5 md:w-6 md:h-6" strokeWidth={1.5} />
						</div>
						<div className="pt-1">
							<DialogTitle className="text-xl font-bold tracking-tight text-foreground/95">
								Create New Document
							</DialogTitle>
							<DialogDescription className="text-muted-foreground text-sm leading-relaxed">
								Start writing your documentation.
							</DialogDescription>
						</div>
					</div>
				</div>

				<form className="flex flex-col" onSubmit={handleSubmit}>
					<div className="px-6 py-6 space-y-6">
						<div className="space-y-2.5">
							<Label className="text-sm font-medium text-slate-700">
								Scope
							</Label>
							<div className="flex gap-4">
								<div className="w-1/3">
									<Select value={locationType} onValueChange={(val: LocationType) => setLocationType(val)}>
										<SelectTrigger>
											<SelectValue placeholder="Select scope" />
										</SelectTrigger>
										<SelectContent>
											{LOCATION_TYPES.map((type) => (
												<SelectItem key={type.value} value={type.value}>
													{type.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
								{locationType !== "PERSONAL" && (
									<div className="w-2/3">
										<Select value={locationId} onValueChange={setLocationId}>
											<SelectTrigger>
												<SelectValue placeholder={`Select ${locationType.toLowerCase()}`} />
											</SelectTrigger>
											<SelectContent>
												{(locationType === "FOLDER" || locationType === "LIST") && !resolvedWorkspaceId ? (
													<SelectItem value="empty" disabled>Workspace context required</SelectItem>
												) : locationOptions.length === 0 ? (
													<SelectItem value="empty" disabled>No items found</SelectItem>
												) : (
													locationOptions.map((item: any) => (
														<SelectItem key={item.id} value={item.id}>
															{item.name}
														</SelectItem>
													))
												)}
											</SelectContent>
										</Select>
									</div>
								)}
							</div>
						</div>
						<div className="space-y-2.5">
							<Label
								htmlFor="document-title"
								className="text-sm font-medium text-slate-700"
							>
								Title <span className="text-destructive">*</span>
							</Label>
							<Input
								id="document-title"
								name="title"
								placeholder="e.g. Project Specs, Meeting Notes"
								value={title}
								onChange={(event) => setTitle(event.target.value)}
								onFocus={() => setFocusedField("title")}
								onBlur={() => setFocusedField(null)}
								disabled={isSubmitting}
								autoFocus
								className="flex-1 h-11 bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 shadow-sm"
								required
							/>
						</div>

						<div className="space-y-2.5">
							<Label
								htmlFor="document-description"
								className="text-sm font-medium text-slate-700"
							>
								Description <span className="text-[10px] font-normal lowercase">(optional)</span>
							</Label>
							<div className="relative">
								<Textarea
									id="document-description"
									name="description"
									placeholder="Briefly describe what this document is about..."
									value={description}
									onChange={(event) => setDescription(event.target.value)}
									onFocus={() => setFocusedField("description")}
									onBlur={() => setFocusedField(null)}
									maxLength={500}
									disabled={isSubmitting}
									className="min-h-[100px] resize-none bg-muted/30 border-input/60 hover:bg-muted/50 focus:bg-background transition-all duration-200 focus:ring-2 focus:ring-primary/20 text-sm leading-relaxed shadow-sm py-3 rounded-md"
								/>
								<div className="absolute bottom-2 right-2 text-xs text-muted-foreground/50 pointer-events-none">
									{description.length}/500
								</div>
							</div>
						</div>
					</div>

					<div className="px-6 py-4 bg-muted/20 flex items-center justify-end gap-3 border-t border-border/40">
						<Button
							type="button"
							variant="ghost"
							className="w-full rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 sm:w-auto" onClick={() => {
								handleClearForm();
								onOpenChange(false);
							}}
							disabled={isSubmitting}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={isSubmitting}
							className={cn(
								"w-full rounded-xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-purple-500/40 sm:w-auto",
								isSubmitting && "opacity-90"
							)}
						>
							{isSubmitting ? (
								<span className="flex items-center gap-2">
									<span className="size-4 animate-spin rounded-full border-2 border-white/60 border-t-white" />
									Creating...
								</span>
							) : (
								"Create document"
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default DocumentCreationModal;
