"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Terminal, GitMerge, Bug, Command, ShieldCheck, Zap } from "lucide-react";

export default function EngineeringPage() {
    return (
        <FeaturePageLayout
            badge="For Engineering Teams"
            title="Ship Code, Not Overhead"
            description="Eliminate the friction in your SDLC. AI agents handle code reviews, write comprehensive tests, and manage your CI/CD pipeline."
            heroVisual={
                <div className="w-full h-full bg-[#0d1117] p-4 text-xs font-mono text-gray-400 overflow-hidden flex flex-col">
                    <div className="border-b border-gray-800 pb-2 mb-2 flex items-center gap-2">
                        <Terminal size={12} />
                        <span>agent-ops — zsh</span>
                    </div>
                    <div><span className="text-green-400">➜</span> <span className="text-blue-400">~</span> git push origin feature/auth-v2</div>
                    <div className="mt-2 text-white">Enumerating objects: 15, done.</div>
                    <div className="text-white">Writing objects: 100% (15/15), 3.24 KiB, done.</div>
                    <div className="mt-4 text-yellow-400">⚡ Agentflox Agent intercepted push...</div>
                    <div className="ml-2 text-gray-500">Running security scan... <span className="text-green-400">PASS</span></div>
                    <div className="ml-2 text-gray-500">Checking type safety... <span className="text-green-400">PASS</span></div>
                    <div className="ml-2 text-gray-500">Generating documentation... <span className="text-green-400">DONE</span></div>
                    <div className="mt-2 text-green-400">✔ PR #42 created & assigned to @senior-dev</div>
                </div>
            }
            features={[
                {
                    title: "Automated QA",
                    description: "Agents generate and run unit, integration, and e2e tests for every PR. Catches regressions before they hit staging.",
                    icon: Bug
                },
                {
                    title: "Code Review Assistant",
                    description: "Instant first-pass reviews. AI flags style violations, security risks, and complexity issues automatically.",
                    icon: ShieldCheck
                },
                {
                    title: "Documentation Bot",
                    description: "Never write a README again. Agents parse your codebase and keep your internal wikis up to date.",
                    icon: Command
                }
            ]}
            stats={[
                { label: "Code Coverage", value: "90%+", subtext: "Automated" },
                { label: "Review Time", value: "<5m", subtext: "First pass" },
                { label: "Bugs Found", value: "+40%", subtext: "Pre-production" }
            ]}
            deepDive={{
                title: "The 10x Developer Experience",
                description: "Engineers spend 40% of their time on non-coding tasks. Agentflox gives that time back so they can focus on solving hard problems.",
                bullets: [
                    "Migration Agents: Automate painful library upgrades and refactors.",
                    "On-Call Savior: AI suggests root causes and fixes during 3am incidents.",
                    "Tech Debt Manager: Automatically identifies and tickets legacy code for cleanup."
                ]
            }}
        />
    );
}
