import React, { useState } from 'react';
import { Briefcase, User, GraduationCap } from 'lucide-react';

interface StepUsageProps {
    onNext: (data: any) => void;
    onBack: () => void;
    isLoading: boolean;
    defaultValues?: any;
}

export default function StepUsage({ onNext, onBack, isLoading, defaultValues }: StepUsageProps) {
    const [usage, setUsage] = useState(defaultValues?.usagePurpose || "");

    const options = [
        { id: 'work', label: 'Work', icon: Briefcase, desc: 'Manage projects, teams, and clients' },
        { id: 'personal', label: 'Personal', icon: User, desc: 'Organize daily tasks and life goals' },
        { id: 'school', label: 'School', icon: GraduationCap, desc: 'Keep track of assignments and studies' },
    ];

    const handleNext = () => {
        // Optional step, pass data even if empty (or specific object)
        onNext({ usagePurpose: usage || undefined });
    };

    return (
        <div className="space-y-8">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold tracking-tight mb-2">How will you use Agentflox?</h2>
                <p className="text-gray-500">We'll adapt the experience to your needs.</p>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {options.map((opt) => (
                    <div
                        key={opt.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setUsage(opt.id)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setUsage(opt.id);
                            }
                        }}
                        className={`flex items-center p-4 rounded-xl border-2 transition-all cursor-pointer text-left group outline-none ${usage === opt.id
                            ? "border-black bg-gray-50 ring-1 ring-black/5"
                            : "border-gray-100 hover:border-gray-300 focus:border-black"
                            }`}
                    >
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 transition-colors ${usage === opt.id ? "bg-black text-white" : "bg-gray-100 text-gray-500 group-hover:bg-gray-200"
                            }`}>
                            <opt.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className={`font-semibold text-base ${usage === opt.id ? "text-black" : "text-gray-900"}`}>
                                {opt.label}
                            </h3>
                            <p className="text-sm text-gray-500">
                                {opt.desc}
                            </p>
                        </div>
                        <div className={`ml-auto w-5 h-5 rounded-full border flex items-center justify-center ${usage === opt.id ? "border-black bg-black" : "border-gray-300"
                            }`}>
                            {usage === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                        </div>
                    </div>
                ))}
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
