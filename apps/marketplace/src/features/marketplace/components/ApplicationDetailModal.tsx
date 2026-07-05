"use client";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Calendar, Briefcase, Hash, ExternalLink,
    Sparkles
} from "lucide-react";
import { format } from "date-fns";

interface ApplicationDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    application: any;
}

export function ApplicationDetailModal({ isOpen, onClose, application }: ApplicationDetailModalProps) {
    if (!application) return null;

    const getFieldLabel = (fieldId: string, data: any) => {
        // If data already has a label (from system message structure), use it
        if (data && typeof data === 'object' && 'label' in data) return data.label;

        const schema = application.listing?.applicationSchema;
        let label = fieldId;

        if (schema) {
            // Flatten fields from sections if they exist, or use top-level fields
            const fields = schema.fields || (schema.sections && Array.isArray(schema.sections)
                ? schema.sections.flatMap((s: any) => s.fields || [])
                : []);

            const field = fields.find((f: any) => f.id === fieldId);
            if (field?.label) label = field.label;
        }

        // If no label found in schema, humanize the field ID
        if (label === fieldId) {
            // Remove timestamp prefixes if present (e.g., "123456789-email" -> "email")
            const cleanId = fieldId.replace(/^\d+-/, '');

            return cleanId
                .replace(/_/g, ' ')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/\b\w/g, l => l.toUpperCase());
        }

        return label;
    };

    const getFieldValue = (data: any) => {
        if (data && typeof data === 'object' && 'value' in data) return data.value;
        return data;
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-3xl sm:max-w-3xl overflow-hidden p-0 rounded-2xl border-none shadow-2xl [&>button]:z-50 [&>button]:cursor-pointer [&>button]:rounded-lg [&>button]:transition-all [&>button]:duration-150 [&>button]:hover:bg-slate-100 [&>button]:hover:text-slate-900 [&>button]:hover:scale-105">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-600/10 via-blue-500/5 to-transparent pointer-events-none" />

                <DialogHeader className="px-6 pt-8 pb-4 relative z-10">
                    <div className="flex items-center gap-4 mb-2">
                        <Avatar className="h-16 w-16 border-4 border-white shadow-lg">
                            <AvatarImage src={application.applicant.avatarUrl} className="object-cover" />
                            <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xl font-bold">
                                {application.applicant.name?.charAt(0).toUpperCase() || "?"}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-900">
                                {application.applicant.name}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-none px-2.5 py-0.5 rounded-full font-semibold flex items-center gap-1.5 text-xs">
                                    <Briefcase className="h-3 w-3" />
                                    {application.listingType}
                                </Badge>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <div className="max-h-[60vh] overflow-y-auto px-6 pb-8 custom-scrollbar">
                    <div className="space-y-6 relative z-10">
                        {/* Applied To Section */}
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium uppercase tracking-wider">
                            <Sparkles className="h-3 w-3 flex-shrink-0" />
                            <span className="leading-none">Applied To</span>
                        </div>
                        <div className="bg-slate-50/80 rounded-xl p-4 border border-slate-100 -mt-3">
                            <button
                                type="button"
                                className="group/link flex items-start gap-1.5 text-left cursor-pointer mb-3"
                                onClick={() => window.open(`/marketplace/listing/${application.listingId || application.listing?.id}`, '_blank')}
                            >
                                <h4 className="font-bold text-slate-900 text-lg leading-tight group-hover/link:underline group-hover/link:text-indigo-600 transition-colors">
                                    {application.listingTitle}
                                </h4>
                                <ExternalLink className="h-4 w-4 mt-1 flex-shrink-0 text-slate-400 opacity-0 group-hover/link:opacity-100 group-hover/link:text-indigo-500 transition-all" />
                            </button>
                            <div className="flex flex-wrap items-center gap-2">
                                {(application.listingId || application.listing?.id) && (
                                    <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 text-slate-600 text-xs font-mono font-medium px-2.5 py-1 rounded-lg shadow-sm">
                                        <Hash className="h-3 w-3 text-slate-400" />
                                        {application.listingId || application.listing?.id}
                                    </span>
                                )}
                                {(application.createdAt || application.appliedAt || application.appliedDate) && (
                                    <span className="inline-flex items-center gap-1.5 bg-indigo-50 border border-indigo-100 text-indigo-600 text-xs font-medium px-2.5 py-1 rounded-lg">
                                        <Calendar className="h-3 w-3" />
                                        Applied {format(
                                            new Date(application.createdAt || application.appliedAt || application.appliedDate),
                                            "MMM d, yyyy"
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Additional Answers Section (Dynamic Fields) */}
                        {application.answers && typeof application.answers === 'object' && Object.keys(application.answers).length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-1.5 text-indigo-600 font-medium text-xs uppercase tracking-wider">
                                    <Sparkles className="h-3 w-3 flex-shrink-0" />
                                    <span className="leading-none">Application Details</span>
                                </div>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(application.answers as Record<string, any>).map(([key, data]) => {
                                        const label = getFieldLabel(key, data);
                                        const value = getFieldValue(data);
                                        return (
                                            <div key={key} className="bg-slate-50/50 rounded-xl p-3.5 border border-slate-100/50 hover:bg-slate-50 transition-colors shadow-sm">
                                                <div className="font-semibold text-slate-500 text-xs mb-1 uppercase tracking-wider">{label}</div>
                                                <div className="text-slate-800 text-sm leading-relaxed whitespace-pre-wrap">
                                                    {typeof value === 'string' ? value : JSON.stringify(value)}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
