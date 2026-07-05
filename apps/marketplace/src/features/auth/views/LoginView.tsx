"use client";
import React, { useState, useCallback } from "react";
import NextImage from "next/image";
import { Mail, ArrowRight, Github, Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthMessage, MessageType } from "../components/AuthMessage";
import { SignInWithGoogle, SignInWithCredentials, SignInWithMagicLink } from "@/services/auth.service";
import { AuthContainer } from "../components/AuthContainer";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { AUTH_MESSAGES, getUserFriendlyMessage } from "../constants/authMessages";
import { validateCallbackUrl } from "../helpers/authHelpers";

export const LoginView = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams?.get('callbackUrl');
  const callbackUrl = validateCallbackUrl(rawCallbackUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magicEmail, setMagicEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<MessageType>("error");
  const [showPassword, setShowPassword] = useState(false);
  const [loginMethod, setLoginMethod] = useState<"password" | "magiclink">("password");

  // Enterprise Styling
  const inputClass = "h-12 bg-white border-gray-300 focus:border-black focus:ring-1 focus:ring-black placeholder:text-gray-400 transition-all rounded-lg text-base";
  const labelClass = "text-sm font-medium text-gray-700 mb-2 block";

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  const handleCredentials = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setMessage("");

      try {
        const result = await SignInWithCredentials(email, password, callbackUrl);
        if (result.success) {
          setMessageType("success");
          setMessage(AUTH_MESSAGES.SUCCESS.LOGIN);
          // FORCE HARD NAVIGATE to fix session latency
          setTimeout(() => {
            window.location.href = callbackUrl;
          }, 500);
        } else {
          setMessageType("error");
          setMessage(getUserFriendlyMessage(result.error?.code));
          setLoading(false);
        }
      } catch (error: any) {
        setMessageType("error");
        setMessage(AUTH_MESSAGES.ERROR.INVALID_CREDENTIALS);
        setLoading(false);
      }
    },
    [email, password, callbackUrl]
  );

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      await SignInWithGoogle(callbackUrl);
      // Google redirects automatically
    } catch (error: any) {
      setMessageType("error");
      setMessage(AUTH_MESSAGES.ERROR.GOOGLE_CONNECT_FAILED);
      setLoading(false);
    }
  }, [callbackUrl]);

  const handleMagic = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setLoading(true);
      setMessage("");
      try {
        const result = await SignInWithMagicLink(magicEmail, callbackUrl);
        if (result?.success) {
          setMessageType("success");
          setMessage(AUTH_MESSAGES.SUCCESS.MAGIC_LINK_SENT);
          // Force hard navigate to ensure cookies are set
          // Preserve callbackUrl so user returns to invitation page after clicking magic link
          setTimeout(() => {
            const verifyUrl = `/auth/verify-request?type=magiclink&email=${encodeURIComponent(magicEmail)}`;
            const urlWithCallback = callbackUrl !== '/'
              ? `${verifyUrl}&callbackUrl=${encodeURIComponent(callbackUrl)}`
              : verifyUrl;
            window.location.href = urlWithCallback;
          }, 500);
        } else {
          setMessageType("error");
          setMessage(AUTH_MESSAGES.ERROR.MAGIC_LINK_FAILED);
        }
      } catch (error: any) {
        setMessageType("error");
        setMessage(AUTH_MESSAGES.ERROR.GENERIC);
      }
      setLoading(false);
    },
    [magicEmail, callbackUrl]
  );

  return (
    <AuthContainer
      title="Welcome to Agentflox"
      subtitle={
        <span className="flex items-center gap-1">
          New to Agentflox?
          <Link href="/register" className="font-medium text-black hover:underline transition-all">
            Create an account
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
            Or continue with
          </span>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex p-1.5 bg-gray-50 rounded-xl mb-5 border border-gray-100">
        <button
          onClick={() => setLoginMethod("password")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${loginMethod === "password" ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-black border border-gray-100" : "text-gray-500 hover:text-gray-900"
            }`}
        >
          Password
        </button>
        <button
          onClick={() => setLoginMethod("magiclink")}
          className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all duration-200 ${loginMethod === "magiclink" ? "bg-white shadow-[0_2px_10px_rgba(0,0,0,0.03)] text-black border border-gray-100" : "text-gray-500 hover:text-gray-900"
            }`}
        >
          Magic Link
        </button>
      </div>

      <AnimatePresence mode="wait">
        {loginMethod === "password" ? (
          <motion.form
            key="password"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleCredentials}
            className="space-y-4"
          >
            <div>
              <Label className={labelClass} htmlFor="email">Email</Label>
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
              <div className="flex justify-between items-center">
                <Label className="text-sm font-medium text-gray-700" htmlFor="password">Password</Label>
                <Link href="/forgot-password" className="text-xs text-gray-500 hover:text-black hover:underline">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className={`${inputClass} pr-10`}
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
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base mt-3"
            >
              {loading ? "Signing in..." : "Sign in"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </motion.form>
        ) : (
          <motion.form
            key="magic"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
            onSubmit={handleMagic}
            className="space-y-4"
          >
            <div>
              <Label className={labelClass} htmlFor="magic">Email Address</Label>
              <Input
                id="magic"
                type="email"
                value={magicEmail}
                onChange={(e) => setMagicEmail(e.target.value)}
                required
                className={inputClass}
                placeholder="name@example.com"
              />
              <p className="mt-2 text-xs text-gray-500">
                We'll send you a magic link for a password-free sign in.
              </p>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-black hover:bg-zinc-800 text-white font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base mt-4"
            >
              {loading ? "Sending..." : "Send Magic Link"}
              {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
            </Button>
          </motion.form>
        )}
      </AnimatePresence>
    </AuthContainer>
  );
};
