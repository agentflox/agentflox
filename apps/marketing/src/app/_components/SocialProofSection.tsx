"use client";
import React from 'react';

export const SocialProofSection = () => {
    return (
        <section className="relative w-full py-8 lg:py-16 bg-[#030303] border-b border-white/5 overflow-hidden">
            <div className="container mx-auto px-6 text-center">
                <p className="text-sm font-medium text-gray-500 uppercase tracking-widest mb-4 lg:mb-8">
                    Trusted by forward-thinking teams shipping at AI speed
                </p>
                
                {/* Logo Strip */}
                <div className="flex flex-wrap justify-center items-center gap-6 md:gap-24 opacity-60 transition-all duration-500">
                    <div className="text-2xl font-bold tracking-tighter text-white hover:opacity-100 transition-opacity">Acme Corp</div>
                    <div className="text-2xl font-black tracking-widest text-white italic hover:opacity-100 transition-opacity">VERTEX</div>
                    <div className="text-2xl font-serif font-bold text-white hover:opacity-100 transition-opacity">Nexus</div>
                    <div className="text-2xl font-mono font-medium text-white hover:opacity-100 transition-opacity">_stellar</div>
                    <div className="text-2xl font-extrabold text-white hover:opacity-100 transition-opacity">Quantum</div>
                </div>
            </div>
        </section>
    );
};
