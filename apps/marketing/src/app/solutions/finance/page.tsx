"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Building2, Scale, SearchCheck, FileText, AlertTriangle, PieChart } from "lucide-react";

export default function FinancePage() {
    return (
        <FeaturePageLayout
            badge="For Financial Services"
            title="Algorithmic Accuracy"
            description="Process loans, audit transactions, and analyze markets with zero human error. Bank-grade security meets autonomous speed."
            heroVisual={
                <div className="w-full h-full p-6 flex flex-col gap-4">
                    <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-4 overflow-hidden relative">
                        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:20px_20px]" />
                        {/* Chart Line */}
                        <div className="absolute bottom-0 left-0 right-0 h-32 flex items-end px-4 gap-1">
                            {[20, 30, 25, 40, 35, 50, 60, 55, 70, 80, 75, 90].map((h, i) => (
                                <div key={i} className="flex-1 bg-green-500/20 rounded-t relative group hover:bg-green-500/40 transition-colors">
                                    <div className="absolute bottom-0 w-full bg-green-500 rounded-t" style={{ height: `${h}%` }} />
                                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-1 rounded border border-white/10">
                                        ${h * 1.2}k
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-4">
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                            <div className="bg-red-500/10 p-2 rounded text-red-500"><AlertTriangle size={18} /></div>
                            <div>
                                <div className="text-xs text-gray-400">Fraud Detected</div>
                                <div className="text-sm font-bold text-white">0.02s</div>
                            </div>
                        </div>
                        <div className="flex-1 bg-white/5 border border-white/10 rounded-xl p-3 flex items-center gap-3">
                            <div className="bg-blue-500/10 p-2 rounded text-blue-500"><Scale size={18} /></div>
                            <div>
                                <div className="text-xs text-gray-400">Compliance</div>
                                <div className="text-sm font-bold text-white">100%</div>
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Fraud Detection",
                    description: "Real-time transaction monitoring. Agents analyze behavioral patterns to flag anomalies instantly, reducing false positives.",
                    icon: SearchCheck
                },
                {
                    title: "Document Processing",
                    description: "Extract data from invoices, receipts, and loan applications with >99% accuracy. No more manual data entry.",
                    icon: FileText
                },
                {
                    title: "Risk Analysis",
                    description: "Synthesize market news, earnings reports, and macro data to generate comprehensive risk profiles for investment committees.",
                    icon: PieChart
                }
            ]}
            stats={[
                { label: "Processing Cost", value: "-90%", subtext: "Per transaction" },
                { label: "Accuracy", value: "99.9%", subtext: "Data Extraction" },
                { label: "Audit Time", value: "Hrs", subtext: "Down from Weeks" }
            ]}
            deepDive={{
                title: "Compliance Built-In",
                description: "Financial regulations change constantly. Agentflox agents are updated in real-time to ensure every action adheres to KYC, AML, and GDPR rules.",
                bullets: [
                    "KYC Automation: Verify identities against global databases in seconds.",
                    "Audit Trail: Every decision made by an agent is logged with reasoning and source data.",
                    "Report Generation: Auto-generate regulatory filings for review."
                ]
            }}
        />
    );
}
