"use client";
import React from "react";
import { Mail } from "lucide-react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import NextImage from "next/image";

export default function VerifyRequestPage() {
  const searchParams = useSearchParams();
  const type = searchParams.get("type");
  const email = searchParams.get("email");
  const callbackUrl = searchParams.get("callbackUrl");

  const isReset = type === "reset";
  const isMagicLink = type === "magiclink";

  const emailText = email ? <span className="font-medium text-gray-900">{email}</span> : "your email address";

  const title = isReset
    ? "Check your email"
    : isMagicLink
      ? "Check your email"
      : "Verify your email";

  const subtitle = isReset
    ? <>We sent a password reset link to {emailText}.<br />Click the link to choose a new password.</>
    : isMagicLink
      ? <>We sent a magic link to {emailText}.<br />Click the link to sign in.</>
      : <>We sent a verification link to {emailText}.<br />Click the link to activate your account.</>;

  // Preserve callbackUrl in back link
  const loginUrl = callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login';

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

          {/* Icon */}
          <div className="relative mb-6 group">
            <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-20 duration-1000"></div>
            <div className="relative w-20 h-20 bg-gradient-to-tr from-blue-50 to-indigo-50 text-blue-600 rounded-full flex items-center justify-center ring-8 ring-blue-50/50">
              <Mail className="w-9 h-9" strokeWidth={1.5} />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-gray-900 tracking-tight text-center mb-3">
            {title}
          </h1>

          <div className="text-center text-gray-500 text-[15px] leading-normal mb-8">
            {subtitle}
          </div>

          {/* Help Box */}
          <div className="w-full bg-gray-50/80 rounded-xl p-4 mb-8 border border-gray-100/60">
            <h3 className="font-medium text-xs uppercase tracking-wider text-gray-500 mb-2.5 text-center">
              Didn't receive it?
            </h3>
            <div className="text-[13px] text-gray-600 space-y-2 text-center">
              <p>Check your spam folder or wait a minute.</p>
              {/* Could add a resend button here in the future */}
            </div>
          </div>

          <Link href={loginUrl} className="w-full">
            <Button
              variant="outline"
              className="w-full h-11 border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 font-medium transition-all"
            >
              Back to Sign In
            </Button>
          </Link>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-400">
            &copy; {new Date().getFullYear()} Agentflox Inc.
          </p>
        </div>
      </div>
    </div>
  );
}
