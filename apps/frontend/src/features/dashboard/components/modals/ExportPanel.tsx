"use client";

import { useState } from "react";
import { X, Printer, Code, FileDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ExportPanelProps {
    onClose?: () => void;
    title?: string;
    content?: string;
}

export function ExportPanel({ onClose, title = "Untitled", content = "" }: ExportPanelProps) {
    const [exportScope, setExportScope] = useState<"this-page" | "entire-doc">("this-page");

    // Helper to download a file
    const downloadFile = (filename: string, content: string, mimeType: string) => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Helper for printing / PDF
    const handlePrintOrPdf = () => {
        // Create a hidden iframe or open a new window to print just the content
        const printWindow = window.open("", "_blank");
        if (!printWindow) return;
        
        printWindow.document.write(`
            <html>
                <head>
                    <title>${title}</title>
                    <style>
                        body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; }
                        h1 { font-size: 2em; border-bottom: 1px solid #eaeaea; padding-bottom: 0.5em; }
                        img { max-width: 100%; height: auto; }
                    </style>
                </head>
                <body>
                    <h1>${title}</h1>
                    ${content}
                </body>
            </html>
        `);
        printWindow.document.close();
        
        // Wait for images to load before printing
        setTimeout(() => {
            printWindow.focus();
            printWindow.print();
        }, 250);
        
        if (onClose) onClose();
    };

    const handleHtmlExport = () => {
        const htmlContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; padding: 2rem; max-width: 800px; margin: 0 auto; color: #333; }
                    h1, h2, h3 { color: #111; }
                    img { max-width: 100%; height: auto; border-radius: 8px; }
                    pre { background: #f4f4f5; padding: 1rem; border-radius: 8px; overflow-x: auto; }
                    blockquote { border-left: 4px solid #e4e4e7; margin: 0; padding-left: 1rem; color: #71717a; }
                </style>
            </head>
            <body>
                <h1>${title}</h1>
                ${content}
            </body>
            </html>
        `;
        downloadFile(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.html`, htmlContent, "text/html");
        if (onClose) onClose();
    };

    const handleMarkdownExport = () => {
        // Very basic HTML to Markdown conversion since we don't have TurndownService
        let md = content
            .replace(/<h1>(.*?)<\/h1>/gi, '# $1\n\n')
            .replace(/<h2>(.*?)<\/h2>/gi, '## $1\n\n')
            .replace(/<h3>(.*?)<\/h3>/gi, '### $1\n\n')
            .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
            .replace(/<b>(.*?)<\/b>/gi, '**$1**')
            .replace(/<em>(.*?)<\/em>/gi, '*$1*')
            .replace(/<i>(.*?)<\/i>/gi, '*$1*')
            .replace(/<p>(.*?)<\/p>/gi, '$1\n\n')
            .replace(/<br\s*\/?>/gi, '\n')
            .replace(/<ul>(.*?)<\/ul>/gis, (match, p1) => {
                return p1.replace(/<li>(.*?)<\/li>/gi, '- $1\n') + '\n';
            })
            .replace(/<ol>(.*?)<\/ol>/gis, (match, p1) => {
                let i = 1;
                return p1.replace(/<li>(.*?)<\/li>/gi, () => `${i++}. $1\n`) + '\n';
            })
            .replace(/<a href="(.*?)">(.*?)<\/a>/gi, '[$2]($1)')
            .replace(/<img src="(.*?)" alt="(.*?)"[^>]*>/gi, '![$2]($1)')
            .replace(/<[^>]+>/g, ''); // strip remaining tags

        const fullMd = `# ${title}\n\n${md}`;
        downloadFile(`${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`, fullMd, "text/markdown");
        if (onClose) onClose();
    };

    return (
        <div className="w-full h-full flex flex-col bg-white overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 shrink-0">
                <h3 className="text-sm font-semibold text-zinc-900 tracking-tight">Export</h3>
                {onClose && (
                    <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 cursor-pointer transition-colors" onClick={onClose}>
                        <X className="h-3.5 w-3.5" />
                    </Button>
                )}
            </div>

            {/* Scope Selection */}
            <div className="flex items-center gap-6 px-4 py-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                        exportScope === "this-page" ? "border-purple-600 bg-white" : "border-zinc-300 group-hover:border-zinc-400 bg-white"
                    )}>
                        {exportScope === "this-page" && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                        )}
                    </div>
                    <span className="text-sm text-zinc-700">This page</span>
                    <input 
                        type="radio" 
                        className="hidden" 
                        checked={exportScope === "this-page"} 
                        onChange={() => setExportScope("this-page")} 
                    />
                </label>

                <label className="flex items-center gap-2 cursor-pointer group">
                    <div className={cn(
                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors",
                        exportScope === "entire-doc" ? "border-purple-600 bg-white" : "border-zinc-300 group-hover:border-zinc-400 bg-white"
                    )}>
                        {exportScope === "entire-doc" && (
                            <div className="w-2 h-2 rounded-full bg-purple-600" />
                        )}
                    </div>
                    <span className="text-sm text-zinc-700">Entire Doc</span>
                    <input 
                        type="radio" 
                        className="hidden" 
                        checked={exportScope === "entire-doc"} 
                        onChange={() => setExportScope("entire-doc")} 
                    />
                </label>
            </div>

            {/* Formats */}
            <div className="px-2 pb-4 pt-2 flex flex-col">
                <div className="px-2 mb-2 text-xs font-medium text-zinc-500">
                    Export as
                </div>
                
                <button 
                    onClick={handlePrintOrPdf}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 transition-colors cursor-pointer"
                >
                    <div className="flex items-center justify-center w-5 h-5 text-[10px] font-bold text-zinc-500">
                        PDF
                    </div>
                    <span>PDF</span>
                </button>

                <button 
                    onClick={handleHtmlExport}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 transition-colors cursor-pointer"
                >
                    <div className="flex items-center justify-center w-5 h-5 text-zinc-500">
                        <Code className="h-4 w-4" />
                    </div>
                    <span>HTML</span>
                </button>

                <button 
                    onClick={handleMarkdownExport}
                    className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 transition-colors cursor-pointer"
                >
                    <div className="flex items-center justify-center w-5 h-5 text-[10px] font-bold border border-zinc-400 rounded-[3px] text-zinc-500 h-4 px-0.5">
                        M↓
                    </div>
                    <span>Markdown</span>
                </button>

                {exportScope === "this-page" && (
                    <button 
                        onClick={handlePrintOrPdf}
                        className="flex items-center gap-3 px-2 py-2 rounded-lg text-sm text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 active:bg-zinc-100 transition-colors cursor-pointer"
                    >
                        <div className="flex items-center justify-center w-5 h-5 text-zinc-500">
                            <Printer className="h-4 w-4" />
                        </div>
                        <span>Print</span>
                    </button>
                )}
            </div>
        </div>
    );
}
