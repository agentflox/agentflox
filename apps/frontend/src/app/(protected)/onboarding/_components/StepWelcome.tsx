import React from 'react';

interface StepWelcomeProps {
  onNext: () => void;
  isLoading: boolean;
}

export default function StepWelcome({ onNext, isLoading }: StepWelcomeProps) {
  return (
    <div className="text-center">
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
        <span className="text-3xl">👋</span>
      </div>
      <h2 className="text-3xl md:text-4xl font-bold text-gray-900 tracking-tight mb-4">
        Welcome to Agentflox
      </h2>
      <p className="text-lg text-gray-500 leading-relaxed max-w-sm mx-auto mb-8">
        We're glad you're here. Let's spend a minute to set up your workspace so you can start building immediately.
      </p>

      <button
        onClick={onNext}
        disabled={isLoading}
        className="bg-black hover:bg-gray-800 text-white px-10 py-3.5 rounded-full font-medium text-base transition-all hover:scale-105 active:scale-95 shadow-lg disabled:opacity-50"
      >
        {isLoading ? "Starting..." : "Get Started"}
      </button>
    </div>
  );
}
