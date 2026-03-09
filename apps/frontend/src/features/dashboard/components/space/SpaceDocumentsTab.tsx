"use client";

import { FileText } from "lucide-react";

export function SpaceDocumentsTab() {
    return (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 py-20 px-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm mb-4">
                <FileText className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-900">Documents</h3>
            <p className="mt-2 text-sm text-slate-500">
                Document management will be available here soon.
            </p>
        </div>
    );
}
