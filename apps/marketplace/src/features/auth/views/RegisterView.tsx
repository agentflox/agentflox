"use client";
import React, { useState, useCallback } from "react";
import NextImage from "next/image";
import { ArrowRight, Check, X, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthMessage, MessageType } from "../components/AuthMessage";
import { SignInWithGoogle, RegisterUser } from "@/services/auth.service";
import { AuthContainer } from "../components/AuthContainer";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { AUTH_MESSAGES, getUserFriendlyMessage } from "../constants/authMessages";

export const RegisterView = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("error");
  const [showPassword, setShowPassword] = useState(false);
  const [touchedPassword, setTouchedPassword] = useState(false);

  // Validation States
  const validations = {
    hasMinLength: password.length >= 8,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  };

  const isPasswordValid = Object.values(validations).every(Boolean);

  const inputClass = "h-12 bg-white border-gray-300 focus:border-black focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-all rounded-lg text-base";
  const labelClass = "text-sm font-medium text-gray-700 mb-2 block";

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  const handleRegister = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setTouchedPassword(true);

      if (!isPasswordValid) {
        setMessageType("warning");
        setMessage(AUTH_MESSAGES.WARNING.WEAK_PASSWORD);
        return;
      }

      setLoading(true);
      setMessage("");

      try {
        const result = await RegisterUser(email, password);

        if (result.success) {
          setMessageType("success");
          setMessage(AUTH_MESSAGES.SUCCESS.REGISTER);
          // Force hard navigate to ensure cookies are set
          setTimeout(() => {
            window.location.href = `/auth/verify-request?type=register&email=${encodeURIComponent(email)}`;
          }, 500);
        } else {
          setMessageType("error");
          setMessage(getUserFriendlyMessage(result.error?.code, AUTH_MESSAGES.ERROR.REGISTRATION_FAILED));
          setLoading(false);
        }
      } catch (error: any) {
        setMessageType("error");
        setMessage(getUserFriendlyMessage(error.message, AUTH_MESSAGES.ERROR.REGISTRATION_FAILED));
        setLoading(false);
      }
    },
    [email, password, isPasswordValid]
  );

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      await SignInWithGoogle();
    } catch (error: any) {
      setMessageType("error");
      setMessage(AUTH_MESSAGES.ERROR.GOOGLE_CONNECT_FAILED);
      setLoading(false);
    }
  }, []);

  return (
    <AuthContainer
      title="Create your account"
      subtitle={
        <span className="flex items-center gap-1">
          Already have an account?
          <Link href="/login" className="font-medium text-black hover:underline transition-all">
            Log in
          </Link>
        </span> as any
      }
    >

      <AuthMessage message={message} type={messageType} onDismiss={clearMessage} />

      <div className="space-y-4 mb-5">
        <Button
          variant="outline"
          onClick={handleGoogle}
          disabled={loading}
          className="w-full h-12 justify-center px-4 bg-white text-gray-700 font-medium hover:bg-gray-50 border border-gray-200 shadow-sm transition-all"
        >
          <NextImage
            src="/images/google-logo.png"
            alt="Google"
            width={20}
            height={20}
            className="mr-3"
          />
          <span className="text-base">Continue with Google</span>
        </Button>
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-200" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-xs font-semibold text-gray-500 uppercase tracking-widest">
            Or register with
          </span>
        </div>
      </div>

      <form onSubmit={handleRegister} className="space-y-5">
        <div>
          <Label htmlFor="email" className={labelClass}>
            Email
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
        <div>
          <Label htmlFor="password" className={labelClass}>
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (!touchedPassword) setTouchedPassword(true);
              }}
              required
              className={`${inputClass} pr-10 ${touchedPassword && !isPasswordValid ? 'border-red-300 focus:border-red-300 focus:ring-red-200' : ''}`}
              placeholder="Create a strong password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5" />
              ) : (
                <Eye className="h-5 w-5" />
              )}
            </button>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-2">
          <div className="h-5 flex items-center">
            <input
              type="checkbox"
              id="terms"
              required
              className="h-4 w-4 text-black border-gray-300 rounded focus:ring-black"
            />
          </div>
          <Label
            htmlFor="terms"
            className="text-gray-500 font-normal text-sm leading-tight normal-case"
          >
            I agree to the <Link href="/terms" className="text-gray-900 underline">Terms of Service</Link> and <Link href="/privacy" className="text-gray-900 underline">Privacy Policy</Link>.
          </Label>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-black hover:bg-gray-800 text-white font-medium rounded-md transition-all mt-3"
        >
          {loading ? "Creating account..." : "Create Account"}
          {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
        </Button>
      </form>
    </AuthContainer>
  );
};
