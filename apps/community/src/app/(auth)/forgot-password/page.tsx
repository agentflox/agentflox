"use client";

import { RequestResetPasswordView } from "@/features/auth/views/RequestResetPasswordView";
import { AuthLayout } from "@/features/auth/components/AuthLayout";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <RequestResetPasswordView />
    </AuthLayout>
  );
}
