"use client";
import React from "react";
import { AlertCircle, ArrowLeft, Home } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getUserFriendlyMessage, AUTH_MESSAGES } from "@/features/auth/constants/authMessages";

export default function AuthErrorPage() {
  const params = useSearchParams();
  const errorCode = params.get("error");

  // Get user-friendly message from error code
  const errorMessage = getUserFriendlyMessage(
    errorCode,
    AUTH_MESSAGES.ERROR.GENERIC
  );

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#FAFAFA] p-4 sm:p-8">
      {/* Logo */}
      <div className="mb-8">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">A</span>
          </div>
          <span className="font-bold text-xl tracking-tight">Agentflox</span>
        </Link>
      </div>

      <div className="w-full max-w-[400px] mx-auto">
        <div className="bg-white rounded-2xl shadow-[0_2px_15px_-3px_rgba(0,0,0,0.07),0_10px_20px_-2px_rgba(0,0,0,0.04)] border border-gray-100 p-8 sm:p-10 flex flex-col items-center">

          {/* Error Icon */}
          <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 ring-4 ring-red-50/50">
            <AlertCircle className="w-7 h-7" strokeWidth={2} />
          </div>

          <h1 className="text-xl font-bold text-gray-900 tracking-tight text-center mb-2">
            Authentication Error
          </h1>

          <p className="text-center text-gray-500 text-[15px] leading-relaxed mb-8">
            {errorMessage}
          </p>

          <div className="w-full space-y-3">
            <Link href="/login" className="w-full block">
              <Button
                className="w-full h-11 bg-black hover:bg-zinc-800 text-white font-medium transition-all shadow-sm"
              >
                <ArrowLeft className="mr-2 w-4 h-4" />
                Back to Sign In
              </Button>
            </Link>

            <Link href="/" className="w-full block">
              <Button
                variant="ghost"
                className="w-full h-11 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-all font-medium"
              >
                <Home className="mr-2 w-4 h-4" />
                Go to Home
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-8 text-center space-y-4">
          <p className="text-xs text-gray-400">
            Need help?{" "}
            <a href="mailto:support@agentflox.com" className="text-gray-500 hover:text-black underline transition-colors">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
