"use client";
import React from "react";
import StepProfile from "./StepProfile";
import StepUsage from "./StepUsage";
import StepManage from "./StepManage";
import StepSource from "./StepSource";
import StepFinish from "./StepFinish";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { User, Briefcase, Rocket, LayoutGrid, Search } from "lucide-react";
import { useState, useEffect } from "react";

interface StepSwitcherProps {
  step: number;
  onStepChange: (step: number) => void;
  initialData?: any;
}

export default function StepSwitcher({ step, onStepChange, initialData }: StepSwitcherProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState(initialData || {});
  const { update: updateSession } = useSession();
  const update = trpc.onboarding.update.useMutation();

  // Sync initial data when it loads
  useEffect(() => {
    if (initialData) {
      setFormData((prev: any) => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const steps = [
    { component: StepProfile, label: "Profile", icon: User },
    { component: StepUsage, label: "Usage", icon: Briefcase },
    { component: StepManage, label: "Manage", icon: LayoutGrid },
    { component: StepSource, label: "Source", icon: Search },
    { component: StepFinish, label: "Ready", icon: Rocket },
  ];

  const CurrentComponent = steps[step].component;

  const handleNext = async (data?: any) => {
    setIsLoading(true);

    // Merge new data into local state
    const nextFormData = { ...formData, ...data };
    setFormData(nextFormData);

    // Check if we are at the last step
    if (step === steps.length - 1) {
      await update.mutateAsync({ completed: true, step: steps.length });
      await updateSession({ onboardingCompleted: true });
      window.location.href = "/";
      return;
    }

    // Save partial data if provided (autosave) or just update step
    if (data) {
      await update.mutateAsync({ ...data, step: step + 1 });
    } else {
      await update.mutateAsync({ step: step + 1 });
    }

    onStepChange(step + 1);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-black font-sans selection:bg-black selection:text-white flex flex-col">
      {/* Header / Progress */}
      <div className="w-full max-w-4xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center text-lg">X</div>
            Agentflox
          </div>
          <div className="text-sm font-medium text-gray-400">
            Step {step + 1} of {steps.length}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden mb-12">
          <motion.div
            className="h-full bg-black"
            initial={{ width: 0 }}
            animate={{ width: `${((step + 1) / steps.length) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex flex-col items-center justify-start px-4">
        <div className="w-full max-w-2xl">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl p-8 md:p-12"
            >
              <CurrentComponent
                onNext={handleNext}
                onBack={() => onStepChange(step - 1)}
                isFirstStep={step === 0}
                isLoading={isLoading}
                defaultValues={formData}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
