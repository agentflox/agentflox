"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Briefcase, Code, Coffee, Globe, Laptop, Smile } from "lucide-react";

export default function CareersPage() {
    return (
        <FeaturePageLayout
            badge="Careers"
            title="Do Your Best Work"
            description="Join a team of ambitious builders defining the next era of computing. We're hiring across Engineering, Product, and Sales."
            heroVisual={
                <div className="w-full h-full p-8 flex flex-col gap-4 justify-center">
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer group">
                        <div>
                            <div className="text-sm font-bold text-white">Senior Backend Engineer</div>
                            <div className="text-xs text-gray-400">Remote • Engineering</div>
                        </div>
                        <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">Apply →</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer group">
                        <div>
                            <div className="text-sm font-bold text-white">Product Designer</div>
                            <div className="text-xs text-gray-400">New York / Remote • Design</div>
                        </div>
                        <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">Apply →</div>
                    </div>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center hover:bg-white/10 transition-colors cursor-pointer group">
                        <div>
                            <div className="text-sm font-bold text-white">Account Executive</div>
                            <div className="text-xs text-gray-400">London • Sales</div>
                        </div>
                        <div className="text-indigo-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-bold">Apply →</div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Remote First",
                    description: "Work from anywhere. We judge output, not hours in a chair. We have team members in 12 timezones.",
                    icon: Globe
                },
                {
                    title: "Competitive Pay",
                    description: "Top-tier salary and equity packages. We believe in sharing the upside of the value we create.",
                    icon: Briefcase
                },
                {
                    title: "Best Tools",
                    description: "MacBook Pros, 4K monitors, and a budget for your home office setup. We remove friction.",
                    icon: Laptop
                }
            ]}
            stats={[
                { label: "Openings", value: "12", subtext: "Active roles" },
                { label: "Glassdoor", value: "4.9", subtext: "Star rating" },
                { label: "Retention", value: "95%", subtext: "Employee happiness" }
            ]}
            deepDive={{
                title: "Benefits & Perks",
                description: "We take care of you so you can take care of the work.",
                bullets: [
                    "Health: 100% covered premiums for you and your family.",
                    "Time Off: Unlimited PTO with a mandatory minimum of 3 weeks.",
                    "Retreats: Quarterly offsites in amazing locations like Lisbon and Bali."
                ]
            }}
        />
    );
}
