"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Link2, Database, MessageSquare, Cloud, Command, Shuffle, Webhook, Puzzle } from "lucide-react";

export default function IntegrationsPage() {
    return (
        <FeaturePageLayout
            badge="The Agentflox Ecosystem"
            title="Connects With Your Entire Stack"
            description="Don't rip and replace. Agentflox adds a layer of intelligence on top of the tools you already use. Over 100+ native integrations ready to go."
            heroVisual={
                <div className="grid grid-cols-3 gap-4 w-full h-full p-8 content-center">
                    {/* Mock Logos */}
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => (
                        <div key={i} className={`h-16 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors ${i === 5 ? 'bg-indigo-500/20 border-indigo-500/50' : ''}`}>
                            {i === 5 ? <Link2 className="text-indigo-400" /> : <div className="w-8 h-8 rounded-full bg-gray-700/50" />}
                        </div>
                    ))}
                </div>
            }
            features={[
                {
                    title: "Universal API Adapter",
                    description: "Connect to ANY custom internal API. Just paste the OpenAPI/Swagger spec, and our agents learn how to use it instantly.",
                    icon: Webhook
                },
                {
                    title: "Database Connectors",
                    description: "Read/Write access to Postgres, MongoDB, Snowflake, and BigQuery. Agents can write complex SQL queries safely.",
                    icon: Database
                },
                {
                    title: "SaaS Actions",
                    description: "Pre-built actions for Slack, Jira, GitHub, Salesforce, and HubSpot. No code required to trigger complex workflows.",
                    icon: Cloud
                }
            ]}
            stats={[
                { label: "Connectors", value: "100+", subtext: "Native integrations" },
                { label: "Community", value: "500+", subtext: "User-built plugins" },
                { label: "Setup Time", value: "<2m", subtext: "OAuth authentication" },
                { label: "Requests", value: "50M+", subtext: "API calls daily" }
            ]}
            deepDive={{
                title: "Safe & Controlled Access",
                description: "You never have to give an agent 'God Mode'. Define precise scopes and permissions for every tool.",
                bullets: [
                    "Read-Only Modes: Use agents for reporting without risk of data modification.",
                    "Human Approval: Require confirmation before an agent executes a 'POST' or 'DELETE' request.",
                    "Credential Vaulting: Your API keys are encrypted and never shown to the agent directly."
                ]
            }}
        />
    );
}
