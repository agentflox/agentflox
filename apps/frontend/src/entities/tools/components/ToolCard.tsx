"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon } from "lucide-react";

type ToolSummary = {
	id: string;
	name: string;
	description?: string | null;
	category?: string | null;
	productUrl?: string | null;
	isPublic?: boolean | null;
	updatedAt?: string | Date | null;
};

type Props = {
	item: ToolSummary;
	onOpen?: (id: string) => void;
	onManage?: (id: string) => void;
};

export function ToolCard({ item, onOpen, onManage }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="space-y-3">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<CardTitle className="truncate text-lg">{item.name}</CardTitle>
						{item.category && <Badge variant="outline">{item.category}</Badge>}
					</div>
					<Badge variant={item.isPublic ? "default" : "secondary"}>
						{item.isPublic ? "Public" : "Private"}
					</Badge>
				</div>
				{item.description && (
					<p className="line-clamp-3 text-sm text-muted-foreground">{item.description}</p>
				)}
			</CardHeader>
			<CardContent className="flex flex-1 flex-col gap-2 text-xs">
				{item.productUrl && (
					<a
						className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
						href={item.productUrl}
						target="_blank"
						rel="noreferrer"
					>
						Visit product <ExternalLinkIcon className="h-3.5 w-3.5" />
					</a>
				)}
				{updatedAt && (
					<span className="text-muted-foreground">
						Updated {updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
					</span>
				)}
			</CardContent>
			<CardFooter className="flex gap-2">
				<Button className="flex-1" onClick={() => onOpen?.(item.id)}>
					View details
				</Button>
				<Button variant="outline" onClick={() => onManage?.(item.id)}>
					Edit tool
				</Button>
			</CardFooter>
		</Card>
	);
}



