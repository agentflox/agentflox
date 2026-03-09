"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { UserCheck, FileText, CalendarCheck, Users, Search, GraduationCap } from "lucide-react";

export default function HRPage() {
    return (
        <FeaturePageLayout
            badge="For People Ops"
            title="Human Resources, Supercharged"
            description="Recruit faster, onboard better, and retain top talent. Let AI handle the paperwork so you can focus on the people."
            heroVisual={
                <div className="w-full h-full p-6 flex flex-col gap-4">
                    {/* Candidate Cards */}
                    {[
                        { name: "Alex Chen", role: "Senior Engineer", score: 98, status: "Interview" },
                        { name: "Sarah Jones", role: "Product Manager", score: 92, status: "Screening" },
                        { name: "Mike Ross", role: "Legal Counsel", score: 88, status: "Offer" },
                    ].map((c, i) => (
                        <div key={i} className="flex items-center gap-4 bg-white/5 p-3 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white">
                                {c.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div className="flex-1">
                                <div className="text-sm font-semibold text-white">{c.name}</div>
                                <div className="text-xs text-gray-400">{c.role}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-lg font-bold text-green-400">{c.score}%</div>
                                <div className="text-[10px] uppercase text-gray-500">{c.status}</div>
                            </div>
                        </div>
                    ))}
                    <div className="mt-2 text-center text-xs text-indigo-400 bg-indigo-500/10 py-2 rounded border border-indigo-500/20">
                        AI Scanning 150 Resumes...
                    </div>
                </div>
            }
            features={[
                {
                    title: "Resume Screener",
                    description: "Agents parse thousands of PDFs to rank candidates based on skills, not keywords. Detects bias and ensures fair hiring.",
                    icon: Search
                },
                {
                    title: "Onboarding Concierge",
                    description: "A friendly AI buddy that guides new hires through paperwork, IT setup, and company culture documents.",
                    icon: GraduationCap
                },
                {
                    title: "Payroll Automation",
                    description: "Sync hours, calculate bonuses, and process payments across global teams in compliant local currencies.",
                    icon: FileText
                }
            ]}
            stats={[
                { label: "Time to Hire", value: "-50%", subtext: "Faster placement" },
                { label: "Onboarding", value: "100%", subtext: "Completion rate" },
                { label: "Admin Hours", value: "-20/wk", subtext: "Saved per rep" }
            ]}
            deepDive={{
                title: "Build the Culture You Want",
                description: "HR is often buried in compliance and logs. Agentflox automates the 'boring stuff' so you can build programs that employees love.",
                bullets: [
                    "Pulse Surveys: AI analyzes sentiment from Slack to detect burnout early.",
                    "Performance Reviews: Agents draft unbiased starting points for manager reviews based on goals hit.",
                    "Benefits Support: An always-on bot that answers 'What is my dental deductible?' instantly."
                ]
            }}
        />
    );
}
