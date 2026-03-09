"use client";
import React, { useState, useCallback, useMemo } from "react";
import { ArrowRight, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthMessage } from "../components/AuthMessage";
import { ConfirmPasswordReset } from "@/services/auth.service";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AUTH_MESSAGES, getUserFriendlyMessage } from "../constants/authMessages";
import { MessageType } from "../components/AuthMessage";
import { AuthContainer } from "../components/AuthContainer";

function passwordStrength(pw: string) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  return score;
}

export const ResetPasswordView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("error");

  // Enterprise Styling
  const inputClass = "h-12 bg-white border-gray-300 focus:border-black focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-all rounded-lg text-base";
  const labelClass = "text-sm font-medium text-gray-700 mb-2 block";

  const strength = useMemo(() => passwordStrength(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirm;

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!token) {
        setMessageType("error");
        setMessage(AUTH_MESSAGES.ERROR.INVALID_TOKEN);
        return;
      }

      if (!passwordsMatch) {
        setMessageType("error");
        setMessage(AUTH_MESSAGES.ERROR.PASSWORDS_NOT_MATCH);
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const result = await ConfirmPasswordReset(token, password);

        if (result.success) {
          setMessageType("success");
          setMessage(AUTH_MESSAGES.SUCCESS.PASSWORD_RESET_SUCCESS);
          setTimeout(() => window.location.href = "/login", 1500);
        } else {
          setMessageType("error");
          setMessage(getUserFriendlyMessage(result.error?.code, AUTH_MESSAGES.ERROR.PASSWORD_RESET_FAILED));
          setLoading(false);
        }
      } catch (error: any) {
        setMessageType("error");
        setMessage(AUTH_MESSAGES.ERROR.PASSWORD_RESET_FAILED);
        setLoading(false);
      }
    },
    [token, password, passwordsMatch]
  );

  return (
    <AuthContainer
      title="Set new password"
      subtitle="Your new password must be different from previous used passwords."
    >
      <AuthMessage message={message} type={messageType} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label htmlFor="password" className={labelClass}>New Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className={inputClass}
            placeholder="••••••••"
          />
          <div className="mt-2 flex gap-1.5 h-1">
            {[1, 2, 3].map((level) => (
              <div
                key={level}
                className={`flex-1 rounded-full transition-all duration-300 ${password.length === 0
                  ? "bg-gray-100"
                  : level <= strength
                    ? (strength === 3 ? "bg-green-500" : strength === 2 ? "bg-amber-400" : "bg-red-400")
                    : "bg-gray-100"
                  }`}
              />
            ))}
          </div>
          {password.length > 0 && (
            <p className="text-xs text-gray-500 mt-1.5 text-right">
              {strength === 3 ? "Strong" : strength === 2 ? "Medium" : "Weak"}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="confirm" className={labelClass}>Confirm Password</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className={inputClass}
            placeholder="••••••••"
          />
          {confirm.length > 0 && (
            <div className={`mt-2 text-xs flex items-center gap-1.5 font-medium transition-colors ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
              {passwordsMatch ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
              {passwordsMatch ? "Passwords match" : "Passwords do not match"}
            </div>
          )}
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base mt-2"
        >
          {loading ? "Updating..." : "Reset Password"}
          {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      </form>
    </AuthContainer>
  );
};

export default ResetPasswordView;
