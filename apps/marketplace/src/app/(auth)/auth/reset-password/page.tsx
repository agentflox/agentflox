"use client";

import { ResetPasswordView } from "@/features/auth/views/ResetPasswordView";
import { AuthLayout } from "@/features/auth/components/AuthLayout";

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <ResetPasswordView />
    </AuthLayout>
  );
}
