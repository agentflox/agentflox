"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ExternalLinkIcon, FileTextIcon } from "lucide-react";

type MaterialSummary = {
	id: string;
	title: string;
	description?: string | null;
	category?: string | null;
	priceUsd?: number | null;
	isPublic?: boolean | null;
	fileUrl?: string | null;
	externalUrl?: string | null;
	updatedAt?: string | Date | null;
};

type Props = {
	item: MaterialSummary;
	onOpen?: (id: string) => void;
	onManage?: (id: string) => void;
	onPurchase?: (id: string) => void;
};

export function MaterialCard({ item, onOpen, onManage, onPurchase }: Props) {
	const updatedAt = item.updatedAt ? new Date(item.updatedAt) : undefined;

	return (
		<Card className="flex h-full flex-col">
			<CardHeader className="space-y-3">
				<div className="flex items-start justify-between gap-4">
					<div className="min-w-0 space-y-1">
						<CardTitle className="truncate text-lg">{item.title}</CardTitle>
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
			<CardContent className="flex flex-1 flex-col gap-4">
				{updatedAt && (
					<p className="text-xs text-muted-foreground">
						Updated {updatedAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
					</p>
				)}
			</CardContent>
			<CardFooter className="flex flex-wrap gap-2">
				<Button className="flex-1" onClick={() => onOpen?.(item.id)}>
					View details
				</Button>
				<Button variant="outline" onClick={() => onManage?.(item.id)}>
					Edit
				</Button>
			</CardFooter>
		</Card>
	);
}



