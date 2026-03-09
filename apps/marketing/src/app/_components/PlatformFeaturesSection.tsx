"use client";

import React from "react";
import {
    FileText, Layers, Box, UserCheck, Globe, MessageSquare, StickyNote, MessagesSquare,
    Sparkles, Wrench, Bell, Users, Bot, Mail, Hash, Network, CheckSquare,
    FileSpreadsheet, BarChart3, ScrollText, User, ShieldCheck, Layout, Grid,
    Zap, Cpu, Database, Share2, Workflow, Command
} from "lucide-react";
import { motion } from "framer-motion";

const features = [
    { name: "Docs", icon: FileText },
    { name: "Resources", icon: Layers },
    { name: "Materials", icon: Box },
    { name: "Talents", icon: UserCheck },
    { name: "Marketplace", icon: Globe },
    { name: "Chats", icon: MessageSquare },
    { name: "Posts", icon: StickyNote },
    { name: "Discussions", icon: MessagesSquare },
    { name: "AI", icon: Sparkles },
    { name: "Tools", icon: Wrench },
    { name: "Notifications", icon: Bell },
    { name: "Collaborations", icon: Users },
    { name: "Agents", icon: Bot },
    { name: "Messages", icon: Mail },
    { name: "Channels", icon: Hash },
    { name: "Network", icon: Network },
    { name: "Tasks", icon: CheckSquare },
    { name: "Proposals", icon: FileSpreadsheet },
    { name: "Analytics", icon: BarChart3 },
    { name: "Logs", icon: ScrollText },
    { name: "Members", icon: User },
    { name: "Chatbot", icon: Bot },
    { name: "Governance", icon: ShieldCheck },
    { name: "Workspace", icon: Layout },
    { name: "Space", icon: Grid },
    { name: "Realtime", icon: Zap },
    { name: "Automation", icon: Cpu },
    { name: "Database", icon: Database },
    { name: "Sharing", icon: Share2 },
    { name: "Workflows", icon: Workflow },
    { name: "Commands", icon: Command },
];

// Split features into two rows
const row1 = features.slice(0, Math.ceil(features.length / 2));
const row2 = features.slice(Math.ceil(features.length / 2));

const FeatureCard = ({ item }: { item: typeof features[0] }) => {
    const Icon = item.icon;
    return (
        <div className="flex items-center gap-3 px-5 py-3 rounded-lg border border-white/5 bg-white/5 backdrop-blur-sm shrink-0 hover:bg-white/10 transition-colors cursor-default">
            <Icon size={18} className="text-indigo-400" />
            <span className="text-sm font-medium text-gray-300">{item.name}</span>
        </div>
    );
};

export const PlatformFeaturesSection = () => {
    return (
        <section className="relative w-full py-20 bg-[#030303] overflow-hidden border-b border-white/5">
            <div className="absolute inset-0 bg-gradient-to-b from-[#030303] via-[#050505] to-[#030303]" />

            {/* Text Content */}
            <div className="relative z-10 container mx-auto px-6 lg:px-12 text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 border border-white/10 rounded-full text-[10px] font-medium uppercase tracking-wider text-indigo-400 mb-6 backdrop-blur-sm">
                    Infinite Possibilities
                </div>
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                    A Universe of <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">Capabilities</span>
                </h2>
                <p className="text-gray-400 text-lg max-w-2xl mx-auto font-light">
                    Every tool, resource, and agent you need to build the next unicorn, fully integrated into one operating system.
                </p>
            </div>

            {/* Marquee Rows */}
            <div className="relative flex flex-col gap-8 select-none">
                {/* Gradient Masks for fading edges */}
                <div className="absolute top-0 bottom-0 left-0 w-32 bg-gradient-to-r from-[#030303] to-transparent z-20" />
                <div className="absolute top-0 bottom-0 right-0 w-32 bg-gradient-to-l from-[#030303] to-transparent z-20" />

                {/* Row 1 - Moves Left */}
                <div className="flex overflow-hidden">
                    <motion.div
                        className="flex gap-4 px-4"
                        animate={{ x: "-50%" }}
                        transition={{
                            repeat: Infinity,
                            ease: "linear",
                            duration: 30
                        }}
                        style={{ width: "max-content" }}
                    >
                        {[...row1, ...row1, ...row1].map((item, idx) => (
                            <FeatureCard key={`${item.name}-${idx}`} item={item} />
                        ))}
                    </motion.div>
                </div>

                {/* Row 2 - Moves Right */}
                <div className="flex overflow-hidden">
                    <motion.div
                        className="flex gap-4 px-4"
                        animate={{ x: "0%" }}
                        initial={{ x: "-50%" }}
                        transition={{
                            repeat: Infinity,
                            ease: "linear",
                            duration: 35
                        }}
                        style={{ width: "max-content" }}
                    >
                        {[...row2, ...row2, ...row2].map((item, idx) => (
                            <FeatureCard key={`${item.name}-${idx}`} item={item} />
                        ))}
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
