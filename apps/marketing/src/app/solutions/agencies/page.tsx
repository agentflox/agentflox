"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Copy, Briefcase, LayoutGrid, Users, CheckSquare, Zap, Layers } from "lucide-react";

export default function AgenciesPage() {
    return (
        <FeaturePageLayout
            badge="For Agencies"
            title="Scale Client Operations"
            description="Manage more clients with less chaos. Automate detailed reporting, asset generation, and communication flows for every account."
            heroVisual={
                <div className="w-full h-full p-8 grid grid-cols-2 gap-4">
                    {['Acme Corp', 'Stark Inc', 'Wayne Ent', 'Cyberdyne'].map((client, i) => (
                        <div key={i} className="aspect-square bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="flex justify-between items-start">
                                <div className="w-8 h-8 rounded bg-gradient-to-br from-indigo-500/20 to-purple-500/20" />
                                <div className="bg-green-500/10 text-green-400 text-[10px] px-1.5 py-0.5 rounded">ON TRACK</div>
                            </div>
                            <div>
                                <div className="text-xs font-medium text-white group-hover:text-indigo-300 transition-colors">{client}</div>
                                <div className="text-[10px] text-gray-500 mt-1">3 Agents Active</div>
                            </div>
                        </div>
                    ))}
                </div>
            }
            features={[
                {
                    title: "White-Label Reports",
                    description: "Auto-generate beautiful, data-driven weekly reports with your agency branding, sent directly to clients.",
                    icon: LayoutGrid
                },
                {
                    title: "Client-Specific Agents",
                    description: "Spin up a dedicated 'Brand Voice' agent for each client to ensure content consistency across accounts.",
                    icon: Users
                },
                {
                    title: "Project Traffic Control",
                    description: "A master dashboard to view health, deadlines, and profitability across 50+ client projects at once.",
                    icon: Layers
                }
            ]}
            stats={[
                { label: "Client Capacity", value: "2x", subtext: "Without hiring" },
                { label: "Margins", value: "+25%", subtext: "Efficiency gain" },
                { label: "Retention", value: "95%", subtext: "Client satisfaction" }
            ]}
            deepDive={{
                title: "The Profitable Agency Model",
                description: "Move from selling hours to selling outcomes. Use AI to deliver results faster, increasing your effective hourly rate.",
                bullets: [
                    "Asset Production: Generate social copy, ad variations, and landing page wireframes in minutes.",
                    "Research at Scale: Agents can perform deep market research for new pitches overnight.",
                    "Onboarding Automation: Streamline the 'Kickoff' phase with automated info gathering."
                ]
            }}
        />
    );
}
