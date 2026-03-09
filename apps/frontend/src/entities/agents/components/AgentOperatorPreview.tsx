"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import type { AgentDraft, UserContext, ConversationState, ConversationStage } from '@/entities/agents/types';

interface AgentPreviewProps {
  agentDraft: AgentDraft | null;
  userContext: UserContext | null;
  conversationState: ConversationState | null;
  onPreviewChat?: () => void;
  onViewConfig?: () => void;
}

// Map conversation stages to build stages
const buildStages = [
  { id: 'intent_understanding', label: 'Understanding Intent', description: 'Analyzing your automation needs', progress: 10 },
  { id: 'role_objective', label: 'Defining Role', description: 'Establishing agent purpose and objectives', progress: 25 },
  { id: 'scope_definition', label: 'Setting Scope', description: 'Determining where the agent will operate', progress: 40 },
  { id: 'capacities_configuration', label: 'Configuring Capabilities', description: 'Setting up agent actions and tools', progress: 55 },
  { id: 'knowledge_configuration', label: 'Setting Knowledge', description: 'Configuring knowledge sources', progress: 70 },
  { id: 'tools_configuration', label: 'Configuring Tools', description: 'Fine-tuning tool parameters', progress: 80 },
  { id: 'rules_configuration', label: 'Setting Rules', description: 'Defining safety rules and constraints', progress: 85 },
  { id: 'trigger_configuration', label: 'Configuring Triggers', description: 'Setting up activation triggers', progress: 90 },
  { id: 'testing', label: 'Testing', description: 'Validating agent behavior', progress: 95 },
  { id: 'review', label: 'Review', description: 'Final review before launch', progress: 98 },
  { id: 'launch', label: 'Launch', description: 'Agent is ready!', progress: 100 },
];

