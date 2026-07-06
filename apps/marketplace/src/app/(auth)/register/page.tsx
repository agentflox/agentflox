"use client";

import { RegisterView } from "@/features/auth/views/RegisterView";
import { AuthLayout } from "@/features/auth/components/AuthLayout";

export default function RegisterPage() {
  return (
    <AuthLayout>
      <RegisterView />
    </AuthLayout>
  );
}
