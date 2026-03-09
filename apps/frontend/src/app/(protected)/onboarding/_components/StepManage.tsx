import React, { useState } from 'react';

interface StepManageProps {
    onNext: (data: any) => void;
    onBack: () => void;
    isLoading: boolean;
    defaultValues?: any;
}

export default function StepManage({ onNext, onBack, isLoading, defaultValues }: StepManageProps) {
    const [selected, setSelected] = useState<string[]>(defaultValues?.managementGoals || []);
    const [custom, setCustom] = useState("");

    const options = [
        "Sales & CRM", "Finance & Accounting", "Software Development",
        "Personal Use", "IT", "Marketing", "Operations",
        "Startup", "PMO", "Creative & Design", "HR & Recruiting",
        "Professional Services", "Support", "Other"
    ];

    const handleToggle = (opt: string) => {
        if (selected.includes(opt)) {
            setSelected(selected.filter(s => s !== opt));
        } else {
            setSelected([...selected, opt]);
        }
    };

    const handleNext = () => {
        // allow empty selection
        let finalSelection = selected;
        if (selected.includes("Other") && custom) {
            finalSelection = [...selected.filter(s => s !== "Other"), custom];
        }
        // Remove "Other" if custom is empty so we don't save just "Other"
        if (selected.includes("Other") && !custom) {
            finalSelection = selected.filter(s => s !== "Other");
        }

        onNext({ managementGoals: finalSelection });
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-4">What would you like to manage?</h2>
                <div className="flex flex-wrap gap-2 justify-center">
                    {options.map(opt => (
                        <button
                            key={opt}
                            onClick={() => handleToggle(opt)}
                            className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${selected.includes(opt)
                                    ? "bg-black text-white border-black"
                                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                }`}
                        >
                            {opt}
                        </button>
                    ))}
                </div>
            </div>

            {selected.includes("Other") && (
                <div className="max-w-xs mx-auto animate-in fade-in zoom-in duration-200">
                    <input
                        value={custom}
                        onChange={(e) => setCustom(e.target.value)}
                        placeholder="What else?"
                        className="w-full h-10 px-4 text-center bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-black focus:border-black outline-none text-sm"
                        autoFocus
                    />
                </div>
            )}

            <div className="text-center text-xs text-gray-400 mt-4">
                Don't worry, you can always add more in the future.
            </div>

            <div className="flex items-center justify-between mt-8">
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