export const AgentPreview: React.FC<AgentPreviewProps> = ({
  agentDraft,
  userContext,
  conversationState,
  onPreviewChat,
  onViewConfig,
}) => {
  // Determine current stage from conversationState
  const currentStageFromState = useMemo(() => {
    if (!conversationState) return 0;
    const stageIndex = buildStages.findIndex(s => s.id === conversationState.stage);
    return stageIndex >= 0 ? stageIndex : 0;
  }, [conversationState]);

  const [currentStageIndex, setCurrentStageIndex] = useState(currentStageFromState);
  const [isAnimating, setIsAnimating] = useState(true);

  // Update stage index when conversationState changes
  useEffect(() => {
    if (currentStageFromState !== null && currentStageFromState !== currentStageIndex) {
      setCurrentStageIndex(currentStageFromState);
    }
  }, [currentStageFromState]);

  const currentStage = buildStages[currentStageIndex] || buildStages[0];
  const isComplete = conversationState?.stage === 'launch' || currentStageIndex === buildStages.length - 1;

  // Determine which image to show based on progress
  const showGreenImage = currentStage.progress >= 50;

  return (
    <div className="h-full bg-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Main Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl border border-gray-200 shadow-lg overflow-hidden"
        >
          {/* Image Animation Container */}
          <div className="relative aspect-square bg-gray-50 flex items-center justify-center overflow-hidden">
            {/* Ambient Background Glow */}
            <div className={`absolute inset-0 ${
              showGreenImage 
                ? "bg-gradient-radial from-green-500/5 via-transparent to-transparent"
                : "bg-gradient-radial from-purple-500/5 via-transparent to-transparent"
            }`} />

            {/* Rotating Grid Pattern */}
            <motion.div
              className="absolute inset-0 opacity-5"
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 40,
                repeat: Infinity,
                ease: "linear",
              }}
              style={{
                backgroundImage: `radial-gradient(circle, rgba(148, 163, 184, 0.3) 1px, transparent 1px)`,
                backgroundSize: "30px 30px",
              }}
            />

            {/* Image Container */}
            <div className="relative w-4/5 h-4/5">
              <AnimatePresence mode="wait">
                {!showGreenImage ? (
                  <motion.div
                    key="purple"
                    initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src="/images/robot-5.png" // Purple wireframe
                        alt="AI Agent Building - Phase 1"
                        fill
                        className="object-contain filter drop-shadow-2xl"
                        style={{
                          filter:
                            "drop-shadow(0 0 30px rgba(147, 51, 234, 0.3))",
                        }}
                      />
                      {/* Scanning Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/10 to-transparent"
                        animate={{
                          y: ["-100%", "100%"],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </motion.div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="green"
                    initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                    transition={{ duration: 0.8, ease: "easeInOut" }}
                    className="absolute inset-0 flex items-center justify-center"
                  >
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                      }}
                      transition={{
                        duration: 3,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="relative w-full h-full"
                    >
                      <Image
                        src="/images/robot-6.png" // Green wireframe
                        alt="AI Agent Building - Phase 2"
                        fill
                        className="object-contain filter drop-shadow-2xl"
                        style={{
                          filter: "drop-shadow(0 0 30px rgba(34, 197, 94, 0.3))",
                        }}
                      />
                      {/* Scanning Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-green-500/10 to-transparent"
                        animate={{
                          y: ["-100%", "100%"],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                      />
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Particle Effects */}
              {isAnimating && (
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(8)].map((_, i) => (
                    <motion.div
                      key={i}
                      className={`absolute w-1 h-1 rounded-full ${
                        showGreenImage ? "bg-green-400" : "bg-purple-400"
                      }`}
                      initial={{
                        x: "50%",
                        y: "50%",
                        opacity: 0,
                      }}
                      animate={{
                        x: `${50 + Math.cos((i / 8) * Math.PI * 2) * 50}%`,
                        y: `${50 + Math.sin((i / 8) * Math.PI * 2) * 50}%`,
                        opacity: [0, 1, 0],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.2,
                        ease: "easeOut",
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Corner Accents */}
            <div className="absolute top-4 left-4 w-12 h-12 border-t-2 border-l-2 border-gray-300 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-gray-300 rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-12 h-12 border-b-2 border-l-2 border-gray-300 rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-12 h-12 border-b-2 border-r-2 border-gray-300 rounded-br-lg" />
          </div>

          {/* Stage Information */}
          <div className="px-8 py-6 border-b border-gray-200">
            <motion.div
              key={currentStage.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="relative">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      showGreenImage ? "bg-green-500" : "bg-purple-500"
                    }`}
                  />
                  {isAnimating && !isComplete && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${
                        showGreenImage ? "bg-green-500" : "bg-purple-500"
                      }`}
                      animate={{
                        scale: [1, 2, 2],
                        opacity: [0.5, 0, 0],
                      }}
                      transition={{
                        duration: 1.5,
                        repeat: Infinity,
                      }}
                    />
                  )}
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {currentStage.label}
                </h3>
              </div>
              <p className="text-gray-600 text-sm ml-6">
                {currentStage.description}
              </p>
            </motion.div>
          </div>

          {/* Action Footer */}
          <div className="px-8 pb-8">
            <div className="relative overflow-hidden">
              {/* Animated Background Gradient */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: isComplete
                    ? [
                        "linear-gradient(90deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
                        "linear-gradient(90deg, rgba(16, 185, 129, 0.1) 0%, rgba(34, 197, 94, 0.1) 100%)",
                      ]
                    : [
                        "linear-gradient(90deg, rgba(147, 51, 234, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)",
                        "linear-gradient(90deg, rgba(168, 85, 247, 0.05) 0%, rgba(147, 51, 234, 0.05) 100%)",
                      ],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  repeatType: "reverse",
                }}
              />

              <div className="relative py-6">
                {isComplete ? (
                  /* Success State - Agent Live */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="relative overflow-hidden"
                  >
                    <div className="relative bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl p-[1px]">
                      {/* Animated shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          repeatType: "loop",
                          ease: "linear",
                        }}
                      />
                      
                      <div className="relative bg-white rounded-xl p-4">
                        <div className="flex items-center justify-center gap-3">
                          {/* Pulsing success icon */}
                          <div className="relative">
                            <motion.div
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg"
                              animate={{
                                scale: [1, 1.1, 1],
                              }}
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                              }}
                            >
                              <svg
                                className="w-4 h-4 text-white"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={3}
                                  d="M5 13l4 4L19 7"
                                />
                              </svg>
                            </motion.div>
                            
                            {/* Ripple effect */}
                            <motion.div
                              className="absolute inset-0 rounded-full bg-green-400"
                              animate={{
                                scale: [1, 2],
                                opacity: [0.5, 0],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                              }}
                            />
                          </div>
                          
                          <span className="text-base font-semibold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">
                            Agent is Live
                          </span>
                          
                          {/* Live dot indicator */}
                          <div className="flex items-center gap-1.5">
                            <motion.div
                              className="w-2 h-2 rounded-full bg-green-500"
                              animate={{
                                scale: [1, 1.3, 1],
                                opacity: [1, 0.7, 1],
                              }}
                              transition={{
                                duration: 1.5,
                                repeat: Infinity,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  /* Building State */
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="relative bg-gradient-to-r from-gray-100 to-gray-50 border border-gray-200 rounded-xl p-4 overflow-hidden">
                      {/* Animated progress shine */}
                      <motion.div
                        className={`absolute inset-0 bg-gradient-to-r from-transparent ${
                          showGreenImage 
                            ? "via-green-100/40" 
                            : "via-purple-100/40"
                        } to-transparent`}
                        animate={{
                          x: ["-100%", "200%"],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          repeatType: "loop",
                          ease: "linear",
                        }}
                      />
                      
                      <div className="relative flex items-center justify-center gap-3">
                        {/* Building spinner */}
                        <div className="relative w-7 h-7">
                          <motion.div
                            className="absolute inset-0"
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                          >
                            <svg className="w-full h-full" viewBox="0 0 40 40">
                              <circle
                                cx="20"
                                cy="20"
                                r="16"
                                fill="none"
                                stroke="url(#buildGradient)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeDasharray="80 20"
                              />
                              <defs>
                                <linearGradient id="buildGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                  <stop offset="0%" stopColor={showGreenImage ? "#22c55e" : "#9333ea"} />
                                  <stop offset="100%" stopColor={showGreenImage ? "#10b981" : "#a855f7"} />
                                </linearGradient>
                              </defs>
                            </svg>
                          </motion.div>
                        </div>
                        
                        <span className="text-base font-medium text-gray-700">
                          Building Agent
                        </span>
                        
                        {/* Animated dots */}
                        <motion.span
                          className="text-gray-400"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            duration: 1.5,
                            repeat: Infinity,
                          }}
                        >
                          •••
                        </motion.span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
