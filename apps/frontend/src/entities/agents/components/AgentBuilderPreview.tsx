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
  { id: 'initialization', label: 'Initialization', description: 'Setting up agent context', progress: 10 },
  { id: 'configuration', label: 'Configuration', description: 'Collecting agent details and settings', progress: 50 },
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
  const showBlueImage = currentStage.progress >= 50;

  return (
    <div className="h-full bg-white flex items-center justify-center p-6 max-h-screen overflow-hidden">
      <div className="w-full max-w-xl">
        {/* Main Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white overflow-hidden"
        >
          {/* Progress Bar - Moved to Top */}
          <div className="px-8 pt-8 pb-6 border-b border-gray-200">
            <div className="space-y-3">
              {/* Percentage and Stage Counter */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">
                  Stage {currentStageIndex + 1} of {buildStages.length}
                </span>
                {isComplete && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-full px-4 py-1.5"
                  >
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-600">
                      Complete
                    </span>
                  </motion.div>
                )}
              </div>

              {/* Progress Bar Container */}
              <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden">
                {/* Background Shimmer */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/20 to-transparent"
                  animate={{
                    x: ["-100%", "200%"],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                />

                {/* Progress Fill */}
                <motion.div
                  className={`absolute inset-y-0 left-0 rounded-full ${showBlueImage
                    ? "bg-gradient-to-r from-blue-600 to-blue-400"
                    : "bg-gradient-to-r from-pink-600 to-pink-400"
                    }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${currentStage.progress}%` }}
                  transition={{
                    duration: 0.8,
                    ease: "easeInOut",
                  }}
                >
                  {/* Glow Effect */}
                  <motion.div
                    className={`absolute inset-0 ${showBlueImage
                      ? "bg-blue-400/50"
                      : "bg-pink-400/50"
                      } blur-md`}
                    animate={{
                      opacity: [0.5, 0.8, 0.5],
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                    }}
                  />
                </motion.div>

                {/* Progress Head Indicator */}
                {isAnimating && currentStage.progress < 100 && (
                  <motion.div
                    className={`absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full ${showBlueImage ? "bg-blue-400" : "bg-pink-400"
                      } shadow-lg`}
                    animate={{
                      left: `${currentStage.progress}%`,
                      x: "-50%",
                    }}
                    transition={{
                      duration: 0.8,
                      ease: "easeInOut",
                    }}
                  >
                    <motion.div
                      className={`absolute inset-0 rounded-full ${showBlueImage ? "bg-blue-400" : "bg-pink-400"
                        }`}
                      animate={{
                        scale: [1, 1.5, 1],
                        opacity: [1, 0, 0],
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                      }}
                    />
                  </motion.div>
                )}
              </div>

              {/* Stage Pills */}
              <div className="flex gap-1.5 pt-2">
                {buildStages.map((stage, index) => (
                  <motion.div
                    key={stage.id}
                    className={`flex-1 h-1 rounded-full transition-colors duration-300 ${index <= currentStageIndex
                      ? showBlueImage && index >= 2
                        ? "bg-blue-500"
                        : "bg-pink-500"
                      : "bg-gray-300"
                      }`}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ delay: index * 0.1 }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Image Animation Container */}
          <div className="relative w-full bg-gray-50 flex items-center justify-center overflow-hidden h-72">
            {/* Ambient Background Glow */}
            <div className="absolute inset-0 bg-gradient-radial from-blue-500/5 via-transparent to-transparent" />

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
            <div className="relative w-3/5 h-3/5">
              <AnimatePresence mode="wait">
                {!showBlueImage ? (
                  <motion.div
                    key="pink"
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
                        src="/images/robot-3.png" // Pink wireframe
                        alt="AI Agent Building - Phase 1"
                        fill
                        className="object-contain filter drop-shadow-2xl"
                        style={{
                          filter:
                            "drop-shadow(0 0 30px rgba(236, 72, 153, 0.3))",
                        }}
                      />
                      {/* Scanning Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-pink-500/10 to-transparent"
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
                    key="blue"
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
                        src="/images/robot-4.png" // Blue wireframe
                        alt="AI Agent Building - Phase 2"
                        fill
                        className="object-contain filter drop-shadow-2xl"
                        style={{
                          filter: "drop-shadow(0 0 30px rgba(59, 130, 246, 0.3))",
                        }}
                      />
                      {/* Scanning Effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent"
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
                      className={`absolute w-1 h-1 rounded-full ${showBlueImage ? "bg-blue-400" : "bg-pink-400"
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
                    className={`w-3 h-3 rounded-full ${showBlueImage ? "bg-blue-500" : "bg-pink-500"
                      }`}
                  />
                  {isAnimating && !isComplete && (
                    <motion.div
                      className={`absolute inset-0 rounded-full ${showBlueImage ? "bg-blue-500" : "bg-pink-500"
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

          {/* Action Button */}
          <div className="px-8 pb-8">
            {/* Simplified Enhanced Action Footer - Replace the existing action button section */}
            <div className="relative overflow-hidden">
              {/* Animated Background Gradient */}
              <motion.div
                className="absolute inset-0 opacity-30"
                animate={{
                  background: isComplete
                    ? [
                      "linear-gradient(90deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 51, 234, 0.1) 100%)",
                      "linear-gradient(90deg, rgba(147, 51, 234, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)",
                    ]
                    : [
                      "linear-gradient(90deg, rgba(236, 72, 153, 0.05) 0%, rgba(59, 130, 246, 0.05) 100%)",
                      "linear-gradient(90deg, rgba(59, 130, 246, 0.05) 0%, rgba(236, 72, 153, 0.05) 100%)",
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
                    <div className="relative bg-gradient-to-r from-emerald-500 to-blue-500 rounded-xl p-[1px]">
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
                              className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-lg"
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
                              className="absolute inset-0 rounded-full bg-emerald-400"
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

                          <span className="text-base font-semibold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent">
                            Agent is Live
                          </span>

                          {/* Live dot indicator */}
                          <div className="flex items-center gap-1.5">
                            <motion.div
                              className="w-2 h-2 rounded-full bg-emerald-500"
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
                        className={`absolute inset-0 bg-gradient-to-r from-transparent ${showBlueImage
                          ? "via-blue-100/40"
                          : "via-pink-100/40"
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
                                  <stop offset="0%" stopColor={showBlueImage ? "#3b82f6" : "#ec4899"} />
                                  <stop offset="100%" stopColor={showBlueImage ? "#8b5cf6" : "#f97316"} />
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
