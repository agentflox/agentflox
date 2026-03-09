import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from "lucide-react";

export type MessageType = "error" | "success" | "info" | "warning";

interface AuthMessageProps {
  message: string;
  type?: MessageType;
  onDismiss?: () => void;
}

const getMessageConfig = (message: string, type?: MessageType) => {
  // Auto-detect type if not provided
  const detectedType = type || (
    message.toLowerCase().includes("success") ||
      message.toLowerCase().includes("sent") ||
      message.toLowerCase().includes("check your")
      ? "success"
      : message.toLowerCase().includes("info") || message.toLowerCase().includes("note")
        ? "info"
        : "error"
  );

  const configs = {
    error: {
      icon: AlertCircle,
      bgClass: "bg-red-50",
      borderClass: "border-red-200",
      textClass: "text-red-800",
      iconClass: "text-red-500",
      progressClass: "bg-red-400",
    },
    success: {
      icon: CheckCircle2,
      bgClass: "bg-emerald-50",
      borderClass: "border-emerald-200",
      textClass: "text-emerald-800",
      iconClass: "text-emerald-500",
      progressClass: "bg-emerald-400",
    },
    info: {
      icon: Info,
      bgClass: "bg-blue-50",
      borderClass: "border-blue-200",
      textClass: "text-blue-800",
      iconClass: "text-blue-500",
      progressClass: "bg-blue-400",
    },
    warning: {
      icon: AlertTriangle,
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200",
      textClass: "text-amber-800",
      iconClass: "text-amber-500",
      progressClass: "bg-amber-400",
    },
  };

  return { ...configs[detectedType], type: detectedType };
};

export const AuthMessage = ({ message, type, onDismiss }: AuthMessageProps) => {
  if (!message) return null;

  const config = getMessageConfig(message, type);
  const Icon = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.98 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className={`mb-5 p-4 rounded-xl border ${config.bgClass} ${config.borderClass} relative overflow-hidden shadow-sm`}
        role="alert"
      >
        <div className="flex items-start gap-3">
          <div className={`flex-shrink-0 ${config.iconClass}`}>
            <Icon className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${config.textClass} leading-relaxed`}>
              {message}
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className={`flex-shrink-0 p-1 rounded-lg hover:bg-black/5 transition-colors ${config.textClass} opacity-60 hover:opacity-100`}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Subtle animated progress indicator for success messages */}
        {config.type === "success" && (
          <motion.div
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 5, ease: "linear" }}
            className={`absolute bottom-0 left-0 h-0.5 ${config.progressClass} opacity-60`}
          />
        )}
      </motion.div>
    </AnimatePresence>
  );
};
