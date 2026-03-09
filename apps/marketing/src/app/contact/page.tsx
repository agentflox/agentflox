"use client";

import { FeaturePageLayout } from "@/app/_components/FeaturePageLayout";
import { Mail, MessageSquare, MapPin, Phone, Users, Clock } from "lucide-react";

export default function ContactPage() {
    return (
        <FeaturePageLayout
            badge="Contact Us"
            title="Let's Talk"
            description="Have a question about our pricing, features, or enterprise plans? Our team is ready to answer all your questions."
            heroVisual={
                <div className="w-full h-full p-8 flex items-center justify-center">
                    <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 w-full max-w-sm">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-3 h-3 rounded-full bg-red-500" />
                            <div className="w-3 h-3 rounded-full bg-yellow-500" />
                            <div className="w-3 h-3 rounded-full bg-green-500" />
                        </div>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="text-gray-500">Name:</div>
                                <div className="text-white border-b border-gray-700 w-full">Jane Doe</div>
                            </div>
                            <div className="flex gap-3">
                                <div className="text-gray-500">Email:</div>
                                <div className="text-white border-b border-gray-700 w-full">jane@acme.com</div>
                            </div>
                            <div className="mt-4 bg-indigo-600 text-white text-center py-2 rounded text-sm font-bold">
                                Send Message
                            </div>
                        </div>
                    </div>
                </div>
            }
            features={[
                {
                    title: "Sales",
                    description: "Talk to our sales team about enterprise plans and custom solutions.",
                    icon: Users
                },
                {
                    title: "Support",
                    description: "Existing customer? Get help with technical issues and account management.",
                    icon: MessageSquare
                },
                {
                    title: "General Inquiries",
                    description: "For press, partnerships, and other general questions.",
                    icon: Mail
                }
            ]}
            stats={[
                { label: "Response", value: "<24h", subtext: "Average time" },
                { label: "Offices", value: "3", subtext: "Global locations" },
                { label: "Team", value: "50+", subtext: "Ready to help" }
            ]}
            deepDive={{
                title: "Visit Our Offices",
                description: "We are a remote-first company, but we have hubs in major cities. Come say hi!",
                bullets: [
                    "San Francisco: 548 Market St, CA 94104",
                    "London: 1 Canada Square, E14 5AB",
                    "Singapore: 1 Raffles Place, 048616"
                ]
            }}
        />
    );
}
