import React, { useState, useEffect } from 'react';

interface StepSourceProps {
    onNext: (data: any) => void;
    onBack: () => void;
    isLoading: boolean;
    defaultValues?: any;
}

export default function StepSource({ onNext, onBack, isLoading, defaultValues }: StepSourceProps) {
    const [selected, setSelected] = useState("");
    const [custom, setCustom] = useState("");

    const options = [
        "Reddit", "Software Review Sites", "Search Engine (Google, Bing, etc.)", "Friend / Colleague",
        "AI Tools (ChatGPT, Perplexity, etc.)", "YouTube", "LinkedIn", "Podcasts / Radio",
        "Facebook / Instagram", "TV / Streaming (Hulu, NBC, etc.)", "TikTok", "Other"
    ];

    // Handle initialization including custom sources
    useEffect(() => {
        const src = defaultValues?.referralSource;
        if (src) {
            if (options.includes(src)) {
                setSelected(src);
            } else {
                setSelected('Other');
                setCustom(src);
            }
        }
    }, [defaultValues]);

    const handleNext = () => {
        const finalSource = selected === 'Other' ? custom : selected;
        // Optional, allow proceeding
        onNext({ referralSource: finalSource || undefined });
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-8">How did you hear about us?</h2>
                <div className="flex flex-wrap gap-3 justify-center">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => setSelected(opt)}
                            className={`px-4 py-2.5 rounded-full text-sm font-medium border transition-all ${selected === opt
                                ? "bg-black text-white border-black shadow-md transform scale-105"
                                : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {selected === "Other" && (
                <div className="max-w-xs mx-auto animate-in fade-in zoom-in duration-200">
                    <input
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder="Please specify..."
                        className="w-full h-10 px-4 text-center bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                        autoFocus
                    />
                </div>
            )}

            <div className="flex items-center justify-between mt-12">
                <button
                    onClick={onBack}
                    className="text-sm font-medium text-gray-500 hover:text-black transition-colors"
                >
                    Back
                </button>
                <button
                    onClick={handleNext}
                    disabled={isLoading}
                    className="bg-black hover:bg-gray-800 text-white px-8 py-3 rounded-full font-medium text-sm transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
                >
                    {isLoading ? "Saving..." : "Continue"}
                </button>
            </div>
        </div>
    );
}
