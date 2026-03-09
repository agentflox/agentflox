"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { HardHat, ClipboardList, Map, Hammer, Truck, ShieldCheck } from "lucide-react";

export default function ConstructionPage() {
    return (
        <FeaturePageLayout
            badge="For Architecture & Construction"
            title="Build Smarter, Build Safer"
            description="Bring digital intelligence to the job site. Automate safety compliance, material tracking, and project scheduling."
            heroVisual={
                <div className="w-full h-full relative overflow-hidden rounded-xl">
                    <div className="absolute inset-0 bg-gray-900" />
                    {/* Grid Overlay */}
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:40px_40px]" />

                    {/* Blueprint Lines */}
                    <svg className="absolute inset-0 w-full h-full opacity-30" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <path d="M10,90 L40,40 L90,40" stroke="white" strokeWidth="0.5" fill="none" strokeDasharray="2,2" />
                        <path d="M40,40 L40,90" stroke="white" strokeWidth="0.5" fill="none" />
                        <rect x="45" y="45" width="20" height="30" stroke="cyan" strokeWidth="0.2" fill="cyan" fillOpacity="0.1" />
                    </svg>

                    {/* Active agent marker */}
                    <div className="absolute top-1/2 left-1/3 w-3 h-3 bg-yellow-400 rounded-full animate-ping" />
                    <div className="absolute top-1/2 left-1/3 -translate-y-8 -translate-x-1/2 bg-yellow-500 text-black text-[10px] font-bold px-2 py-1 rounded">
                        Material Delay Detected
                    </div>
                </div>
            }
            features={[
                {
                    title: "Safety Monitor",
                    description: "AI analyzes site cameras to detect PPE violations and safety hazards in real-time, alerting foremen instantly.",
                    icon: HardHat
                },
                {
                    title: "Supply Chain Sync",
                    description: "Track materials from factory to foundation. Agents predict delays and re-schedule crews to avoid downtime.",
                    icon: Truck
                },
                {
                    title: "Daily Reports",
                    description: "Foremen speak into their phone; agents generate detailed daily logs, RFI drafts, and progress photos automatically.",
                    icon: ClipboardList
                }
            ]}
            stats={[
                { label: "Safety Incidents", value: "-60%", subtext: "Prevention rate" },
                { label: "Downtime", value: "-25%", subtext: "Schedule optimization" },
                { label: "Rework Cost", value: "-15%", subtext: "Error detection" }
            ]}
            deepDive={{
                title: "The Connected Job Site",
                description: "Construction projects die by a thousand cuts. Agentflox connects the field to the office, ensuring everyone is building off the latest plans.",
                bullets: [
                    "BIM Integration: Agents can query 3D models to answer 'What is the ceiling height here?' instantly.",
                    "Subcontractor Coordination: Automated scheduling sending reminders to electricians and plumbers.",
                    "Document Control: Ensure version control on all blueprints and change orders."
                ]
            }}
        />
    );
}
