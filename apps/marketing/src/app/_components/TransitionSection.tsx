"use client";
import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const TransitionSection = () => {
    const sectionRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Parallax text effect
            if (textRef.current) {
                gsap.to(textRef.current, {
                    y: -100,
                    opacity: 0,
                    scale: 0.8,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: 'top center',
                        end: 'bottom top',
                        scrub: true
                    }
                });
            }

            // Animate gradient background
            gsap.to(sectionRef.current, {
                backgroundPosition: '200% 50%',
                scrollTrigger: {
                    trigger: sectionRef.current,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: true
                }
            });
        }, sectionRef);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="relative h-[400px] w-full flex items-center justify-center overflow-hidden"
            style={{
                background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1) 0%, rgba(8, 145, 178, 0.1) 50%, rgba(20, 184, 166, 0.1) 100%)',
                backgroundSize: '200% 200%'
            }}
        >
            {/* Animated gradient orbs */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-teal-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
            </div>

            {/* Content */}
            <div
                ref={textRef}
                className="relative z-10 text-center px-4"
            >
                <div className="inline-block px-8 py-6 bg-white/5 backdrop-blur-xl rounded-3xl border border-cyan-500/30 shadow-[0_0_40px_-5px_rgba(34,211,238,0.6)]">
                    <h2 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-4">
                        <span className="bg-gradient-to-r from-cyan-400 via-cyan-300 to-teal-400 bg-clip-text text-transparent">
                            Connect
                        </span>
                    </h2>
                    <p className="text-xl text-cyan-100/80 font-medium">
                        Where mentors, teams, and investors meet
                    </p>
                </div>
            </div>
        </section>
    );
};
