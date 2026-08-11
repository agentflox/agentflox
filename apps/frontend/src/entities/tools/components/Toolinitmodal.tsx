import { useEffect, useState } from "react";

const TOOL_CREATION_STEPS = [
  { 
    label: "Defining tool interface", 
    log: "Establishing semantic name and descriptive prompt..." 
  },
  { 
    label: "Configuring input schemas", 
    log: "Generating JSON Schema for parameter validation..." 
  },
  { 
    label: "Building execution handler", 
    log: "Writing deterministic business logic and external API calls..." 
  },
  { 
    label: "Implementing error boundaries", 
    log: "Adding fallbacks and formatting errors for LLM comprehension..." 
  },
  { 
    label: "Activating tool bindings", 
    log: "Injecting tool definition into the active LLM context..." 
  }
];

const STEP_MS = 2500;

type ToolInitMinimalProps = {
  open?: boolean;
};

export default function ToolInitMinimal({ open = true }: ToolInitMinimalProps) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setStepIndex(0);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => {
        // Stop advancing once we hit the last step, but keep spinning
        if (i < STEPS.length - 1) return i + 1;
        clearInterval(stepTimer);
        return i;
      });
    }, STEP_MS);

    return () => clearInterval(stepTimer);
  }, [open]);

  if (!open) return null;

  const currentStep = STEPS[stepIndex];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.7)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <style>{`
        @keyframes spin { 
          100% { transform: rotate(360deg); } 
        }
        @keyframes spin-reverse { 
          100% { transform: rotate(-360deg); } 
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.2; transform: scale(0.85); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
        @keyframes text-reveal { 
          0% { opacity: 0; transform: translateY(8px); filter: blur(4px); } 
          100% { opacity: 1; transform: translateY(0); filter: blur(0); } 
        }
      `}</style>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "36px",
        }}
      >
        {/* Enlarged, Multi-Ring Spinner */}
        <div
          style={{
            position: "relative",
            width: "72px",
            height: "72px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Ambient background glow */}
          <div
            style={{
              position: "absolute",
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: "conic-gradient(from 0deg, #6366F1, #2DD4BF, #6366F1)",
              filter: "blur(16px)",
              animation: "pulse-glow 3s ease-in-out infinite",
            }}
          />

          {/* Background Track */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid rgba(255, 255, 255, 0.03)",
            }}
          />

          {/* Outer Fast Ring (Indigo) */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              border: "3px solid transparent",
              borderTopColor: "#6366F1",
              borderRightColor: "rgba(99, 102, 241, 0.4)",
              animation: "spin 1.2s cubic-bezier(0.5, 0.1, 0.4, 0.9) infinite",
            }}
          />

          {/* Inner Slower Ring (Teal) */}
          <div
            style={{
              position: "absolute",
              inset: "8px",
              borderRadius: "50%",
              border: "3px solid transparent",
              borderBottomColor: "#2DD4BF",
              borderLeftColor: "rgba(45, 212, 191, 0.4)",
              animation: "spin-reverse 1.8s cubic-bezier(0.6, 0.2, 0.4, 0.8) infinite",
            }}
          />
        </div>

        {/* Animated Text Block */}
        <div
          key={stepIndex}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "10px",
            animation: "text-reveal 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 500,
              letterSpacing: "-0.01em",
              color: "#FAFAFA",
            }}
          >
            {currentStep.label}
          </h2>
          
          <p
            style={{
              margin: 0,
              fontFamily: "'Geist Mono', 'JetBrains Mono', monospace",
              fontSize: "14px",
              color: "#A1A1AA",
              letterSpacing: "0.02em",
            }}
          >
            {currentStep.log}
          </p>
        </div>
      </div>
    </div>
  );
}