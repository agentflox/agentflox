"use client";
import React, { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
}

export const QuoteSection = () => {
    const sectionRef = useRef<HTMLElement>(null);

    const text = "Agentflox makes it easy to manage work at every level, combining flexible project tracking with built-in AI to automate your daily tasks.";
    const words = text.split(" ");

    useEffect(() => {
        const section = sectionRef.current;
        if (!section) return;

        const ctx = gsap.context(() => {
            const tl = gsap.timeline({
                scrollTrigger: {
                    trigger: section,
                    start: "top top",
                    end: "+=150%",
                    scrub: 1,
                    pin: true,
                    pinSpacing: true,
                    anticipatePin: 1,
                }
            });

            tl.fromTo(['.main-word', '.author-word'],
                { opacity: 0.1 },
                {
                    opacity: 1,
                    stagger: 0.08,
                    ease: "none",
                    duration: 2
                }
            );

            requestAnimationFrame(() => ScrollTrigger.refresh());
        }, section);

        return () => ctx.revert();
    }, []);

    return (
        <section
            ref={sectionRef}
            className="min-h-[50vh] lg:min-h-screen w-full flex items-center justify-center bg-[#050505] border-t border-white/5 relative z-30 pt-20 lg:pt-[100px] pb-10 lg:pb-[60px]"
        >
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] pointer-events-none" />
            <div className="max-w-5xl relative px-8 w-full flex flex-col items-center justify-center z-10">

                <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-[56px] leading-[1.3] text-center relative z-10 tracking-tight font-medium flex flex-wrap justify-center content-center">
                    {words.map((word, i) => {
                        const isHighlighted = ["manage", "work", "at", "every", "level,", "built-in", "AI", "automate", "your", "daily", "tasks."].includes(word);
                        return (
                            <span key={i} className={`main-word mr-2 md:mr-3 mt-1 ${isHighlighted ? 'bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold' : 'bg-clip-text text-transparent bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70'}`}>
                                {word}
                            </span>
                        );
                    })}
                </p>

                <div className="mt-10 md:mt-14 flex flex-col items-center gap-1">
                    <span className="text-base md:text-lg">
                        {"Alex Rivers".split(" ").map((word, i) => (
                            <span key={`name-${i}`} className="author-word bg-clip-text text-transparent bg-gradient-to-b from-white to-white/70 font-bold mr-1">{word}</span>
                        ))}
                    </span>
                    <span className="text-sm mt-1">
                        {"VP of Engineering · Agentflox".split(" ").map((word, i) => (
                            <span key={`title-${i}`} className="author-word bg-clip-text text-transparent bg-gradient-to-b from-[#8A8F98] to-[#8A8F98]/70 font-medium mr-1">{word}</span>
                        ))}
                    </span>
                </div>
            </div>
        </section>
    );
};