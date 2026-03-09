import React from 'react';
import { Check } from 'lucide-react';

interface StepFinishProps {
  onNext: () => void;
  isLoading: boolean;
}

export default function StepFinish({ onNext, isLoading }: StepFinishProps) {
  return (
    <div className="text-center py-8">
      <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
        <Check className="w-10 h-10" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">
        You're all set!
      </h2>
      <p className="text-lg text-gray-500 max-w-sm mx-auto mb-8">
        We've customized your workspace. You're ready to start building your next big idea.
      </p>

      <button
        onClick={onNext}
        disabled={isLoading}
        className="bg-black hover:bg-gray-800 text-white px-10 py-3.5 rounded-full font-medium text-base transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
      >
        {isLoading ? "Finalizing..." : "Go to Dashboard"}
      </button>
    </div>
  );
}
