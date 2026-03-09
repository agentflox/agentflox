// components/material/MaterialView.tsx

import { ExternalLinkIcon, FileTextIcon, LockIcon, DollarSign, Clock, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

// Define the structure of the Material data needed for the component
interface MaterialData {
    id: string;
    title: string;
    description: string | null;
    category: string;
    priceUsd: number | null;
    thumbnailUrl: string | null;
    fileUrl: string | null;
    externalUrl: string | null;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
}

interface MaterialViewProps {
    material: MaterialData;
}

/**
 * MaterialView: Detailed view for the material owner/internal user.
 * Displays all metadata, timestamps, and administrative access points.
 */
export function MaterialView({ material }: MaterialViewProps) {
    // Helper to format currency
    const formattedPrice = material.priceUsd != null && material.priceUsd > 0
        ? `$${material.priceUsd.toFixed(2)}`
        : "Free";
    
    return (
        <div className="space-y-8">
            {/* Header Section */}
            <header className="space-y-3 border-b pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h1 className="text-4xl font-extrabold tracking-tight">{material.title}</h1>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-sm font-semibold">{material.category}</Badge>
                        <Badge variant={material.isPublic ? "default" : "secondary"} className="text-sm font-semibold">
                            {material.isPublic ? "Public" : "Private"}
                        </Badge>
                    </div>
                </div>
                <p className="max-w-4xl text-lg text-muted-foreground">{material.description || "No description provided for this material."}</p>
            </header>

            {/* Actions and Media Section (Two-Column Layout) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Column 1: Feature Image */}
                <div className="lg:col-span-2 space-y-4">
                    <h2 className="text-xl font-semibold border-b pb-2">Preview</h2>
                    {material.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={material.thumbnailUrl} 
                            alt={`Cover image for ${material.title}`} 
                            className="w-full h-80 object-cover rounded-xl shadow-lg border"
                        />
                    ) : (
                        <div className="w-full h-80 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-muted-foreground border border-dashed">
                            No Feature Image Uploaded
                        </div>
                    )}
                </div>

                {/* Column 2: Administrative Details Card */}
                <div className="lg:col-span-1 space-y-4">
                    <Card className="shadow-md">
                        <CardHeader>
                            <CardTitle className="text-xl">Administrative Info</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            
                            {/* Timestamps */}
                            <div className="space-y-2 pt-2 border-t">
                                <div className="text-xs flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Created</span>
                                    <span className="font-medium text-foreground">{material.createdAt.toLocaleDateString()}</span>
                                </div>
                                <div className="text-xs flex items-center justify-between">
                                    <span className="text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/> Last Updated</span>
                                    <span className="font-medium text-foreground">{material.updatedAt.toLocaleDateString()}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                    
                    {/* Primary Actions Card (Download/External Links) */}
                    <Card className="shadow-sm">
                        <CardHeader className="py-3">
                            <CardTitle className="text-lg">Access Points</CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col gap-3">
                            {material.fileUrl && (
                                <Button className="w-full" size="lg">
                                    <a href={material.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2">
                                        Download Master File <FileTextIcon className="h-5 w-5" />
                                    </a>
                                </Button>
                            )}
                            {material.externalUrl && (
                                <Button variant="outline" className="w-full">
                                    <a href={material.externalUrl} target="_blank" rel="noreferrer" className="inline-flex items-center justify-center gap-2">
                                        View External Link <ExternalLinkIcon className="h-4 w-4" />
                                    </a>
                                </Button>
                            )}
                            {!material.fileUrl && !material.externalUrl && (
                                <p className="text-sm text-center text-muted-foreground italic">No files or external links provided.</p>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            
            {/* Owner-specific actions (Placeholder) */}
            <div className="pt-4 border-t">
                <div className="flex gap-3">
                    <Button variant="primary">Edit Material</Button>
                    <Button variant="destructive">Delete Material</Button>
                    {/* Add more management buttons like Unpublish, View Analytics, etc. */}
                </div>
            </div>
        </div>
    );
}
