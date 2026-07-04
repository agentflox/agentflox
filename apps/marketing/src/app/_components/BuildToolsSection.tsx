"use client";
import React from 'react';
import { Settings, Workflow, Code, Zap } from 'lucide-react';
import Link from 'next/link';

export const BuildToolsSection = () => {
    return (
        <section className="relative w-full py-24 bg-[#050505] text-white overflow-hidden">
            <div className="container mx-auto px-6 lg:px-12">
                <div className="flex flex-col lg:flex-row gap-16 items-center">
                    
                    {/* Content */}
                    <div className="lg:w-1/2 space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300">
                            <Settings size={14} className="text-gray-400" />
                            Custom Tooling
                        </div>
                        
                        <h2 className="text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                            Turn repeatable work into reusable tools.
                        </h2>
                        
                        <p className="text-lg text-gray-400 font-light leading-relaxed">
                            Don't force your work into rigid software. Build custom tools visually, in code, or let AI draft them for you. Deploy them into your workspace instantly to handle your specific daily tasks.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6">
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                    <Workflow size={20} />
                                </div>
                                <h4 className="font-semibold text-lg">Visual Builder</h4>
                                <p className="text-sm text-gray-500">Drag and drop components to build workflows without writing a line of code.</p>
                            </div>
                            <div className="space-y-3">
                                <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Code size={20} />
                                </div>
                                <h4 className="font-semibold text-lg">Code Ready</h4>
                                <p className="text-sm text-gray-500">Dive into the code to add complex logic or custom API endpoints directly.</p>
                            </div>
                            <div className="space-y-3 md:col-span-2">
                                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <Zap size={20} />
                                </div>
                                <h4 className="font-semibold text-lg">AI Generated</h4>
                                <p className="text-sm text-gray-500">Describe what you need in plain English. Watch as our AI generates a fully functional tool right in front of you.</p>
                            </div>
                        </div>

                        <div className="pt-6">
                            <Link href="/product/tools" className="text-white font-medium hover:text-indigo-400 transition-colors inline-flex items-center gap-2">
                                Build your first tool <Zap size={16} />
                            </Link>
                        </div>
                    </div>

                    {/* Interactive/Visual Demo */}
                    <div className="lg:w-1/2 w-full">
                        <div className="relative aspect-square md:aspect-[4/3] rounded-2xl bg-[#0F0F0F] border border-white/10 overflow-hidden shadow-2xl flex flex-col">
                            {/* Fake Header */}
                            <div className="h-12 border-b border-white/5 flex items-center px-4 gap-2 bg-[#0A0A0A]">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                                </div>
                                <div className="ml-4 text-xs text-gray-500 font-mono">Tool Builder / Competitor_Analysis</div>
                            </div>
                            
                            {/* Fake UI Body */}
                            <div className="flex-1 p-6 flex flex-col gap-4 relative">
                                <div className="w-3/4 h-8 bg-white/5 rounded-md flex items-center px-3 border border-indigo-500/30">
                                    <span className="text-sm text-indigo-300 font-mono">Input: URL</span>
                                </div>
                                <div className="w-10 h-10 ml-8 border-l-2 border-dashed border-white/10" />
                                <div className="w-full h-16 bg-indigo-500/10 rounded-md border border-indigo-500/20 flex items-center px-4">
                                    <span className="text-sm font-medium">Extract Text via Web Scraper</span>
                                </div>
                                <div className="w-10 h-10 ml-8 border-l-2 border-dashed border-white/10" />
                                <div className="w-full h-16 bg-blue-500/10 rounded-md border border-blue-500/20 flex items-center px-4 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                                    <span className="text-sm font-medium">Summarize with GPT-4o</span>
                                </div>
                                
                                {/* Overlay / Generator Effect */}
                                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                                    <div className="px-6 py-3 bg-white text-black rounded-full font-medium text-sm flex items-center gap-2 shadow-xl transform translate-y-4 hover:translate-y-0 transition-transform">
                                        <Zap size={16} className="text-yellow-500" /> Generating Tool UI...
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                </div>
            </div>
        </section>
    );
};
