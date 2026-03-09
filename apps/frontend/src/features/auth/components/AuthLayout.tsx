"use client";
import React from "react";
import Link from "next/link";
import Image from "next/image";

export const AuthLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="flex min-h-screen bg-white">
            {/* Sidebar: Brand / Art (Hidden on mobile) */}
            <div className="hidden lg:flex w-1/2 bg-black text-white relative flex-col justify-between p-16 overflow-hidden">
                {/* Abstract Premium Background Art */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-800 via-black to-black opacity-80"></div>
                    <svg className="absolute top-0 right-0 w-[800px] h-[800px] text-gray-800/20 transform translate-x-1/3 -translate-y-1/3" viewBox="0 0 100 100" fill="currentColor">
                        <circle cx="50" cy="50" r="50" />
                    </svg>
                    <svg className="absolute bottom-0 left-0 w-[600px] h-[600px] text-zinc-900/50 transform -translate-x-1/3 translate-y-1/3" viewBox="0 0 100 100" fill="currentColor">
                        <circle cx="50" cy="50" r="50" />
                    </svg>
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-12">
                        <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg">
                            <span className="relative inline-block h-8 w-8">
                                <Image
                                    src="/images/logo.png"
                                    alt="Agentflox logo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </span>
                        </div>
                        <span className="text-2xl font-bold tracking-tight">Agentflox</span>
                    </div>

                    <div className="space-y-6 max-w-lg">
                        <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
                            Build faster,<br />
                            scale better.
                        </h1>
                        <p className="text-xl text-gray-400 font-light leading-relaxed">
                            The enterprise-grade platform for modern engineering teams.
                            Secure, reliable, and designed for speed.
                        </p>
                    </div>
                </div>

                <div className="relative z-10 flex gap-6 text-sm font-medium text-gray-500">
                    <span>© 2026 Agentflox Inc.</span>
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
                </div>
            </div>

            {/* Main Content: Form */}
            <div className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 bg-gray-50">
                <div className="w-full max-w-md animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {children}
                </div>
            </div>
        </div>
    );
};
