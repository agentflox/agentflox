"use client";
import React, { useState, useCallback } from "react";
import { ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthMessage } from "../components/AuthMessage";
import { RequestPasswordReset } from "@/services/auth.service";
import Link from "next/link";
import { AUTH_MESSAGES } from "../constants/authMessages";
import { MessageType } from "../components/AuthMessage";

export const RequestResetPasswordView = () => {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("success");

  const inputClass = "h-11 bg-gray-50 border-gray-200 focus:bg-white focus:ring-1 focus:ring-black focus:border-black transition-all rounded-md";
  const labelClass = "text-xs font-medium text-gray-500 uppercase tracking-wider mb-1.5 block";

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setMessage("");

      try {
        await RequestPasswordReset(email);
        setMessageType("success");
        setMessage(AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_REQUESTED);
        // Force hard navigate to ensure cookies are set
        setTimeout(() => {
          window.location.href = `/auth/verify-request?type=reset&email=${encodeURIComponent(email)}`;
        }, 500);
      } catch (error: any) {
        // Always show success message for security (don't reveal if email exists)
        setMessageType("success");
        setMessage(AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_REQUESTED);
      } finally {
        setLoading(false);
      }
    },
    [email]
  );

  return (
    <div className="w-full">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Reset password</h2>
        <p className="text-gray-500 mt-2 text-sm">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <AuthMessage message={message} type={messageType} />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="email" className={labelClass}>
            Email Address
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className={inputClass}
            placeholder="name@example.com"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-black hover:bg-gray-800 text-white font-medium rounded-md transition-all"
        >
          {loading ? "Sending link..." : "Send Reset Link"}
          {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>

        <div className="text-center mt-6">
          <Link href="/login" className="text-sm font-medium text-gray-500 hover:text-black transition-colors">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  );
};

export default RequestResetPasswordView;
