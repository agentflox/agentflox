"use client";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import StepSwitcher from "./_components/StepSwitcher";
import { useRouter } from "next/navigation"; // Remove useSearchParams usage

export default function OnboardingPage() {
  const { data, isLoading } = trpc.onboarding.get.useQuery(undefined, {
    refetchOnWindowFocus: false,
    retry: false
  });

  // Optimistic State - Default to 0, update only when data loads
  const [step, setStep] = useState<number>(0);

  useEffect(() => {
    if (data?.onboardingStep !== undefined) {
      setStep(data.onboardingStep);
    }
  }, [data]);

  // Remove URL syncing effect to prevent lag/jitter
  // Logic is now contained within React state + DB

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    // No layout wrapper needed here as step switcher handles full screen bg
    <StepSwitcher
      step={step}
      onStepChange={setStep}
      initialData={data}
    />
  );
}
