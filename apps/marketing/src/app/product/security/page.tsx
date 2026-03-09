"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Shield, Lock, FileKey, Eye, AlertTriangle, CloudOff, FileWarning, SearchCheck } from "lucide-react";

export default function SecurityPage() {
    return (
        <FeaturePageLayout
            badge="Trust Center"
            title="Security at the Speed of AI"
            description="We've rebuilt the security stack for the age of autonomous agents. Granular control, zero-trust architecture, and complete transparency."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="relative w-full h-full border border-white/10 rounded-xl bg-[#030303] overflow-hidden flex flex-col">
                        <div className="h-8 border-b border-white/10 bg-white/5 flex items-center px-3 gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500/50" />
                            <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                            <div className="w-2 h-2 rounded-full bg-green-500/50" />
                        </div>
                        <div className="p-4 space-y-3 font-mono text-[10px]">
                            <div className="flex justify-between text-green-400">
                                <span>✔ Authentication</span>
                                <span>PASS</span>
                            </div>
                            <div className="flex justify-between text-green-400">
                                <span>✔ PII Scan</span>
                                <span>PASS</span>
                            </div>
                            <div className="flex justify-between text-green-400">
                                <span>✔ Jailbreak Check</span>
                                <span>PASS</span>
                            </div>
                            <div className="h-px bg-white/10 my-2" />
                            <div className="text-gray-500">Processing Request...</div>
                        </div>
                        {/* Scanning Effect */}
                        <div className="absolute top-0 left-0 w-full h-1 bg-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.5)] animate-[scan_2s_linear_infinite]" />
                    </div>
                </div>
            }
            features={[
                {
                    title: "Transient Processing",
                    description: "Zero-Data Retention mode ensures no inputs or outputs are ever written to disk. Perfect for highly sensitive workloads.",
                    icon: CloudOff
                },
                {
                    title: "Real-Time Redaction",
                    description: "Our DLP engine automatically detects and redacts credit cards, SSNs, and API keys before they even reach the LLM.",
                    icon: AlertTriangle
                },
                {
                    title: "Prompt Injection Defense",
                    description: "Proprietary firewall blocks malicious prompts attempting to jailbreak agents or extract system instructions.",
                    icon: Shield
                }
            ]}
            stats={[
                { label: "Compliance", value: "SOC2", subtext: "Type II Checked" },
                { label: "Encryption", value: "AES-256", subtext: "At rest & in-transit" },
                { label: "Redaction", value: "100%", subtext: "PII Filters" },
                { label: "Pen Tests", value: "4x/Yr", subtext: "By top firms" }
            ]}
            deepDive={{
                title: "Complete Control",
                description: "Security isn't a toggle; it's a granular permission system. You decide exactly what an agent can see and do.",
                bullets: [
                    "Scope-Based Access: Limit agents to specific API endpoints (e.g., READ /users but not DELETE /users).",
                    "Audit Trails: Download comprehensive logs of every tool call and data access for compliance.",
                    "Bring Your Own Key: Use your existing enterprise contracts with OpenAI/Anthropic."
                ]
            }}
        />
    );
}
