"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [focusedField, setFocusedField] = useState<"title" | "description" | null>(null);
	const [locationType, setLocationType] = useState<LocationType>("PERSONAL");
	const [locationId, setLocationId] = useState<string>("");

	const { data: workspacesData } = trpc.workspace.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "WORKSPACE" });
	const { data: spacesData } = trpc.space.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "SPACE" });
	const { data: projectsData } = trpc.project.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "PROJECT" });
	const { data: teamsData } = trpc.team.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "TEAM" });
	const { data: foldersData } = trpc.folder.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "FOLDER" });
	const { data: listsData } = trpc.list.list.useQuery({ scope: "all", pageSize: 100 }, { enabled: locationType === "LIST" });

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

	const createDocument = trpc.view.create.useMutation({
		onSuccess: async (data) => {
			toast({
				title: "Document created",
				description: "Your document has been created successfully.",
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

		createDocument.mutate({
			name: title.trim(),
			description: description.trim() || undefined,
			type: "DOC",
			locationType,
			workspaceId: locationType === "WORKSPACE" ? locationId : (locationType === "PERSONAL" ? (workspaceId !== "default" ? workspaceId : undefined) : undefined),
			spaceId: locationType === "SPACE" ? locationId : undefined,
			projectId: locationType === "PROJECT" ? locationId : undefined,
			teamId: locationType === "TEAM" ? locationId : undefined,
			folderId: locationType === "FOLDER" ? locationId : undefined,
			listId: locationType === "LIST" ? locationId : undefined,
			isPrivate: locationType === "PERSONAL",
			config: {},
			sidebarView: true
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
							<Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
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
												{locationOptions.length === 0 ? (
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
								className={cn(
									"text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
									focusedField === "title" ? "text-primary" : "text-muted-foreground"
								)}
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
								className={cn(
									"text-xs font-semibold uppercase tracking-wider transition-colors duration-200",
									focusedField === "description" ? "text-primary" : "text-muted-foreground"
								)}
							>
								Description <span className="text-muted-foreground font-normal lowercase">(optional)</span>
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
							className="h-10 px-4 hover:bg-transparent hover:text-foreground text-muted-foreground font-medium transition-colors"
							onClick={() => {
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
							className="h-10 px-5 font-semibold shadow-lg hover:shadow-primary/25 transition-all duration-300"
						>
							{isSubmitting ? (
								<>
									<Loader2 className="mr-2 h-4 w-4 animate-spin" />
									Creating...
								</>
							) : (
								<>
									<Sparkles className="mr-2 h-4 w-4" />
									Create Document
								</>
							)}
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default DocumentCreationModal;