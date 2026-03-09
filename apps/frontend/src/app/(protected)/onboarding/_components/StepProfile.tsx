import React, { useState, useEffect } from 'react';

interface StepProfileProps {
  onNext: (data: any) => void;
  onBack: () => void;
  isLoading: boolean;
  defaultValues?: any;
}

export default function StepProfile({ onNext, onBack, isLoading, defaultValues }: StepProfileProps) {
  const [name, setName] = useState(defaultValues?.name || "");
  const [role, setRole] = useState(defaultValues?.role || "");
  const [customRole, setCustomRole] = useState("");

  const roles = [
    'Founder', 'Executive', 'Product Manager', 'Designer',
    'Software Engineer', 'Marketing', 'Sales', 'HR & Ops',
    'Student', 'Freelancer', 'Other'
  ];

  // Initialize state from defaultValues (handling custom roles if revisited)
  useEffect(() => {
    if (defaultValues?.role) {
      if (roles.includes(defaultValues.role)) {
        setRole(defaultValues.role);
      } else {
        setRole('Other');
        setCustomRole(defaultValues.role);
      }
    }
    if (defaultValues?.name) setName(defaultValues.name);
  }, [defaultValues]);


  const inputClass = "w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-lg focus:bg-white focus:ring-1 focus:ring-black focus:border-black transition-all outline-none";
  const labelClass = "text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block";

  const handleNext = () => {
    // Role is optional now
    let finalRole = role;
    if (role === 'Other') {
      finalRole = customRole;
    }

    // Only save if name is present
    if (name) {
      onNext({ name, role: finalRole || undefined });
    }
  };

  const isValid = name.trim().length > 0;

  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold tracking-tight mb-2">Tell us about yourself</h2>
        <p className="text-gray-500">helps us customize your experience.</p>
      </div>

      <div className="space-y-5">
        <div>
          <label className={labelClass}>What should we call you? <span className="text-red-500">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
            placeholder="Your full name"
            autoFocus
          />
        </div>

        <div>
          <label className={labelClass}>What is your role? (Optional)</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-2">
            {roles.map(r => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`py-2.5 px-3 rounded-lg text-xs sm:text-sm font-medium border transition-all truncate ${role === r
                  ? "border-black bg-black text-white shadow-md ring-1 ring-black"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                  }`}
              >
                {r}
              </button>
            ))}
          </div>
          {role === 'Other' && (
            <div className="mt-3">
              <input
                value={customRole}
                onChange={(e) => setCustomRole(e.target.value)}
                className={inputClass}
                placeholder="Type your role..."
                autoFocus
              />
            </div>
          )}
        </div>
      </div>

      {isValid && (
        <div className="flex items-center justify-between mt-8 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <button
            onClick={onBack}
            className="text-sm font-medium text-gray-500 hover:text-black transition-colors opacity-0 pointer-events-none"
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
      )}
    </div>
  );
}
