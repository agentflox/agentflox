"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { GitMerge, Workflow, Zap, Code2, Clock, CheckCircle } from "lucide-react";

export default function WorkflowsPage() {
    return (
        <FeaturePageLayout
            badge="Intelligent Automation"
            title="Workflows That Think"
            description="Go beyond 'If This, Then That'. Build workflows that can reason, loop, and handle exceptions autonomously."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="w-full max-w-lg bg-[#0A0A0A] rounded-xl border border-white/10 p-4 space-y-4 font-mono text-xs">
                        <div className="flex items-center gap-2 text-green-400">
                            <CheckCircle size={14} /> <span>Trigger: New Lead in Salesforce</span>
                        </div>
                        <div className="pl-4 border-l border-white/10 space-y-4">
                            <div className="bg-white/5 p-2 rounded border border-white/10">
                                <span className="text-gray-400">Step 1: Enriched with Clearbit</span>
                            </div>
                            <div className="bg-indigo-500/10 p-2 rounded border border-indigo-500/20 text-indigo-300">
                                <span className="font-bold">AI Decision:</span> Lead score &gt; 80. Draft personalized email.
                            </div>
                            <div className="bg-white/5 p-2 rounded border border-white/10">
                                <span className="text-gray-400">Step 3: Sent via Gmail</span>
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Conditional Logic",
                    description: "Route workflows based on AI analysis. 'If the sentiment is angry, escalate to manager; otherwise, reply automatically.'",
                    icon: GitMerge
                },
                {
                    title: "Human-in-the-Loop",
                    description: "Pause workflows for human approval on high-stakes actions. Resume instantly once approved.",
                    icon: Workflow
                },
                {
                    title: "Code Steps",
                    description: "Inject custom JavaScript or Python anywhere in the workflow for ultimate flexibility.",
                    icon: Code2
                }
            ]}
            stats={[
                { label: "Executions", value: "1M+", subtext: "Daily runs" },
                { label: "Reliability", value: "99.9%", subtext: "Success rate" },
                { label: "Latency", value: "Real-time", subtext: "Processing" }
            ]}
            deepDive={{
                title: "Orchestration Layer",
                description: "Manage complex business processes that span multiple departments and software tools.",
                bullets: [
                    "State Management: Workflows persist state across days or weeks.",
                    "Error Handling: Automatic retries with exponential backoff.",
                    "Audit Logs: Full visibility into every decision path taken."
                ]
            }}
        />
    );
}
