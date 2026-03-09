"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { HelpCircle, MessageSquare, Book, LifeBuoy, Zap, FileText } from "lucide-react";

export default function HelpPage() {
    return (
        <FeaturePageLayout
            badge="Help Center"
            title="How Can We Help?"
            description="Search our knowledge base, troubleshoot issues, or contact our award-winning support team."
            heroVisual={
                <div className="w-full h-full p-8 flex flex-col items-center justify-center gap-4">
                    <div className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 flex items-center gap-3">
                        <Search size={18} className="text-gray-400" />
                        <div className="h-4 w-1 bg-white/20 animate-pulse" /> {/* Cursor */}
                        <div className="text-gray-500 text-sm">Search for "billing", "api keys"...</div>
                    </div>
                    <div className="flex gap-2">
                        <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 hover:bg-white/10 cursor-pointer">Reset Password</div>
                        <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 hover:bg-white/10 cursor-pointer">API Rate Limits</div>
                        <div className="text-[10px] bg-white/5 px-2 py-1 rounded text-gray-400 hover:bg-white/10 cursor-pointer">Deploy Error</div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Knowledge Base",
                    description: "Hundreds of articles covering account management, billing, and platform features.",
                    icon: Book
                },
                {
                    title: "Status Page",
                    description: "Check current system status, uptime history, and scheduled maintenance windows.",
                    icon: Zap
                },
                {
                    title: "Contact Support",
                    description: "Enterprise customers get 24/7 priority phone and email support with 15-minute SLAs.",
                    icon: LifeBuoy
                }
            ]}
            stats={[
                { label: "CSAT", value: "98%", subtext: "Customer Satisfaction" },
                { label: "Response", value: "<1h", subtext: "Average time" },
                { label: "Articles", value: "1k+", subtext: "Self-serve guides" }
            ]}
        />
    );
}

import { Search } from "lucide-react";
